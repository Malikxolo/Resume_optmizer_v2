"""
LaTeX pipeline — handles .tex compilation and plaintext extraction.

• compile_to_pdf()     — .tex → PDF via Tectonic subprocess
• extract_plaintext()  — .tex → plain prose (Pandoc, or Python fallback)
• parse_sections()     — plaintext → dict of resume sections
"""

from __future__ import annotations

import asyncio
import logging
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class CompileResult:
    success: bool
    pdf_bytes: bytes | None = None
    error: str = ""
    log: str = ""


async def compile_to_pdf(tex_content: str) -> CompileResult:
    """
    Compile LaTeX source to PDF using Tectonic.
    Returns CompileResult with pdf_bytes on success, error message on failure.
    """
    settings = get_settings()
    tectonic_path = settings.TECTONIC_PATH
    if not shutil.which(tectonic_path):
        if Path("/usr/local/bin/tectonic").exists():
            tectonic_path = "/usr/local/bin/tectonic"
        else:
            return CompileResult(
                success=False,
                error=f"Tectonic not found at '{tectonic_path}'. Install tectonic or set TECTONIC_PATH.",
            )

    with tempfile.TemporaryDirectory(prefix="resume_opt_") as tmpdir:
        tex_path = Path(tmpdir) / "resume.tex"
        pdf_path = Path(tmpdir) / "resume.pdf"

        tex_path.write_text(tex_content, encoding="utf-8")

        try:
            proc = await asyncio.create_subprocess_exec(
                tectonic_path,
                str(tex_path),
                "--outdir", tmpdir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
            log_text = (stdout or b"").decode() + "\n" + (stderr or b"").decode()

            if proc.returncode == 0 and pdf_path.exists():
                return CompileResult(
                    success=True,
                    pdf_bytes=pdf_path.read_bytes(),
                    log=log_text,
                )
            else:
                return CompileResult(
                    success=False,
                    error=log_text.strip() or f"Tectonic exited with code {proc.returncode}",
                    log=log_text,
                )

        except asyncio.TimeoutError:
            return CompileResult(success=False, error="Tectonic compilation timed out (60s)")
        except Exception as e:
            return CompileResult(success=False, error=str(e))


async def extract_plaintext(tex_content: str) -> str:
    """
    Extract readable plaintext from LaTeX source.
    Tries Pandoc first, falls back to a regex-based Python extractor.
    """
    settings = get_settings()

    # Try pandoc
    if shutil.which(settings.PANDOC_PATH):
        try:
            return await _pandoc_extract(tex_content, settings.PANDOC_PATH)
        except Exception as e:
            logger.warning("Pandoc extraction failed, using fallback: %s", e)

    # Fallback: Python regex-based extraction
    return _regex_extract(tex_content)


async def _pandoc_extract(tex_content: str, pandoc_path: str) -> str:
    """Use pandoc to convert LaTeX to plain text."""
    proc = await asyncio.create_subprocess_exec(
        pandoc_path,
        "-f", "latex",
        "-t", "plain",
        "--wrap=none",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(
        proc.communicate(input=tex_content.encode("utf-8")),
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Pandoc error: {stderr.decode()}")
    return stdout.decode("utf-8").strip()


def _regex_extract(tex_content: str) -> str:
    """
    Best-effort plaintext extraction from LaTeX using regex.
    Handles common resume template commands (Jake's, moderncv, etc.).
    """
    text = tex_content

    # Remove everything before \begin{document}
    doc_match = re.search(r"\\begin\{document\}", text)
    if doc_match:
        text = text[doc_match.end():]

    # Remove everything after \end{document}
    end_match = re.search(r"\\end\{document\}", text)
    if end_match:
        text = text[:end_match.start()]

    # Remove comments
    text = re.sub(r"%.*?$", "", text, flags=re.MULTILINE)

    # ── Phase 1: Remove complex environments ─────────────────────
    # Remove center environment tags
    text = re.sub(r"\\(?:begin|end)\{center\}", "", text)

    # Remove tabular / tabular* environments but keep text content
    def clean_tabular(match: re.Match) -> str:
        inner = match.group(1)
        # Remove column specs like {l@{\extracolsep{\fill}}r}
        inner = re.sub(r"@\{[^}]*\}", "", inner)
        # Remove \\ line breaks → newline
        inner = inner.replace("\\\\", "\n")
        # Remove & column separators → space
        inner = inner.replace("&", " | ")
        return inner

    text = re.sub(
        r"\\begin\{tabular\*?\}(?:\{[^}]*\})?\s*(?:\[[^\]]*\])?\s*\{[^}]*\}(.*?)\\end\{tabular\*?\}",
        clean_tabular,
        text,
        flags=re.DOTALL,
    )

    # Remove figure, table, tikzpicture environments entirely
    for env in ["figure", "table", "tikzpicture"]:
        text = re.sub(
            rf"\\begin\{{{env}\}}.*?\\end\{{{env}\}}",
            "",
            text,
            flags=re.DOTALL,
        )

    # ── Phase 2: Convert section headers ─────────────────────────
    text = re.sub(r"\\(?:section|subsection|subsubsection)\*?\{([^}]*)\}", r"\n\n\1\n", text)

    # ── Phase 3: Handle resume-specific custom commands ──────────
    # \resumeSubheading{Title}{Date}{Subtitle}{Location} → structured output
    def expand_subheading(match: re.Match) -> str:
        parts = re.findall(r"\{([^}]*)\}", match.group(0))
        if len(parts) >= 4:
            return f"\n{parts[0]} | {parts[1]}\n{parts[2]} | {parts[3]}\n"
        elif len(parts) >= 2:
            return f"\n{parts[0]} | {parts[1]}\n"
        return "\n" + " | ".join(parts) + "\n"

    text = re.sub(r"\\resumeSubheading\s*(\{[^}]*\}\s*){2,4}", expand_subheading, text)

    # \resumeProjectHeading{Title}{Date} → structured output
    def expand_project(match: re.Match) -> str:
        parts = re.findall(r"\{([^}]*)\}", match.group(0))
        if len(parts) >= 2:
            title = parts[0]
            date = parts[1] if parts[1].strip() else ""
            return f"\n{title}" + (f" | {date}" if date else "") + "\n"
        return "\n" + parts[0] + "\n" if parts else ""

    text = re.sub(r"\\resumeProjectHeading\s*(\{[^}]*\}\s*){1,2}", expand_project, text)

    # \resumeItem{content} → bullet point
    text = re.sub(r"\\resumeItem\{", "• ", text)

    # \resumeSubItem{content} → sub bullet
    text = re.sub(r"\\resumeSubItem\{", "  • ", text)

    # Remove custom list start/end commands
    for cmd in [
        "resumeSubHeadingListStart", "resumeSubHeadingListEnd",
        "resumeItemListStart", "resumeItemListEnd",
    ]:
        text = re.sub(rf"\\{cmd}\b", "", text)

    # ── Phase 4: Handle standard formatting commands ─────────────
    # \textbf{text}, \textit{text}, etc. → text
    for cmd in ["textbf", "textit", "underline", "emph", "textsf", "textsc", "texttt", "small", "footnotesize", "large", "Large", "LARGE", "huge", "Huge"]:
        text = re.sub(rf"\\{cmd}\{{([^}}]*)\}}", r"\1", text)

    # \scshape, \bfseries etc. (mode switches without braces)
    text = re.sub(r"\\(?:scshape|bfseries|itshape|mdseries|upshape|rmfamily|sffamily|ttfamily)\b", "", text)

    # \href{url}{text} → text
    text = re.sub(r"\\href\{[^}]*\}\{([^}]*)\}", r"\1", text)

    # \url{...} → the URL
    text = re.sub(r"\\url\{([^}]*)\}", r"\1", text)

    # ── Phase 5: Handle itemize/enumerate ────────────────────────
    # Remove \begin{itemize}[options] and \end{itemize}
    text = re.sub(r"\\begin\{(?:itemize|enumerate)\}(?:\[[^\]]*\])?\s*", "", text)
    text = re.sub(r"\\end\{(?:itemize|enumerate)\}\s*", "", text)

    # \item → bullet
    text = re.sub(r"\\item\s*", "• ", text)

    # ── Phase 6: Handle Escaped Characters & Math Symbols ───────
    text = text.replace(r"\&", "&")
    text = text.replace(r"\%", "%")
    text = text.replace(r"\$", "$")
    text = text.replace(r"\_", "_")
    text = text.replace(r"\#", "#")
    text = text.replace(r"\~{}", "~")
    text = text.replace(r"\~", "~")
    text = re.sub(r"\$\\sim\$", "~", text)
    text = re.sub(r"\$([^$]*)\$", r"\1", text)

    # ── Phase 7: Handle \\, \\ (LaTeX newlines and spacing) ──────
    text = re.sub(r"\\vspace\{[^}]*\}", "", text)
    text = re.sub(r"\\hspace\{[^}]*\}", "", text)
    text = text.replace("\\\\", "\n")

    # ── Phase 8: Remove remaining LaTeX commands ─────────────────
    # Multi-pass to handle nested commands like \textbf{\href{...}{...}}
    for _ in range(3):
        prev = text
        text = re.sub(r"\\[a-zA-Z]+\{([^}]*)\}", r"\1", text)
        if text == prev:
            break

    # Remove remaining bare commands (\vspace, \hfill, etc.)
    text = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\s*", "", text)

    # Remove \begin{...} and \end{...}
    text = re.sub(r"\\(?:begin|end)\{[^}]*\}", "", text)

    # ── Phase 9: Cleanup stray text artifacts ─────────────────────
    # Remove stray braces
    text = re.sub(r"[{}]", "", text)

    # Remove |  | empty table separators
    text = re.sub(r"\|\s*\|", "|", text)
    text = re.sub(r"^\s*center\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*4pt\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*r\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\\\s*$", "", text, flags=re.MULTILINE)

    # Clean up excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"^\s+$", "", text, flags=re.MULTILINE)

    # Clean up bullet points (remove stray closing braces from resumeItem)
    # Count braces: if a line starts with • and has unmatched }, remove trailing }
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("•"):
            # Remove trailing } that are unmatched
            opens = stripped.count("{")
            closes = stripped.count("}")
            while closes > opens and stripped.endswith("}"):
                stripped = stripped[:-1].rstrip()
                closes -= 1
        cleaned_lines.append(stripped)

    text = "\n".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ── Section headings typically found in resumes ───────────────────
_SECTION_PATTERNS = [
    (r"(?:professional\s+)?summary|(?:career\s+)?objective|profile", "Summary"),
    (r"(?:technical\s+)?skills|technologies|competencies|expertise", "Skills"),
    (r"(?:work\s+)?experience|employment(?:\s+history)?|professional\s+experience", "Experience"),
    (r"education|academic(?:\s+background)?|degrees?", "Education"),
    (r"projects?|personal\s+projects?|key\s+projects?", "Projects"),
    (r"certifications?|licenses?|credentials?", "Certifications"),
]


def parse_sections(plaintext: str) -> dict[str, str]:
    """
    Split plaintext resume into logical sections by detecting headings.
    Returns dict mapping section name → section content.
    """
    lines = plaintext.split("\n")
    sections: dict[str, str] = {}
    current_section = "Header"
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        matched = False
        for pattern, section_name in _SECTION_PATTERNS:
            if re.match(pattern, stripped, re.IGNORECASE) and len(stripped) < 60:
                # Save previous section
                if current_lines:
                    sections[current_section] = "\n".join(current_lines).strip()
                current_section = section_name
                current_lines = []
                matched = True
                break

        if not matched:
            current_lines.append(line)

    # Save last section
    if current_lines:
        sections[current_section] = "\n".join(current_lines).strip()

    return sections
