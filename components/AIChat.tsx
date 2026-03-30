"use client";

import { useEffect, useRef, useState } from "react";
import { Dataset, ChatMessage, AIAnalysis } from "@/lib/types";
import { generateSuggestedQuestions } from "@/lib/visualizer";
import {
  Sparkles,
  X,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Code2,
  Lightbulb,
} from "lucide-react";

interface Props {
  datasets: Dataset[];
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

function SqlBlock({ label, query }: { label: string; query: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5 border border-stroke rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-surface2 text-xs text-muted hover:text-fg hover:bg-stroke/20 transition-colors text-left"
      >
        <Code2 className="w-3 h-3 shrink-0 text-accent" />
        <span className="flex-1 font-medium truncate">{label}</span>
        <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <pre className="text-[10px] leading-relaxed bg-surface px-3 py-2 overflow-x-auto font-mono text-fg/80 whitespace-pre-wrap">
          {query}
        </pre>
      )}
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  let parsed: { text?: string; insights?: string[]; sqlQueries?: { label: string; query: string }[]; chartSuggestions?: string[] } | null = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Legacy plain-text message — display as-is
  }

  if (!parsed) {
    return (
      <div className="text-xs leading-relaxed text-fg">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {/* Primary answer */}
      {parsed.text && (
        <p className="leading-relaxed text-fg">{parsed.text}</p>
      )}

      {/* Insights */}
      {parsed.insights && parsed.insights.length > 0 && (
        <ul className="space-y-1">
          {parsed.insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-accent font-bold shrink-0 mt-0.5">·</span>
              <span className="text-fg/90">{ins}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Chart suggestions */}
      {parsed.chartSuggestions && parsed.chartSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {parsed.chartSuggestions.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded-full"
            >
              <Lightbulb className="w-2.5 h-2.5" />
              {s}
            </span>
          ))}
        </div>
      )}

      {/* SQL queries */}
      {parsed.sqlQueries && parsed.sqlQueries.length > 0 && (
        <div className="space-y-0.5">
          {parsed.sqlQueries.map((q, i) => (
            <SqlBlock key={i} label={q.label} query={q.query} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIChat({ datasets }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeDataset = datasets[0] ?? null;
  const suggestions = activeDataset
    ? generateSuggestedQuestions(activeDataset)
    : [];

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, history.length]);

  async function send(question: string) {
    if (!question.trim() || loading || datasets.length === 0) return;
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: question, ts: Date.now() };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput("");
    setLoading(true);

    try {
      const payload = {
        datasets: datasets.map((d) => ({ ...d, rows: [], rawRows: [] })),
        question,
        history: newHistory.slice(-8),
      };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");

      const ai = data as AIAnalysis;

      // Store the full structured response as JSON string so AssistantMessage can parse it
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: JSON.stringify({
          text: ai.text || (ai.insights?.length ? ai.insights[0] : "No insights returned."),
          insights: ai.text ? ai.insights : ai.insights?.slice(1),
          sqlQueries: ai.sqlQueries,
          chartSuggestions: ai.chartSuggestions,
        }),
        ts: Date.now(),
      };
      setHistory((h) => [...h, assistantMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 ${
          open
            ? "bg-surface border border-stroke text-fg"
            : "bg-accent text-accent-fg shadow-accent/30 hover:bg-accent-hover hover:scale-105"
        }`}
      >
        {open ? (
          <>
            <ChevronDown className="w-4 h-4" />
            <span className="text-sm font-medium">Close AI</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Ask AI</span>
            {history.length > 0 && (
              <span className="bg-accent-fg/20 text-accent-fg text-xs px-1.5 rounded-full">
                {history.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[400px] max-h-[580px] bg-surface border border-stroke rounded-2xl shadow-2xl shadow-black/20 flex flex-col animate-slide-down">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stroke shrink-0 bg-surface2/30 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center shadow-sm shadow-accent/30">
                <Sparkles className="w-4 h-4 text-accent-fg" />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">AI Analyst</p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
                  Powered by Gemini 1.5 Flash
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-muted hover:text-danger transition-colors"
                >
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted hover:text-fg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {history.length === 0 && !loading && (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-accent opacity-70" />
                </div>
                <p className="text-xs font-medium text-fg mb-1">Ask anything about your data</p>
                <p className="text-xs text-muted">Trends, outliers, correlations, SQL — just ask</p>
              </div>
            )}

            {history.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 bg-accent rounded-md flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                    <Sparkles className="w-3 h-3 text-accent-fg" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 ${
                    msg.role === "user"
                      ? "bg-accent text-accent-fg rounded-br-sm"
                      : "bg-surface2 text-fg rounded-bl-sm border border-stroke"
                  }`}
                >
                  {msg.role === "user" ? (
                    <span className="text-xs">{msg.content}</span>
                  ) : (
                    <AssistantMessage content={msg.content} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="w-5 h-5 bg-accent rounded-md flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                  <Sparkles className="w-3 h-3 text-accent-fg" />
                </div>
                <div className="bg-surface2 border border-stroke rounded-xl rounded-bl-sm px-3 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 border border-danger/20">
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested questions */}
          {history.length === 0 && suggestions.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0 border-t border-stroke pt-2">
              {suggestions.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-surface2 border border-stroke text-muted hover:border-accent/40 hover:text-fg hover:bg-accent/5 disabled:opacity-50 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 shrink-0">
            <div className="flex items-center gap-2 bg-surface2 border border-stroke rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
                placeholder={datasets.length === 0 ? "Upload a dataset first…" : "Ask about your data…"}
                disabled={datasets.length === 0 || loading}
                className="flex-1 text-xs bg-transparent text-fg placeholder:text-muted focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading || datasets.length === 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-accent-fg disabled:opacity-30 hover:bg-accent-hover transition-all disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
