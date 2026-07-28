"use client";

/**
 * SkeletonLoader — Pulsing skeleton cards for loading states.
 */

import { motion } from "framer-motion";

export function ScoreSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="glass-card p-6 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="skeleton w-32 h-32 rounded-full" />
          <div className="skeleton w-24 h-4 rounded" />
        </motion.div>
      ))}
    </div>
  );
}

export function ResumeSkeleton() {
  return (
    <motion.div
      className="glass-card p-6 space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="skeleton w-48 h-5 rounded" />
      <div className="skeleton w-full h-3 rounded" />
      <div className="skeleton w-full h-3 rounded" />
      <div className="skeleton w-3/4 h-3 rounded" />
      <div className="skeleton w-full h-3 rounded mt-4" />
      <div className="skeleton w-full h-3 rounded" />
      <div className="skeleton w-5/6 h-3 rounded" />
      <div className="skeleton w-full h-3 rounded mt-4" />
      <div className="skeleton w-full h-3 rounded" />
      <div className="skeleton w-2/3 h-3 rounded" />
    </motion.div>
  );
}

export function ChatSkeleton() {
  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="skeleton w-32 h-4 rounded" />
      <div className="flex-1 space-y-3 py-8">
        <div className="skeleton w-3/4 h-3 rounded ml-auto" />
        <div className="skeleton w-1/2 h-3 rounded" />
        <div className="skeleton w-2/3 h-3 rounded" />
      </div>
      <div className="skeleton w-full h-10 rounded" />
    </motion.div>
  );
}
