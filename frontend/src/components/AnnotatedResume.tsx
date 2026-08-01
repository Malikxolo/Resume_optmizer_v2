"use client";

/**
 * AnnotatedResume — Premium formatted view for resume text and issue annotations.
 * Features interactive popover mode selector (ATS Portal Mode vs HR Direct Mode)
 * for Summary and Experience fixes.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { ResumeIssue, MissingContent } from "@/types";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  FileCheck,
  Wand2,
  CheckCircle2,
  Target,
  Users,
} from "lucide-react";

interface AnnotatedResumeProps {
  plaintext: string;
  issues: ResumeIssue[];
  missingContent: MissingContent[];
  resolvedSnippets?: Set<string>;
  onFixIssue?: (promptText: string) => void;
}

interface AnnotationSegment {
  text: string;
  issue?: ResumeIssue;
  isAnnotated: boolean;
}

function buildSegments(
  plaintext: string,
  issues: ResumeIssue[]
): AnnotationSegment[] {
  if (!issues.length) return [{ text: plaintext, isAnnotated: false }];

  const matches: { start: number; end: number; issue: ResumeIssue }[] = [];

  for (const issue of issues) {
    const snippet = issue.exact_text_snippet;
    if (!snippet) continue;
    const idx = plaintext.indexOf(snippet);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + snippet.length, issue });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: AnnotationSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue;

    if (match.start > cursor) {
      segments.push({
        text: plaintext.slice(cursor, match.start),
        isAnnotated: false,
      });
    }
    segments.push({
      text: plaintext.slice(match.start, match.end),
      issue: match.issue,
      isAnnotated: true,
    });
    cursor = match.end;
  }

  if (cursor < plaintext.length) {
    segments.push({
      text: plaintext.slice(cursor),
      isAnnotated: false,
    });
  }

  return segments;
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <AlertCircle size={14} style={{ color: "var(--severity-critical)" }} />;
    case "major":
      return <AlertTriangle size={14} style={{ color: "var(--severity-major)" }} />;
    default:
      return <Info size={14} style={{ color: "var(--severity-minor)" }} />;
  }
}

export default function AnnotatedResume({
  plaintext,
  issues,
  missingContent,
  resolvedSnippets,
  onFixIssue,
}: AnnotatedResumeProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [modePopoverIssue, setModePopoverIssue] = useState<string | null>(null);

  const segments = buildSegments(plaintext, issues);
  let annotationIndex = 0;

  return (
    <div className="resume-analysis">
      {/* Resume Text View */}
      <div className="glass-card resume-panel">
        <div
          className="resume-panel-header"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.01)" }}
        >
          <div className="flex items-center gap-2.5">
            <FileCheck size={16} style={{ color: "var(--accent-violet)" }} />
            <h3
              className="text-sm font-semibold tracking-wide"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              Parsed Resume Content
            </h3>
          </div>
          {issues.length > 0 ? (
            <span className="badge badge-major font-mono text-xs">
              {issues.length} flagged issue{issues.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="badge badge-success font-mono text-xs flex items-center gap-1">
              <Sparkles size={11} /> Clean
            </span>
          )}
        </div>

        <div className="resume-panel-content">
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
            style={{
              color: "var(--text-primary)",
              lineHeight: "1.75",
            }}
          >
            {segments.map((seg, i) => {
              if (!seg.isAnnotated || !seg.issue) {
                return <span key={i}>{seg.text}</span>;
              }

              const idx = annotationIndex++;
              const isResolved = resolvedSnippets?.has(seg.issue.exact_text_snippet);
              const tooltipId = `tooltip-${i}`;
              const isPopoverOpen = modePopoverIssue === tooltipId;

              const isMultiModeSection =
                seg.issue.section.toLowerCase().includes("summary") ||
                seg.issue.section.toLowerCase().includes("experience") ||
                seg.issue.issue_type.toLowerCase().includes("summary") ||
                seg.issue.issue_type.toLowerCase().includes("wording");

              return (
                <motion.span
                  key={i}
                  className={`annotation-highlight severity-${seg.issue.severity} ${
                    isResolved ? "line-through opacity-60" : ""
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: 0.2 + idx * 0.1,
                    duration: 0.3,
                  }}
                  onMouseEnter={() => !modePopoverIssue && setActiveTooltip(tooltipId)}
                  onMouseLeave={() => !modePopoverIssue && setActiveTooltip(null)}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  {seg.text}

                  {/* Tooltip with One-Click Fix & Mode Selector Popover */}
                  <AnimatePresence>
                    {(activeTooltip === tooltipId || isPopoverOpen) && (
                      <motion.div
                        className="tooltip annotation-tooltip"
                        style={{
                          bottom: "calc(100% + 10px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "340px",
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-light)",
                          boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
                        }}
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <SeverityIcon severity={seg.issue.severity} />
                            <span
                              className="font-semibold text-xs capitalize"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {seg.issue.issue_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className={`badge badge-${seg.issue.severity} text-[10px] uppercase font-mono`}>
                            {seg.issue.severity}
                          </span>
                        </div>

                        <p
                          className="text-xs leading-relaxed mb-3"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {seg.issue.suggestion}
                        </p>

                        {!isPopoverOpen ? (
                          <div
                            className="text-[11px] pt-2.5 flex items-center justify-between"
                            style={{
                              borderTop: "1px solid var(--border-subtle)",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>Section: {seg.issue.section}</span>
                            {onFixIssue && !isResolved && (
                              <button
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shadow-md transition-all"
                                style={{
                                  background: "var(--accent-gradient)",
                                  color: "#ffffff",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMultiModeSection) {
                                    setModePopoverIssue(tooltipId);
                                  } else {
                                    const fixPrompt = `Fix issue in ${seg.issue?.section}: ${seg.issue?.suggestion} (snippet: "${seg.issue?.exact_text_snippet}")`;
                                    onFixIssue(fixPrompt);
                                  }
                                }}
                              >
                                <Wand2 size={12} />
                                Fix with AI
                              </button>
                            )}
                            {isResolved && (
                              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                                <CheckCircle2 size={12} /> Fixed
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Mode Selection Popover Popup */
                          <div
                            className="pt-3 space-y-2"
                            style={{ borderTop: "1px solid var(--border-subtle)" }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                                Choose Optimization Mode:
                              </span>
                              <button
                                className="text-[10px]"
                                style={{ color: "var(--text-muted)" }}
                                onClick={() => setModePopoverIssue(null)}
                              >
                                Cancel
                              </button>
                            </div>

                            <button
                              className="w-full p-2.5 rounded-lg text-left text-xs transition-all flex items-start gap-2.5"
                              style={{
                                background: "rgba(59, 130, 246, 0.12)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                              }}
                              onClick={() => {
                                setModePopoverIssue(null);
                                setActiveTooltip(null);
                                const fixPrompt = `Rewrite ${seg.issue?.section} in ATS Portal Mode (target job title alignment for online applications): ${seg.issue?.suggestion}`;
                                onFixIssue?.(fixPrompt);
                              }}
                            >
                              <Target size={14} className="shrink-0 mt-0.5" style={{ color: "var(--accent-blue)" }} />
                              <div>
                                <div className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>
                                  🎯 ATS Portal Mode
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                  Target title alignment for online ATS portals
                                </div>
                              </div>
                            </button>

                            <button
                              className="w-full p-2.5 rounded-lg text-left text-xs transition-all flex items-start gap-2.5"
                              style={{
                                background: "rgba(139, 92, 246, 0.12)",
                                border: "1px solid rgba(139, 92, 246, 0.3)",
                              }}
                              onClick={() => {
                                setModePopoverIssue(null);
                                setActiveTooltip(null);
                                const fixPrompt = `Rewrite ${seg.issue?.section} in HR Direct Mode (natural skill-first headline for direct recruiter reachout): ${seg.issue?.suggestion}`;
                                onFixIssue?.(fixPrompt);
                              }}
                            >
                              <Users size={14} className="shrink-0 mt-0.5" style={{ color: "var(--accent-violet)" }} />
                              <div>
                                <div className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>
                                  🤝 HR Direct Mode
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                  Natural skill-first headline for human recruiters
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Missing Content Cards & Auto-Fix All Hero Banner */}
      {missingContent.length > 0 && (
        <div className="space-y-4">
          <div className="missing-content-header">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
              <h3
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
              >
                Missing Keywords & Requirements ({missingContent.length})
              </h3>
            </div>

            {onFixIssue && (
              <button
                className="auto-fix-button"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
                  color: "#ffffff",
                }}
                onClick={() => {
                  const techSkills = missingContent
                    .filter(
                      (m) =>
                        m.category !== "qualification" &&
                        !/\d+\+?\s*years?/i.test(m.jd_requirement)
                    )
                    .map((m) => m.jd_requirement);
                  const skillsText = techSkills.length > 0 ? techSkills.join(", ") : "missing technical skills";
                  const fixAllPrompt = `Fix all flagged issues, integrate missing technical skills (${skillsText}), and correct percentage metric formatting across experience bullets in 1 single comprehensive edit. Do NOT fabricate unearned years of experience.`;
                  onFixIssue(fixAllPrompt);
                }}
              >
                <Sparkles size={14} />
                ⚡ Auto-Fix All Issues with AI
              </button>
            )}
          </div>

          <div className="missing-content-grid">
            {missingContent.map((mc, i) => (
              <motion.div
                key={i}
                className="glass-card missing-content-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {mc.jd_requirement}
                    </span>
                    <span className="badge badge-minor text-[10px] font-mono shrink-0">
                      {mc.category}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                    {mc.recommendation}
                  </p>
                </div>

                {onFixIssue && (
                  <div className="pt-2 flex justify-end" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: "rgba(139, 92, 246, 0.15)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        color: "var(--accent-violet)",
                      }}
                      onClick={() => {
                        const isQual =
                          mc.category === "qualification" ||
                          /\d+\+?\s*years?/i.test(mc.jd_requirement);
                        const promptText = isQual
                          ? `Optimize my resume for ${mc.jd_requirement} by emphasizing relevant technical depth and project expertise, without claiming unearned experience years.`
                          : `Add missing ${mc.category} '${mc.jd_requirement}' to my resume. ${mc.recommendation}`;
                        onFixIssue(promptText);
                      }}
                    >
                      <Wand2 size={12} />
                      {mc.category === "qualification" || /\d+\+?\s*years?/i.test(mc.jd_requirement)
                        ? "Optimize Alignment"
                        : "Add to Resume"}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
