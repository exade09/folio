"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CaseFile } from "@/lib/types";
import { readAgentStream } from "@/lib/agent-client";
import { play } from "@/lib/sound";
import { dur, ease } from "@/lib/motion";
import { Stamp } from "./motion/Stamp";
import { Magnetic } from "./motion/Magnetic";

interface Exchange {
  id: number;
  question: string;
  chunks: string[];
  refused: boolean;
  done: boolean;
}

/**
 * The ask box on a case's own page. Speaks the same streamed protocol as the
 * analyst panel on the desk (lib/agent-client.ts), and sends the case along
 * so it still answers where the on-disk store could not keep it.
 */
export function AskBox({ caseFile }: { caseFile: CaseFile }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  function patch(id: number, fn: (ex: Exchange) => Exchange) {
    setExchanges((prev) => prev.map((ex) => (ex.id === id ? fn(ex) : ex)));
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;

    const id = ++seq.current;
    setBusy(true);
    setError(null);
    setQuestion("");
    setExchanges((prev) => [...prev, { id, question: q, chunks: [], refused: false, done: false }]);

    // On an object, not a local: the stream callback assigns it, and
    // TypeScript would otherwise still read it as null afterwards.
    const outcome: { failed: string | null } = { failed: null };
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNo: caseFile.caseNo, question: q, caseFile }),
      });
      await readAgentStream(res, (event) => {
        if (event.t === "delta") {
          play("tick");
          patch(id, (ex) => ({ ...ex, chunks: [...ex.chunks, event.v] }));
        }
        else if (event.t === "refusal") patch(id, (ex) => ({ ...ex, chunks: [event.v], refused: true }));
        else if (event.t === "error") outcome.failed = event.v;
      });
    } catch {
      outcome.failed = "Couldn't reach the analyst";
    }

    patch(id, (ex) => ({ ...ex, done: true }));
    if (outcome.failed) {
      setError(outcome.failed);
      play("error");
      setExchanges((prev) => prev.filter((ex) => ex.id !== id || ex.chunks.length > 0));
    }
    setBusy(false);
  }

  return (
    <div className="panel folder-tab p-6 md:p-7">
      <div className="flex items-center gap-3 mb-4">
        <Stamp tone="green" size="sm" rotate={-3}>
          Ask
        </Stamp>
        <h2 className="font-display text-lg">Ask about this file</h2>
      </div>

      <AnimatePresence initial={false}>
        {exchanges.length > 0 && (
          <motion.div
            className="space-y-5 mb-5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: dur.base, ease: ease.settle }}
          >
            {exchanges.map((ex) => (
              <motion.div
                key={ex.id}
                className="border-t hairline pt-4 first:border-0 first:pt-0 relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.base, ease: ease.settle }}
              >
                <p className="font-semibold text-sm mb-1.5">&ldquo;{ex.question}&rdquo;</p>
                <p
                  className={`text-sm leading-relaxed ${ex.refused ? "text-[var(--tag-red)] pr-24" : "text-[var(--ink-soft)]"}`}
                >
                  {ex.chunks.map((c, i) => (
                    <span key={i} className="ink-chunk">
                      {c}
                    </span>
                  ))}
                  {!ex.done && ex.chunks.length > 0 && <span className="type-caret" aria-hidden="true" />}
                  {!ex.done && ex.chunks.length === 0 && (
                    <span className="think-dots" aria-label="Working">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </p>
                {ex.refused && (
                  <div className="absolute right-0 bottom-0">
                    <Stamp tone="red" size="sm" rotate={-6} delay={0.1} sound="stamp">
                      Declined
                    </Stamp>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={ask} className="flex flex-col sm:flex-row gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How concentrated is this one?"
          className="field flex-1 border hairline rounded-full px-4 py-2.5 text-sm outline-none"
          maxLength={400}
        />
        <Magnetic strength={0.2}>
          <button type="submit" className="btn btn-primary btn-shine w-full sm:w-auto" disabled={busy || !question.trim()}>
            {busy ? "Asking…" : "Ask"}
          </button>
        </Magnetic>
      </form>
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-sm text-[var(--tag-red)] mt-3"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="text-xs text-[var(--ink-mute)] mt-4">
        He answers out of this file only, and names the line he took it from. He doesn&apos;t say what to
        buy — different job, different rules
      </p>
    </div>
  );
}
