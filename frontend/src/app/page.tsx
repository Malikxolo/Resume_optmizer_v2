"use client";

/**
 * Main page — Single-page app orchestrating all views.
 * Premium layout with structured grid and top-tier visual hierarchy.
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  MessageSquare,
  Eye,
  FileText,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";

import type {
  AppPhase,
  ATSScore,
  AIScreeningScore,
  ResumeIssue,
  MissingContent,
  VerificationFlag,
  ChatMessage,
  VersionInfo,
  EditResult,
} from "@/types";
import { useSSE } from "@/hooks/useSSE";

import { API_BASE } from "@/config";

import UploadFlow from "@/components/UploadFlow";
import ScoreDashboard from "@/components/ScoreDashboard";
import AnnotatedResume from "@/components/AnnotatedResume";
import ChatPanel from "@/components/ChatPanel";
import PDFPreview from "@/components/PDFPreview";
import DownloadModal from "@/components/DownloadModal";
import VersionTimeline from "@/components/VersionTimeline";
import { ScoreSkeleton, ResumeSkeleton } from "@/components/SkeletonLoader";

export default function HomePage() {
  const [phase, setPhase] = useState<AppPhase>("upload");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [plaintext, setPlaintext] = useState("");
  const [hasPdf, setHasPdf] = useState(false);

  const [atsScore, setAtsScore] = useState<ATSScore | null>(null);
  const [aiScore, setAiScore] = useState<AIScreeningScore | null>(null);
  const [issues, setIssues] = useState<ResumeIssue[]>([]);
  const [missingContent, setMissingContent] = useState<MissingContent[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [verificationFlags, setVerificationFlags] = useState<VerificationFlag[]>([]);
  const [showChat, setShowChat] = useState(false);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"resume" | "pdf">("resume");

  const fetchVersions = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/history/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (e) {
      console.error("Failed to fetch versions:", e);
    }
  }, [sessionId]);

  const scoringSSE = useSSE({
    onEvent: (eventType, data) => {
      const d = data as Record<string, unknown>;
      switch (eventType) {
        case "ats_score":
          setAtsScore(d as unknown as ATSScore);
          break;
        case "ai_score":
          setAiScore(d as unknown as AIScreeningScore);
          break;
        case "issues":
          setIssues(d as unknown as ResumeIssue[]);
          break;
        case "missing":
          setMissingContent(d as unknown as MissingContent[]);
          break;
        case "complete":
          setPhase("results");
          fetchVersions();
          break;
        case "error":
          console.error("Scoring error:", d);
          setPhase("results");
          break;
      }
    },
    onError: (err) => {
      console.error("SSE error:", err);
      setPhase("results");
    },
  });

  const chatSSE = useSSE({
    onEvent: (eventType, data) => {
      const d = data as Record<string, unknown>;
      switch (eventType) {
        case "edit_result": {
          const result = d as unknown as EditResult;
          setPlaintext(result.plaintext);
          setCurrentVersion(result.version);
          setHasPdf(result.has_pdf);
          break;
        }
        case "verification": {
          const v = d as unknown as { flags: VerificationFlag[]; is_clean: boolean };
          setVerificationFlags(v.flags || []);
          break;
        }
        case "ats_score":
          setAtsScore(d as unknown as ATSScore);
          break;
        case "ai_score":
          setAiScore(d as unknown as AIScreeningScore);
          break;
        case "issues":
          setIssues(d as unknown as ResumeIssue[]);
          break;
        case "missing":
          setMissingContent(d as unknown as MissingContent[]);
          break;
        case "complete": {
          const c = d as { version?: number };
          if (c.version) setCurrentVersion(c.version);
          fetchVersions();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: `✅ Resume updated (Version ${c.version || "new"}). ATS and AI scores refreshed.`,
            },
          ]);
          break;
        }
        case "error":
          console.error("Chat error:", d);
          setMessages((prev) => [
            ...prev,
            { role: "assistant" as const, content: `❌ Error: ${(d as { error?: string }).error}` },
          ]);
          break;
      }
    },
    onError: (err) => {
      console.error("Chat SSE error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: `❌ Connection error: ${err.message}` },
      ]);
    },
  });

  const handleUpload = useCallback(
    async (texContent: string, jdText: string) => {
      setPhase("analyzing");

      try {
        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tex_content: texContent, jd_text: jdText }),
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.status}`);
        }

        const session = await uploadRes.json();
        setSessionId(session.session_id);
        setCurrentVersion(session.current_version);
        setPlaintext(session.plaintext);

        scoringSSE.startStream(`${API_BASE}/api/score/${session.session_id}`);
      } catch (err) {
        console.error("Upload error:", err);
        setPhase("upload");
      }
    },
    [scoringSSE]
  );

  const [pendingRescore, setPendingRescore] = useState(false);

  const handleRescore = useCallback(() => {
    if (!sessionId) return;
    setPendingRescore(false);
    scoringSSE.startStream(`${API_BASE}/api/rescore/${sessionId}`);
  }, [sessionId, scoringSSE]);

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!sessionId) return;
      setMessages((prev) => [...prev, { role: "user" as const, content: message }]);
      setVerificationFlags([]);
      setPendingRescore(true);

      chatSSE.startStream(`${API_BASE}/api/chat/${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },
    [sessionId, chatSSE]
  );

  const handleRevert = useCallback(
    async (version: number) => {
      if (!sessionId) return;
      try {
        const res = await fetch(`${API_BASE}/api/revert/${sessionId}/${version}`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentVersion(data.version);
          scoringSSE.startStream(`${API_BASE}/api/score/${sessionId}`);
          const stateRes = await fetch(`${API_BASE}/api/session/${sessionId}`);
          if (stateRes.ok) {
            const state = await stateRes.json();
            setPlaintext(state.plaintext);
          }
          fetchVersions();
        }
      } catch (e) {
        console.error("Revert failed:", e);
      }
    },
    [sessionId, scoringSSE, fetchVersions]
  );

  const handleNewResume = useCallback(() => {
    setPhase("upload");
    setSessionId(null);
    setAtsScore(null);
    setAiScore(null);
    setIssues([]);
    setMissingContent([]);
    setMessages([]);
    setVerificationFlags([]);
    setVersions([]);
    setShowChat(false);
    setPlaintext("");
    setHasPdf(false);
  }, []);

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg-primary)" }}>
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <span
              className="text-base font-bold tracking-tight block leading-none"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Resume Optimizer
            </span>
            <span className="text-[10px] text-muted-foreground" style={{ color: "var(--text-muted)" }}>
              Powered by Gemini 3.6 Flash
            </span>
          </div>
        </div>

        {sessionId && (
          <div className="flex items-center gap-2.5">
            {pendingRescore && (
              <button
                className="btn-accent flex items-center gap-1.5 text-xs py-2 shadow-lg animate-pulse"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                }}
                onClick={handleRescore}
              >
                <RotateCw size={13} className="animate-spin-slow" />
                Re-Score Resume 🔄
              </button>
            )}

            <button
              className={`btn-ghost flex items-center gap-1.5 text-xs py-2 ${
                showChat ? "border-violet-500/50 bg-violet-500/10 text-violet-300" : ""
              }`}
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare size={14} />
              {showChat ? "Close Copilot" : "AI Refinement"}
            </button>

            <button
              className="btn-accent flex items-center gap-1.5 text-xs py-2"
              onClick={() => setShowDownloadModal(true)}
            >
              <Download size={14} />
              Export PDF
            </button>

            <button
              className="btn-ghost p-2 text-xs"
              onClick={handleNewResume}
              title="Start New Session"
            >
              <ArrowLeft size={15} />
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <AnimatePresence mode="wait">
          {/* Phase 1: Upload */}
          {phase === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <UploadFlow onSubmit={handleUpload} isLoading={false} />
            </motion.div>
          )}

          {/* Phase 2: Analyzing */}
          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              className="space-y-6 max-w-4xl mx-auto py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center space-y-3">
                <div
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
                  style={{
                    background: "rgba(139, 92, 246, 0.1)",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                  }}
                >
                  <RefreshCw size={14} className="animate-spin" style={{ color: "var(--accent-violet)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-accent)" }}>
                    Deep Scanning Resume against Job Description...
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Running parallel ATS parseability checks and AI recruiter simulation
                </p>
              </div>

              <ScoreSkeleton />
              <ResumeSkeleton />
            </motion.div>
          )}

          {/* Phase 3 & 4: Dashboard & Interactive Studio */}
          {(phase === "results" || phase === "chat") && (
            <motion.div
              key="results"
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Scores Header */}
              <ScoreDashboard atsScore={atsScore} aiScore={aiScore} />

              {/* Main Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Center / Primary View */}
                <div className={`${showChat ? "lg:col-span-8" : "lg:col-span-12"} space-y-4 transition-all duration-300`}>
                  {/* View Mode Toolbar */}
                  <div
                    className="flex items-center justify-between p-1.5 rounded-xl"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
                  >
                    <div className="flex gap-1">
                      <button
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === "resume" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                        }`}
                        onClick={() => setActiveTab("resume")}
                      >
                        <Eye size={14} />
                        Annotated Breakdown
                      </button>
                      <button
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === "pdf" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                        }`}
                        onClick={() => setActiveTab("pdf")}
                      >
                        <FileText size={14} />
                        Live PDF Render
                      </button>
                    </div>

                    {versions.length > 0 && (
                      <span className="text-xs px-3 font-mono" style={{ color: "var(--text-muted)" }}>
                        Current: v{currentVersion}
                      </span>
                    )}
                  </div>

                  {/* Main Tab Panels */}
                  <AnimatePresence mode="wait">
                    {activeTab === "resume" ? (
                      <motion.div
                        key="resume"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AnnotatedResume
                          plaintext={plaintext}
                          issues={issues}
                          missingContent={missingContent}
                          onFixIssue={(promptText) => {
                            setShowChat(true);
                            handleSendMessage(promptText);
                          }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pdf"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PDFPreview
                          sessionId={sessionId}
                          version={currentVersion}
                          hasPdf={hasPdf}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Version History Drawer */}
                  <VersionTimeline
                    versions={versions}
                    currentVersion={currentVersion}
                    onRevert={handleRevert}
                  />
                </div>

                {/* Sidebar Copilot */}
                {showChat && (
                  <motion.div
                    className="lg:col-span-4 sticky top-20 h-[calc(100vh-100px)]"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChatPanel
                      messages={messages}
                      verificationFlags={verificationFlags}
                      isStreaming={chatSSE.isStreaming}
                      onSendMessage={handleSendMessage}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Export Modal */}
      {sessionId && (
        <DownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
