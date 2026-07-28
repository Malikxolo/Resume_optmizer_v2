"use client";

/**
 * VersionTimeline — Clickable version history with score indicators.
 */

import { motion } from "framer-motion";
import { GitBranch, RotateCcw } from "lucide-react";
import type { VersionInfo } from "@/types";

interface VersionTimelineProps {
  versions: VersionInfo[];
  currentVersion: number;
  onRevert: (version: number) => void;
}

export default function VersionTimeline({
  versions,
  currentVersion,
  onRevert,
}: VersionTimelineProps) {
  if (versions.length <= 1) return null;

  return (
    <div className="glass-card p-4">
      <h3
        className="text-sm font-semibold mb-3 flex items-center gap-2"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}
      >
        <GitBranch size={14} />
        Version History
      </h3>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {versions.map((v, i) => {
          const isCurrent = v.version === currentVersion;
          return (
            <motion.div
              key={v.version}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group"
              style={{
                background: isCurrent ? "rgba(139, 92, 246, 0.08)" : "transparent",
                border: isCurrent
                  ? "1px solid rgba(139, 92, 246, 0.2)"
                  : "1px solid transparent",
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: isCurrent ? "var(--accent-violet)" : "var(--text-muted)",
                }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    v{v.version}
                  </span>
                  {v.ats_score != null && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      ATS:{v.ats_score} AI:{v.ai_score ?? "–"}
                    </span>
                  )}
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {v.change_summary || "Initial"}
                </div>
              </div>

              {/* Revert button (hidden until hover, not for current) */}
              {!isCurrent && (
                <motion.button
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 transition-all"
                  onClick={() => onRevert(v.version)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={`Revert to v${v.version}`}
                >
                  <RotateCcw size={12} style={{ color: "var(--text-secondary)" }} />
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
