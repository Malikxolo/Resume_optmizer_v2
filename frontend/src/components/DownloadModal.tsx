"use client";

/**
 * DownloadModal — Filename prompt modal for PDF download.
 * Glassmorphism overlay with input and download trigger.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { useState } from "react";

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
  const [filename, setFilename] = useState("resume_optimized");

  const handleDownload = () => {
    const name = filename.trim() || "resume_optimized";
    const finalName = name.endsWith(".pdf") ? name : `${name}.pdf`;
    const url = `/api/download/${sessionId}?filename=${encodeURIComponent(finalName)}`;
    
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
                  Download Resume
                </h3>
                <button
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  onClick={onClose}
                >
                  <X size={18} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              <div className="mb-6">
                <label
                  className="block text-sm mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Filename
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
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    .pdf
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={onClose}>
                  Cancel
                </button>
                <motion.button
                  className="btn-accent flex-1 flex items-center justify-center gap-2"
                  onClick={handleDownload}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={16} />
                  Download
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
