"use client";

/**
 * PDFPreview — Inline PDF viewer using native browser embed.
 * Falls back to a message if PDF isn't available.
 */

import { motion } from "framer-motion";
import { FileText, AlertCircle } from "lucide-react";
import { API_BASE } from "@/config";

interface PDFPreviewProps {
  sessionId: string | null;
  version?: number;
  hasPdf: boolean;
}

export default function PDFPreview({ sessionId, version, hasPdf }: PDFPreviewProps) {
  if (!sessionId || !hasPdf) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle size={32} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
          {!sessionId
            ? "Upload a resume to see the PDF preview"
            : "PDF compilation unavailable. Install Tectonic to enable live preview."}
        </p>
      </div>
    );
  }

  const pdfUrl = version
    ? `${API_BASE}/api/pdf/${sessionId}/${version}`
    : `${API_BASE}/api/pdf/${sessionId}`;

  return (
    <motion.div
      className="glass-card pdf-preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <FileText size={14} style={{ color: "var(--text-secondary)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          PDF Preview
          {version && ` — v${version}`}
        </span>
      </div>
      <embed
        src={pdfUrl}
        type="application/pdf"
        className="w-full"
        style={{ height: "min(72vh, 780px)", background: "var(--bg-primary)" }}
      />
    </motion.div>
  );
}
