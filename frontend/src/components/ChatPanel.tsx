"use client";

/**
 * ChatPanel — Conversational refinement interface.
 * User gives natural-language instructions, receives scoped edits
 * with streaming responses and verification flags.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ChatMessage, VerificationFlag } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  verificationFlags: VerificationFlag[];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({
  messages,
  verificationFlags,
  isStreaming,
  onSendMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, verificationFlags]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-card chat-panel">
      {/* Header */}
      <div
        className="chat-panel-header"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--accent-gradient)" }}
        />
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}
        >
          Refine Resume
        </h3>
        {isStreaming && (
          <motion.div
            className="ml-auto flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent-violet)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Processing...
            </span>
          </motion.div>
        )}
      </div>

      {/* Messages */}
      <div className="chat-panel-messages">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Tell me how to improve your resume.
            </p>
            <div className="mt-4 space-y-2">
              {[
                "Add Python and FastAPI to my skills section",
                "Make the experience bullets more quantified",
                "Tailor the summary to this specific JD",
              ].map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="btn-ghost text-xs w-full text-left"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                >
                  &ldquo;{suggestion}&rdquo;
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`p-3.5 max-w-[85%] ${
              msg.role === "user"
                ? "chat-message-user ml-auto"
                : "chat-message-assistant"
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="text-sm whitespace-pre-wrap"
              style={{
                color:
                  msg.role === "user"
                    ? "var(--text-primary)"
                    : "var(--text-primary)",
              }}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Verification flags */}
        <AnimatePresence>
          {verificationFlags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "var(--warning)" }}
              >
                <AlertTriangle size={12} />
                Unverified items — please confirm
              </div>
              {verificationFlags.map((flag, i) => (
                <motion.div
                  key={i}
                  className="p-3 rounded-lg text-xs"
                  style={{
                    background: "var(--warning-bg)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="font-medium" style={{ color: "var(--warning)" }}>
                    &ldquo;{flag.flagged_text}&rdquo;
                  </div>
                  <div className="mt-1" style={{ color: "var(--text-secondary)" }}>
                    {flag.reason}
                  </div>
                  <div className="mt-1" style={{ color: "var(--text-muted)" }}>
                    Location: {flag.location_in_draft}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="chat-panel-composer"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="input-field flex-1 resize-none"
            placeholder="e.g., Add Docker and Kubernetes to my skills..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              minHeight: "40px",
              maxHeight: "120px",
            }}
          />
          <motion.button
            className="btn-accent p-2.5 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
