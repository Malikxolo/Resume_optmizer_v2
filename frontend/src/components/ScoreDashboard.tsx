"use client";

/**
 * ScoreDashboard — Premium Single Overall Match Score Hero Display + Sub-Pill Breakdown.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Sparkles, Award } from "lucide-react";
import ScoreRing from "./ScoreRing";
import type { ATSScore, AIScreeningScore, SubCriterionScore } from "@/types";

interface ScoreDashboardProps {
  atsScore: ATSScore | null;
  aiScore: AIScreeningScore | null;
}

function SubScoreRow({ sub, index }: { sub: SubCriterionScore; index: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return { bar: "var(--success)", bg: "rgba(52, 211, 153, 0.12)" };
    if (s >= 60) return { bar: "var(--warning)", bg: "rgba(251, 191, 36, 0.12)" };
    return { bar: "var(--error)", bg: "rgba(248, 113, 113, 0.12)" };
  };
  const colors = getColor(sub.score);

  return (
    <motion.div
      className="py-3 px-4 rounded-lg"
      style={{ background: colors.bg }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium capitalize"
          style={{ color: "var(--text-primary)", letterSpacing: "0.01em" }}
        >
          {sub.criterion.replace(/_/g, " ")}
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: colors.bar, fontFamily: "var(--font-display)" }}
        >
          {sub.score}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden mb-2"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: colors.bar }}
          initial={{ width: 0 }}
          animate={{ width: `${sub.score}%` }}
          transition={{ duration: 0.8, delay: 0.3 + index * 0.06, ease: "easeOut" }}
        />
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {sub.justification}
      </p>
    </motion.div>
  );
}

function ScoreCard({
  title,
  score,
  prevTotal,
  subScores,
  color,
  icon,
}: {
  title: string;
  score: number;
  prevTotal?: number;
  subScores: SubCriterionScore[];
  color: "blue" | "violet";
  icon: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const delta = prevTotal !== undefined ? score - prevTotal : undefined;

  return (
    <motion.div
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="p-6 pb-4 flex items-center gap-5">
        <ScoreRing score={score} prevScore={prevTotal} label="" color={color} size={110} strokeWidth={7} />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
          </div>

          {delta !== undefined && delta !== 0 && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1"
              style={{
                background: delta > 0 ? "var(--success-bg)" : "var(--error-bg)",
                color: delta > 0 ? "var(--success)" : "var(--error)",
              }}
            >
              {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {delta > 0 ? "+" : ""}{delta} pts
            </div>
          )}

          <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {score >= 80
              ? "Strong match — well optimized for job post"
              : score >= 60
                ? "Good foundation — missing a few key skills"
                : "Needs skill & metric optimization"}
          </p>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        className="w-full px-6 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          background: expanded ? "rgba(255,255,255,0.02)" : "transparent",
        }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = expanded ? "rgba(255,255,255,0.02)" : "transparent")
        }
      >
        {expanded ? "Hide" : "Show"} Criteria Breakdown ({subScores.length})
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Sub-scores */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {subScores.map((sub, i) => (
                <SubScoreRow key={i} sub={sub} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ScoreDashboard({ atsScore, aiScore }: ScoreDashboardProps) {
  if (!atsScore && !aiScore) return null;

  const atsVal = atsScore?.total_score ?? 0;
  const aiVal = aiScore?.total_score ?? 0;

  // Composite overall score against the target JD
  const overallScore = Math.round(0.5 * atsVal + 0.5 * aiVal);

  const getVerdict = (s: number) => {
    if (s >= 85) return { label: "Exceptional Match", color: "var(--success)", bg: "rgba(52, 211, 153, 0.12)" };
    if (s >= 70) return { label: "Strong Match", color: "var(--accent-violet)", bg: "rgba(139, 92, 246, 0.12)" };
    if (s >= 55) return { label: "Moderate Match — Gaps Found", color: "var(--warning)", bg: "rgba(251, 191, 36, 0.12)" };
    return { label: "Weak Match — Key Requirements Missing", color: "var(--error)", bg: "rgba(248, 113, 113, 0.12)" };
  };

  const verdict = getVerdict(overallScore);

  return (
    <div className="space-y-5">
      {/* Primary Overall Match Score Hero Card */}
      <motion.div
        className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
        }}
      >
        <div className="flex items-center gap-6">
          <ScoreRing score={overallScore} label="OVERALL" color="violet" size={140} strokeWidth={9} />

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Award size={18} style={{ color: "var(--accent-violet)" }} />
              <h2
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
              >
                Overall Match Score against JD
              </h2>
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2"
              style={{ background: verdict.bg, color: verdict.color }}
            >
              <Sparkles size={12} />
              {verdict.label}
            </div>

            <p className="text-xs leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
              Combined evaluation of your hard ATS keyword coverage ({atsVal}%) and AI recruiter writing & impact score ({aiVal}%).
            </p>
          </div>
        </div>

        {/* Sub-Pills Quick Overview */}
        <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
          <div
            className="flex-1 px-4 py-2.5 rounded-xl flex items-center justify-between gap-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <Target size={14} style={{ color: "var(--accent-blue)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                ATS Keyword Fit
              </span>
            </div>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--accent-blue)", fontFamily: "var(--font-display)" }}
            >
              {atsVal}%
            </span>
          </div>

          <div
            className="flex-1 px-4 py-2.5 rounded-xl flex items-center justify-between gap-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: "var(--accent-violet)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                AI Recruiter Quality
              </span>
            </div>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--accent-violet)", fontFamily: "var(--font-display)" }}
            >
              {aiVal}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Detailed Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {atsScore && (
          <ScoreCard
            title="ATS Parseability & Keyword Coverage"
            score={atsScore.total_score}
            prevTotal={atsScore.prev_total}
            subScores={atsScore.sub_scores}
            color="blue"
            icon={
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)" }}
              >
                A
              </div>
            }
          />
        )}
        {aiScore && (
          <ScoreCard
            title="AI Recruiter Screening & Writing Quality"
            score={aiScore.total_score}
            prevTotal={aiScore.prev_total}
            subScores={aiScore.sub_scores}
            color="violet"
            icon={
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-violet)" }}
              >
                AI
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
