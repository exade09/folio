"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseFile } from "@/lib/types";
import { FolioCat, type MascotMood, moodLabel } from "./FolioCat";

interface Exchange {
  question: string;
  answer: string;
  refused: boolean;
}

export function AgentPanel({ selectedCase }: { selectedCase: CaseFile | null }) {
  const [mood, setMood] = useState<MascotMood>("idle");
  const [statusLine, setStatusLine] = useState("Pick a file on the left, then ask him about it.");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangesByCase, setExchangesByCase] = useState<Record<string, Exchange[]>>({});
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const caseNo = selectedCase?.caseNo ?? null;
  const symbol = selectedCase?.symbol ?? null;
  const exchanges = useMemo(() => (caseNo ? exchangesByCase[caseNo] || [] : []), [caseNo, exchangesByCase]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setStatusLine(
        symbol && caseNo ? `Ready on ${symbol} · ${caseNo}` : "Pick a file on the left, then ask him about it."
      );
      setMood("idle");
      setError(null);
    });
  }, [caseNo, symbol]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  function settleToIdle(label: string, delay = 2400) {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      setMood("idle");
      setStatusLine(label);
    }, delay);
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy || !caseNo || !selectedCase) return;

    setBusy(true);
    setError(null);
    setMood("thinking");
    setStatusLine("Reading the file…");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNo, question: q }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMood("error");
        setError(data.error || "Couldn't reach the analyst.");
        settleToIdle(`Ready on ${selectedCase.symbol} · ${selectedCase.caseNo}`);
      } else {
        setExchangesByCase((prev) => ({
          ...prev,
          [caseNo]: [...(prev[caseNo] || []), { question: q, answer: data.answer, refused: data.refused }],
        }));
        setQuestion("");
        if (data.refused) {
          setMood("refusing");
          setStatusLine("Different job, different rules.");
        } else {
          setMood("answering");
          setStatusLine("Answered from the file.");
        }
        settleToIdle(`Ready on ${selectedCase.symbol} · ${selectedCase.caseNo}`);
      }
    } catch {
      setMood("error");
      setError("The scan didn't reach the server. Try again.");
      settleToIdle(`Ready on ${selectedCase.symbol} · ${selectedCase.caseNo}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel folder-tab overflow-hidden flex flex-col h-full">
      <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center border-b hairline bg-[var(--wall-blue-soft)]">
        <FolioCat mood={mood} size={168} />
        <div className="mt-2 text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
          {moodLabel(mood)}
        </div>
        <div className="font-display text-lg mt-0.5 max-w-xs">{statusLine}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {!selectedCase && (
          <p className="text-sm text-[var(--ink-mute)] text-center py-6">
            Select a filed position on the left. He only answers questions about the file
            that&apos;s open.
          </p>
        )}

        {selectedCase &&
          exchanges.map((ex, i) => (
            <div key={i} className="border-t hairline pt-4 first:border-0 first:pt-0">
              <p className="font-bold text-sm mb-1">&ldquo;{ex.question}&rdquo;</p>
              <p
                className={`text-sm leading-relaxed ${ex.refused ? "text-[var(--tag-red)]" : "text-[var(--ink-soft)]"}`}
              >
                {ex.answer}
              </p>
            </div>
          ))}

        {error && <p className="text-sm text-[var(--tag-red)]">{error}</p>}
      </div>

      <form onSubmit={ask} className="p-5 border-t hairline flex gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={selectedCase ? "How concentrated is this one?" : "Select a file first"}
          disabled={!selectedCase || busy}
          className="flex-1 bg-transparent border hairline rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--foreground)] transition-colors disabled:opacity-50"
          maxLength={400}
        />
        <button
          type="submit"
          className="btn btn-primary shrink-0"
          disabled={!selectedCase || busy || !question.trim()}
        >
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
