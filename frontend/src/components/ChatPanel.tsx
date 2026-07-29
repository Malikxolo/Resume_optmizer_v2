"use client";

/**
 * ChatPanel — Conversational refinement interface.
 * User gives natural-language instructions, receives scoped edits
 * with streaming responses and verification flags.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle, Loader2, X, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ChatMessage, VerificationFlag } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  verificationFlags: VerificationFlag[];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onClose?: () => void;
}

export default function ChatPanel({
  messages,
  verificationFlags,
  isStreaming,
  onSendMessage,
  onClose,
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
    if (inputRef.current) {
      inputRef.current.style.height = "44px";
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.max(44, Math.min(inputRef.current.scrollHeight, 120))}px`;
    }
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
        className="chat-panel-header flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.875rem 1rem" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))",
              border: "1px solid rgba(139, 92, 246, 0.3)",
            }}
          >
            <Sparkles size={14} className="text-violet-400" />
          </div>
          <div>
            <h3
              className="text-sm font-semibold leading-tight flex items-center gap-1.5"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              AI Refinement Copilot
            </h3>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Interactive Resume Assistant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <motion.div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent-violet)" }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--text-accent)" }}>
                Thinking...
              </span>
            </motion.div>
          )}

          {onClose && (
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={onClose}
              title="Close Copilot"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-panel-messages">
        {messages.length === 0 && (
          <div className="text-center py-6 px-2">
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
              Tell me how to improve your resume:
            </p>
            <div className="space-y-2">
              {[
                "Add Python and FastAPI to my skills section",
                "Make the experience bullets more quantified",
                "Tailor the summary to this specific JD",
              ].map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="text-xs w-full text-left p-2.5 rounded-xl transition-all"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--text-secondary)",
                  }}
                  whileHover={{
                    background: "rgba(139, 92, 246, 0.1)",
                    borderColor: "rgba(139, 92, 246, 0.3)",
                    color: "var(--text-primary)",
                  }}
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
            className={`p-3 max-w-[88%] text-xs rounded-xl ${
              msg.role === "user"
                ? "chat-message-user ml-auto"
                : "chat-message-assistant"
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="whitespace-pre-wrap leading-relaxed"
              style={{
                color: "var(--text-primary)",
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
        className="chat-panel-composer p-3 shrink-0 w-full"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(10, 10, 16, 0.8)",
        }}
      >
        <div className="flex items-center gap-2 w-full">
          <textarea
            ref={inputRef}
            className="input-field flex-1 resize-none w-full min-w-0"
            placeholder="e.g., Add Docker and Kubernetes to my skills..."
            value={input}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              padding: "0.625rem 0.875rem",
              lineHeight: "1.4",
              minHeight: "44px",
              maxHeight: "120px",
              borderRadius: "0.75rem",
              fontSize: "0.8125rem",
              boxSizing: "border-box",
            }}
          />
          <motion.button
            className="btn-accent flex items-center justify-center shrink-0"
            style={{
              width: "44px",
              height: "44px",
              padding: 0,
              borderRadius: "0.75rem",
            }}
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
