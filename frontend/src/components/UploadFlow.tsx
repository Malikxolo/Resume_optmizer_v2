"use client";

/**
 * UploadFlow — Hero upload screen with file drop zone and JD textarea.
 * Premium glassmorphism card with animated gradient border on hover.
 */

import { motion } from "framer-motion";
import { Upload, FileText, Sparkles } from "lucide-react";
import { useCallback, useRef, useState, DragEvent } from "react";

interface UploadFlowProps {
  onSubmit: (texContent: string, jdText: string) => void;
  isLoading: boolean;
}

export default function UploadFlow({ onSubmit, isLoading }: UploadFlowProps) {
  const [texContent, setTexContent] = useState("");
  const [jdText, setJdText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".tex")) {
      alert("Please upload a .tex file");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setTexContent(e.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = () => {
    if (!texContent.trim() || !jdText.trim()) return;
    onSubmit(texContent, jdText);
  };

  const canSubmit = texContent.trim() && jdText.trim() && !isLoading;

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[80vh] px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Hero */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{
            background: "rgba(139, 92, 246, 0.1)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles size={14} style={{ color: "var(--accent-violet)" }} />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-accent)" }}
          >
            Powered by Gemini 3.6 Flash
          </span>
        </motion.div>

        <h1
          className="text-4xl md:text-5xl font-bold mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span style={{ color: "var(--text-primary)" }}>Resume </span>
          <span
            style={{
              background: "var(--accent-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Optimizer
          </span>
        </h1>
        <p
          className="text-lg max-w-lg mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Score your resume against any job description. Get AI-powered
          annotations, then iteratively refine — with zero hallucinated facts.
        </p>
      </motion.div>

      {/* Upload Card */}
      <motion.div
        className="glass-card w-full max-w-2xl p-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* File Drop Zone */}
        <div
          className={`drop-zone mb-6 ${isDragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".tex"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {fileName ? (
            <div className="flex flex-col items-center gap-2">
              <FileText size={32} style={{ color: "var(--success)" }} />
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {fileName}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Click or drop to replace
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} style={{ color: "var(--text-muted)" }} />
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                Drop your .tex resume here
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                or click to browse
              </span>
            </div>
          )}
        </div>

        {/* JD Textarea */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Job Description
          </label>
          <textarea
            className="textarea-field"
            placeholder="Paste the full job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={6}
          />
        </div>

        {/* Submit */}
        <motion.button
          className="btn-accent w-full flex items-center justify-center gap-2 py-3.5 text-base"
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.01 } : {}}
          whileTap={canSubmit ? { scale: 0.99 } : {}}
        >
          {isLoading ? (
            <>
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Analyze Resume
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
