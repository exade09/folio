"use client";

import { useState } from "react";

interface Exchange {
  question: string;
  answer: string;
}

export function AskBox({ caseNo }: { caseNo: string }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNo, question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't reach the analyst.");
      } else {
        setExchanges((prev) => [...prev, { question: q, answer: data.answer }]);
        setQuestion("");
      }
    } catch {
      setError("Couldn't reach the analyst.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel folder-tab p-6 md:p-7">
      <div className="flex items-center gap-2 mb-4">
        <span className="stamp stamp-live">Ask</span>
        <h2 className="font-display text-lg">Ask about this file</h2>
      </div>

      {exchanges.length > 0 && (
        <div className="space-y-4 mb-5">
          {exchanges.map((ex, i) => (
            <div key={i} className="ledger-row pt-4 first:pt-0 first:border-0">
              <p className="font-medium text-sm mb-1">&ldquo;{ex.question}&rdquo;</p>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{ex.answer}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={ask} className="flex flex-col sm:flex-row gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How concentrated is this one?"
          className="flex-1 bg-transparent border hairline rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--foreground)] transition-colors"
          maxLength={400}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !question.trim()}>
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
      {error && <p className="text-sm text-[var(--tag-red)] mt-3">{error}</p>}
      <p className="text-xs text-[var(--ink-mute)] mt-4">
        He answers out of this file only, and names the line he took it from. He doesn&apos;t
        say what to buy — different job, different rules.
      </p>
    </div>
  );
}
