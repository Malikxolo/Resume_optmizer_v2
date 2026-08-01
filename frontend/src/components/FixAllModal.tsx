"use client";

/**
 * FixAllModal — Interactive Customization Modal for Auto-Fixing Resume Issues.
 * Allows users to select/deselect specific issues and missing keywords,
 * choose between ATS Portal Mode and HR Direct Mode, and submit a single customized edit prompt.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Target,
  Users,
  CheckSquare,
  Square,
  Wand2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { ResumeIssue, MissingContent } from "@/types";

interface FixAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ResumeIssue[];
  missingContent: MissingContent[];
  onApplyFixes: (promptText: string) => void;
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

export default function FixAllModal({
  isOpen,
  onClose,
  issues,
  missingContent,
  onApplyFixes,
}: FixAllModalProps) {
  const [selectedIssueIndices, setSelectedIssueIndices] = useState<Set<number>>(new Set());
  const [selectedMissingIndices, setSelectedMissingIndices] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"ats" | "hr">("ats");

  // Reset selections when modal opens or content updates
  useEffect(() => {
    if (isOpen) {
      setSelectedIssueIndices(new Set(issues.map((_, i) => i)));
      setSelectedMissingIndices(new Set(missingContent.map((_, i) => i)));
    }
  }, [isOpen, issues, missingContent]);

  if (!isOpen) return null;

  // Issue Toggles
  const toggleIssue = (index: number) => {
    setSelectedIssueIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAllIssues = () => {
    if (selectedIssueIndices.size === issues.length) {
      setSelectedIssueIndices(new Set());
    } else {
      setSelectedIssueIndices(new Set(issues.map((_, i) => i)));
    }
  };

  // Missing Content Toggles
  const toggleMissing = (index: number) => {
    setSelectedMissingIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAllMissing = () => {
    if (selectedMissingIndices.size === missingContent.length) {
      setSelectedMissingIndices(new Set());
    } else {
      setSelectedMissingIndices(new Set(missingContent.map((_, i) => i)));
    }
  };

  const totalSelected = selectedIssueIndices.size + selectedMissingIndices.size;

  const handleSubmit = () => {
    if (totalSelected === 0) return;

    // Filter selected issues
    const chosenIssues = issues.filter((_, i) => selectedIssueIndices.has(i));
    const issueSuggestions = chosenIssues.map(
      (iss) => `Fix ${iss.section} (${iss.issue_type}): ${iss.suggestion}`
    );

    // Filter selected missing content items (separating tech skills vs qualifications)
    const chosenMissing = missingContent.filter((_, i) => selectedMissingIndices.has(i));
    const techSkills = chosenMissing
      .filter(
        (m) =>
          m.category !== "qualification" &&
          !/\d+\+?\s*years?/i.test(m.jd_requirement)
      )
      .map((m) => m.jd_requirement);

    const qualifications = chosenMissing
      .filter(
        (m) =>
          m.category === "qualification" ||
          /\d+\+?\s*years?/i.test(m.jd_requirement)
      )
      .map((m) => m.jd_requirement);

    // Construct prompt
    const modeInstruction =
      mode === "ats"
        ? "Rewrite in ATS Portal Mode (target job title alignment for online ATS application portals, maximum keyword density)."
        : "Rewrite in HR Direct Mode (natural skill-first headline, human readability, quantified metrics %, $, problem-solving impact for direct recruiter reachout).";

    const promptParts: string[] = [];
    promptParts.push(
      `Apply a single comprehensive edit to my resume using ${
        mode === "ats" ? "🎯 ATS Portal Mode" : "🤝 HR Direct Mode"
      }.\n`
    );

    if (issueSuggestions.length > 0) {
      promptParts.push(
        `Selected Issues to Fix (${issueSuggestions.length}):\n` +
          issueSuggestions.map((s) => `- ${s}`).join("\n")
      );
    }

    if (techSkills.length > 0) {
      promptParts.push(
        `Selected Technical Skills & Requirements to Integrate:\n- ${techSkills.join(", ")}`
      );
    }

    if (qualifications.length > 0) {
      promptParts.push(
        `Selected Job Criteria to Emphasize:\n- Emphasize relevant technical depth and domain experience for: ${qualifications.join(
          ", "
        )}. Do NOT claim unearned years of experience.`
      );
    }

    promptParts.push(`Optimization Mode: ${modeInstruction}`);
    promptParts.push(
      "Note: Correct any percentage metric formatting (e.g. '35' -> '35%'). Do NOT fabricate unearned years of experience or fake work history."
    );

    const fullPrompt = promptParts.join("\n\n");
    onApplyFixes(fullPrompt);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="glass-card relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div
            className="p-5 flex items-center justify-between border-b"
            style={{ borderColor: "var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                }}
              >
                <Sparkles size={18} style={{ color: "var(--accent-violet)" }} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Customize Auto-Fix All
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Select items to include and choose your optimization mode.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body content scrollable */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Mode Selection Toggle Cards */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-secondary)" }}>
                Choose Optimization Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ATS Mode Card */}
                <button
                  type="button"
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    mode === "ats" ? "ring-2 ring-purple-500/50" : "opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    background: mode === "ats" ? "rgba(59, 130, 246, 0.12)" : "rgba(255,255,255,0.02)",
                    borderColor: mode === "ats" ? "var(--accent-blue)" : "var(--border-subtle)",
                  }}
                  onClick={() => setMode("ats")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={16} style={{ color: "var(--accent-blue)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      🎯 ATS Portal Mode
                    </span>
                    {mode === "ats" && (
                      <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Aligns summary & bullets for online ATS application portals with maximum keyword density.
                  </p>
                </button>

                {/* HR Mode Card */}
                <button
                  type="button"
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    mode === "hr" ? "ring-2 ring-purple-500/50" : "opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    background: mode === "hr" ? "rgba(139, 92, 246, 0.12)" : "rgba(255,255,255,0.02)",
                    borderColor: mode === "hr" ? "var(--accent-violet)" : "var(--border-subtle)",
                  }}
                  onClick={() => setMode("hr")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={16} style={{ color: "var(--accent-violet)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      🤝 HR Direct Mode
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Crafts natural skill-first headlines & impact metrics (%, $) for direct recruiter reachout.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 1: Flagged Issues */}
            {issues.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Flagged Issues ({selectedIssueIndices.size}/{issues.length})
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium transition-colors hover:text-white"
                    style={{ color: "var(--accent-violet)" }}
                    onClick={toggleAllIssues}
                  >
                    {selectedIssueIndices.size === issues.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2">
                  {issues.map((iss, i) => {
                    const isChecked = selectedIssueIndices.has(i);
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all hover:bg-white/[0.03]"
                        style={{
                          background: isChecked ? "rgba(255,255,255,0.03)" : "transparent",
                          borderColor: isChecked ? "rgba(139, 92, 246, 0.3)" : "var(--border-subtle)",
                          opacity: isChecked ? 1 : 0.6,
                        }}
                        onClick={() => toggleIssue(i)}
                      >
                        <button type="button" className="mt-0.5 shrink-0" style={{ color: isChecked ? "var(--accent-violet)" : "var(--text-muted)" }}>
                          {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityIcon severity={iss.severity} />
                            <span className="text-xs font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                              {iss.issue_type.replace(/_/g, " ")} ({iss.section})
                            </span>
                            <span className={`badge badge-${iss.severity} text-[9px] uppercase font-mono ml-auto`}>
                              {iss.severity}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {iss.suggestion}
                          </p>
                          {iss.exact_text_snippet && (
                            <div className="text-[11px] font-mono mt-1 px-2 py-0.5 rounded bg-black/30 truncate" style={{ color: "var(--text-muted)" }}>
                              "{iss.exact_text_snippet}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Missing Keywords & Requirements */}
            {missingContent.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Missing Keywords & Skills ({selectedMissingIndices.size}/{missingContent.length})
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium transition-colors hover:text-white"
                    style={{ color: "var(--accent-violet)" }}
                    onClick={toggleAllMissing}
                  >
                    {selectedMissingIndices.size === missingContent.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2">
                  {missingContent.map((mc, i) => {
                    const isChecked = selectedMissingIndices.has(i);
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all hover:bg-white/[0.03]"
                        style={{
                          background: isChecked ? "rgba(255,255,255,0.03)" : "transparent",
                          borderColor: isChecked ? "rgba(59, 130, 246, 0.3)" : "var(--border-subtle)",
                          opacity: isChecked ? 1 : 0.6,
                        }}
                        onClick={() => toggleMissing(i)}
                      >
                        <button type="button" className="mt-0.5 shrink-0" style={{ color: isChecked ? "var(--accent-blue)" : "var(--text-muted)" }}>
                          {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                              {mc.jd_requirement}
                            </span>
                            <span className="badge badge-minor text-[9px] font-mono">
                              {mc.category}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {mc.recommendation}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 flex items-center justify-between border-t"
            style={{ borderColor: "var(--border-subtle)", background: "rgba(0,0,0,0.2)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="font-semibold text-white">{totalSelected}</span> item{totalSelected !== 1 ? "s" : ""} selected for edit
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                style={{ color: "var(--text-secondary)" }}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={totalSelected === 0}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
                  totalSelected === 0 ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 shadow-purple-500/20"
                }`}
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
                  color: "#ffffff",
                }}
                onClick={handleSubmit}
              >
                <Wand2 size={14} />
                Apply Fixes with AI
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
