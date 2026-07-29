"use client";

/**
 * DownloadModal — Export modal supporting both PDF & LaTeX (.tex) downloads.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Download, X, FileText, Code } from "lucide-react";
import { useState } from "react";
import { API_BASE } from "@/config";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export default function DownloadModal({
  isOpen,
  onClose,
  sessionId,
}: DownloadModalProps) {
  const [format, setFormat] = useState<"pdf" | "tex">("pdf");
  const [filename, setFilename] = useState("resume_optimized");

  const handleDownload = (targetFormat: "pdf" | "tex" = format) => {
    const rawName = filename.trim().replace(/\.(pdf|tex)$/i, "") || "resume_optimized";
    const ext = targetFormat === "pdf" ? ".pdf" : ".tex";
    const finalName = `${rawName}${ext}`;

    const endpoint = targetFormat === "pdf" ? `/api/download/${sessionId}` : `/api/download-tex/${sessionId}`;
    const url = `${API_BASE}${endpoint}?filename=${encodeURIComponent(finalName)}`;
    
    // Trigger download via hidden link
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card p-6 w-full max-w-md"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  Export Resume
                </h3>
                <button
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  onClick={onClose}
                >
                  <X size={18} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              {/* Format selector tabs */}
              <div
                className="flex items-center gap-2 mb-5 p-1 rounded-xl"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    format === "pdf"
                      ? "bg-violet-600/30 text-white border border-violet-500/40 shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => setFormat("pdf")}
                >
                  <FileText size={14} />
                  PDF Document (.pdf)
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    format === "tex"
                      ? "bg-violet-600/30 text-white border border-violet-500/40 shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => setFormat("tex")}
                >
                  <Code size={14} />
                  LaTeX Code (.tex)
                </button>
              </div>

              <div className="mb-6">
                <label
                  className="block text-sm mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  File Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                    autoFocus
                  />
                  <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-accent)" }}>
                    .{format}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={onClose}>
                  Cancel
                </button>
                <motion.button
                  className="btn-accent flex-1 flex items-center justify-center gap-2"
                  onClick={() => handleDownload(format)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={16} />
                  Download .{format.toUpperCase()}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
