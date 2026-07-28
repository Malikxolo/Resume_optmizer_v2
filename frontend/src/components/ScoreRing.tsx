"use client";

/**
 * ScoreRing — Animated SVG circular progress indicator.
 * Counts up from 0 (or previous score) to target with easing.
 * Shows delta (+/-) on re-score.
 */

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

interface ScoreRingProps {
  score: number;
  prevScore?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  color?: "blue" | "violet";
}

export default function ScoreRing({
  score,
  prevScore,
  size = 160,
  strokeWidth = 8,
  label,
  color = "blue",
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const countRef = useRef<HTMLSpanElement>(null);

  const motionProgress = useMotionValue(0);
  const strokeDashoffset = useTransform(
    motionProgress,
    [0, 100],
    [circumference, 0]
  );

  const delta = prevScore !== undefined ? score - prevScore : undefined;

  // Gradient colors
  const gradientId = `score-gradient-${label.replace(/\s/g, "-")}`;
  const startColor = color === "blue" ? "#3B82F6" : "#8B5CF6";
  const endColor = color === "blue" ? "#60A5FA" : "#A78BFA";

  // Score color
  const getScoreColor = (s: number) => {
    if (s >= 80) return "var(--success)";
    if (s >= 60) return "var(--warning)";
    return "var(--error)";
  };

  useEffect(() => {
    const from = prevScore ?? 0;
    const controls = animate(motionProgress, score, {
      duration: 1.8,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (v) => {
        if (countRef.current) {
          countRef.current.textContent = Math.round(v).toString();
        }
      },
    });

    // Start from prevScore if available
    motionProgress.set(from);

    return controls.stop;
  }, [score, prevScore, motionProgress]);

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="score-ring"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={endColor} />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            ref={countRef}
            className="text-3xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: getScoreColor(score),
            }}
          >
            0
          </span>
          {delta !== undefined && delta !== 0 && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold"
              style={{
                color: delta > 0 ? "var(--success)" : "var(--error)",
              }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </motion.span>
          )}
        </div>
      </div>

      <span
        className="text-sm font-medium"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
    </motion.div>
  );
}
