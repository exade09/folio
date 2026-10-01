"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { CaseFile } from "@/lib/types";
import { readAgentStream } from "@/lib/agent-client";
import { MascotImage, moodLabel, type MascotMood } from "./MascotImage";

interface Entry {
  id: string;
  role: "agent" | "visitor";
  kind: "analysis" | "answer" | "refusal" | "question";
  text: string;
}

const NO_WALLET_LINE = "Connect a wallet on the left to begin.";
const NO_CASE_LINE = "Pick a filed position on the left.";

function readyLine(c: CaseFile) {
  return `Ready on ${c.symbol} · ${c.caseNo}`;
}

export function AgentPanel({ selectedCase }: { selectedCase: CaseFile | null }) {
  const { publicKey } = useWallet();
  const connected = Boolean(publicKey);
  const caseNo = selectedCase?.caseNo ?? null;

  const [mood, setMood] = useState<MascotMood>("idle");
  const [statusLine, setStatusLine] = useState(NO_WALLET_LINE);
  const [threads, setThreads] = useState<Record<string, Entry[]>>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The entry currently being written, kept out of `threads` so a token
  // arriving every few milliseconds re-renders one string rather than
  // rebuilding the whole transcript map.
  const [live, setLive] = useState<{ caseNo: string; kind: Entry["kind"]; text: string } | null>(
    null
  );

  const abortRef = useRef<AbortController | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const analyzedRef = useRef<Set<string>>(new Set());

  const settleToIdle = useCallback((label: string, moodAfter: MascotMood = "idle", delay = 2200) => {
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      setMood(moodAfter);
      setStatusLine(label);
    }, delay);
  }, []);

  /**
   * One path for both the opening analysis and an answer: the endpoints speak
   * the same event stream, so the only difference is where the request goes and
   * which transcript entry the deltas land in.
   */
  const run = useCallback(
    async (target: CaseFile, kind: "analysis" | "answer", question?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (settleRef.current) clearTimeout(settleRef.current);
      setBusy(true);
      setError(null);
      setMood("thinking");
      setStatusLine(kind === "analysis" ? `Opening ${target.symbol}…` : "Reading the file…");
      setLive({ caseNo: target.caseNo, kind, text: "" });

      // Held on one object rather than as separate locals: the stream callback
      // below writes to them, and TypeScript cannot follow assignments made
      // inside a closure when the values are read again afterwards.
      const outcome: { kind: Entry["kind"]; text: string; failed: string | null } = {
        kind,
        text: "",
        failed: null,
      };
      let started = false;

      try {
        const res = await fetch(kind === "analysis" ? "/api/analyze" : "/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          // The case travels with the request so the agent still works where the
          // on-disk store cannot keep it (see lib/case-input.ts).
          body: JSON.stringify({
            caseNo: target.caseNo,
            caseFile: target,
            ...(question ? { question } : {}),
          }),
        });

        await readAgentStream(res, (event) => {
          if (controller.signal.aborted) return;
          switch (event.t) {
            case "delta":
              if (!started) {
                started = true;
                setMood("answering");
                setStatusLine(kind === "analysis" ? "Reading it out." : "Answering from the file.");
              }
              outcome.text += event.v;
              setLive({ caseNo: target.caseNo, kind: outcome.kind, text: outcome.text });
              break;
            case "refusal":
              outcome.kind = "refusal";
              outcome.text = event.v;
              setMood("refusing");
              setStatusLine("Different job, different rules.");
              setLive({ caseNo: target.caseNo, kind: "refusal", text: outcome.text });
              break;
            case "error":
              outcome.failed = event.v;
              break;
            case "done":
              break;
          }
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        outcome.failed = "The line to the analyst dropped. Try again.";
      }

      if (controller.signal.aborted) return;

      if (outcome.text.trim()) {
        setThreads((prev) => ({
          ...prev,
          [target.caseNo]: [
            ...(prev[target.caseNo] || []),
            {
              id: `${target.caseNo}-${Date.now()}-${outcome.kind}`,
              role: "agent",
              kind: outcome.kind,
              text: outcome.text.trim(),
            },
          ],
        }));
      }
      setLive(null);
      setBusy(false);

      if (outcome.failed) {
        setError(outcome.failed);
        setMood("error");
        settleToIdle(readyLine(target));
      } else if (outcome.kind === "refusal") {
        settleToIdle(readyLine(target));
      } else if (kind === "analysis") {
        setMood("filed");
        settleToIdle(readyLine(target), "idle", 1400);
      } else {
        settleToIdle(readyLine(target));
      }
    },
    [settleToIdle]
  );

  // Selecting a position is the thing that starts the agent working: it opens
  // the file and reads it out without being asked. Re-selecting one already
  // read leaves its transcript alone rather than spending another call.
  useEffect(() => {
    // Nothing selected, or a position whose file he has already read: settle
    // the panel and spend no call. The state resets are deferred a microtask
    // for the same reason the rest of this file defers them — a setState run
    // straight from an effect body cascades an extra render.
    if (!selectedCase || analyzedRef.current.has(selectedCase.caseNo)) {
      abortRef.current?.abort();
      const line = selectedCase
        ? readyLine(selectedCase)
        : connected
          ? NO_CASE_LINE
          : NO_WALLET_LINE;
      void Promise.resolve().then(() => {
        setLive(null);
        setBusy(false);
        setMood("idle");
        setStatusLine(line);
        setError(null);
      });
      return;
    }

    analyzedRef.current.add(selectedCase.caseNo);
    void run(selectedCase, "analysis");
  }, [selectedCase, connected, run]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (settleRef.current) clearTimeout(settleRef.current);
    };
  }, []);

  // Follow the text as it is written, but only while the reader is already at
  // the bottom — yanking someone back down while they scroll up to re-read an
  // earlier answer is worse than not following at all.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [live, threads, caseNo]);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || busy || !selectedCase) return;

    setThreads((prev) => ({
      ...prev,
      [selectedCase.caseNo]: [
        ...(prev[selectedCase.caseNo] || []),
        {
          id: `${selectedCase.caseNo}-${Date.now()}-q`,
          role: "visitor",
          kind: "question",
          text: question,
        },
      ],
    }));
    setDraft("");
    void run(selectedCase, "answer", question);
  }

  const entries = caseNo ? threads[caseNo] || [] : [];
  const liveHere = live && live.caseNo === caseNo ? live : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b hairline bg-[var(--wall-blue-soft)] shrink-0">
        <MascotImage mood={mood} size={172} />
        <div className="mt-3 text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
          {moodLabel(mood)}
        </div>
        <div className="font-display text-lg mt-0.5 max-w-xs">{statusLine}</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {!selectedCase && (
          <p className="text-sm text-[var(--ink-mute)] text-center py-8 max-w-xs mx-auto">
            {connected
              ? "Select a position on the left and he opens its file, unprompted. After that you can ask him about it."
              : "Connect a wallet and he opens a file on every position in it."}
          </p>
        )}

        {entries.map((entry) =>
          entry.role === "visitor" ? (
            <p key={entry.id} className="font-bold text-sm">
              &ldquo;{entry.text}&rdquo;
            </p>
          ) : (
            <div key={entry.id} className="space-y-1">
              {entry.kind === "analysis" && (
                <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
                  Opening read
                </div>
              )}
              <p
                className={`text-sm leading-relaxed ${
                  entry.kind === "refusal" ? "text-[var(--tag-red)]" : "text-[var(--ink-soft)]"
                }`}
              >
                {entry.text}
              </p>
            </div>
          )
        )}

        {liveHere && (
          <div className="space-y-1">
            {liveHere.kind === "analysis" && (
              <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
                Opening read
              </div>
            )}
            <p
              className={`text-sm leading-relaxed ${
                liveHere.kind === "refusal" ? "text-[var(--tag-red)]" : "text-[var(--ink-soft)]"
              }`}
            >
              {liveHere.text}
              <span className="type-caret" aria-hidden="true" />
            </p>
          </div>
        )}

        {busy && !liveHere?.text && (
          <p className="text-sm text-[var(--ink-mute)]">
            <span className="sr-only">Working</span>
            <span className="think-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
        )}

        {error && <p className="text-sm text-[var(--tag-red)]">{error}</p>}
      </div>

      <form onSubmit={ask} className="p-5 border-t hairline flex gap-3 shrink-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={selectedCase ? "How concentrated is this one?" : "Select a position first"}
          disabled={!selectedCase || busy}
          className="flex-1 bg-transparent border hairline rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--foreground)] transition-colors disabled:opacity-50"
          maxLength={400}
        />
        <button
          type="submit"
          className="btn btn-primary shrink-0"
          disabled={!selectedCase || busy || !draft.trim()}
        >
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
