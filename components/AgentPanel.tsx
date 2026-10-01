"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { CaseFile } from "@/lib/types";
import { readAgentStream } from "@/lib/agent-client";
import { play } from "@/lib/sound";
import { dur, ease, spring } from "@/lib/motion";
import { MascotImage, moodLabel, type MascotMood } from "./MascotImage";
import { Stamp } from "./motion/Stamp";
import { Scramble } from "./motion/Scramble";
import { Magnetic } from "./motion/Magnetic";

interface Entry {
  id: string;
  role: "agent" | "visitor";
  kind: "analysis" | "answer" | "refusal" | "question";
  text: string;
  /** Written during this visit to the file. Cleared on leaving it, so coming
   *  back shows the transcript — stamps included — in place, not replayed. */
  fresh: boolean;
}

function settle(threads: Record<string, Entry[]>): Record<string, Entry[]> {
  let changed = false;
  const next: Record<string, Entry[]> = {};
  for (const [k, list] of Object.entries(threads)) {
    next[k] = list.map((e) => {
      if (!e.fresh) return e;
      changed = true;
      return { ...e, fresh: false };
    });
  }
  return changed ? next : threads;
}

interface LiveEntry {
  /** The id the finished entry will carry. Sharing it keeps the card mounted
   *  from first token to final text, so nothing re-enters when it completes. */
  id: string;
  caseNo: string;
  kind: Entry["kind"];
  /** Kept as the pieces the model sent, so each can ink in on its own. */
  chunks: string[];
}

const NO_WALLET_LINE = "Connect a wallet on the left to begin.";
const NO_CASE_LINE = "Pick a filed position on the left.";

// The colour the room takes on around him for each mood. Hex rather than the
// CSS variables because the glow's colour is interpolated by motion, which
// cannot tween between two var() references.
const MOOD_COLOR: Record<MascotMood, string> = {
  idle: "#77839f",
  thinking: "#b9924f",
  answering: "#4f8f63",
  refusing: "#b8433a",
  error: "#b8433a",
  filed: "#b8433a",
};

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
  const [live, setLive] = useState<LiveEntry | null>(null);

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
      const entryId = `${target.caseNo}-${Date.now()}-${kind}`;
      setLive({ id: entryId, caseNo: target.caseNo, kind, chunks: [] });

      // Held on one object: the stream callback writes to it, and TypeScript
      // cannot follow assignments made inside a closure when they are read
      // again afterwards.
      const outcome: { kind: Entry["kind"]; chunks: string[]; failed: string | null } = {
        kind,
        chunks: [],
        failed: null,
      };
      let started = false;

      try {
        const res = await fetch(kind === "analysis" ? "/api/analyze" : "/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
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
              outcome.chunks = [...outcome.chunks, event.v];
              play("tick");
              setLive({ id: entryId, caseNo: target.caseNo, kind: outcome.kind, chunks: outcome.chunks });
              break;
            case "refusal":
              outcome.kind = "refusal";
              outcome.chunks = [event.v];
              setMood("refusing");
              setStatusLine("Different job, different rules.");
              setLive({ id: entryId, caseNo: target.caseNo, kind: "refusal", chunks: outcome.chunks });
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

      const text = outcome.chunks.join("").trim();
      if (text) {
        setThreads((prev) => ({
          ...prev,
          [target.caseNo]: [
            ...(prev[target.caseNo] || []),
            {
              id: entryId,
              role: "agent",
              kind: outcome.kind,
              text,
              fresh: true,
            },
          ],
        }));
      }
      setLive(null);
      setBusy(false);

      if (outcome.failed) {
        setError(outcome.failed);
        setMood("error");
        play("error");
        settleToIdle(readyLine(target));
      } else if (outcome.kind === "refusal") {
        settleToIdle(readyLine(target));
      } else if (kind === "analysis") {
        setMood("filed");
        setStatusLine(`Filed · ${target.caseNo}`);
        settleToIdle(readyLine(target), "idle", 1600);
      } else {
        settleToIdle(readyLine(target));
      }
    },
    [settleToIdle]
  );

  // Selecting a position sets him working: he opens that file and reads it out
  // without being asked. Re-selecting one already read spends no second call.
  useEffect(() => {
    // Whatever opens next, everything already written is no longer new.
    void Promise.resolve().then(() => setThreads(settle));

    if (!selectedCase || analyzedRef.current.has(selectedCase.caseNo)) {
      abortRef.current?.abort();
      const line = selectedCase ? readyLine(selectedCase) : connected ? NO_CASE_LINE : NO_WALLET_LINE;
      // Deferred a microtask: a setState straight from an effect body cascades
      // an extra render.
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

  // Follow the writing, but only while the reader is already at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
          fresh: true,
        },
      ],
    }));
    setDraft("");
    void run(selectedCase, "answer", question);
  }

  const entries = caseNo ? threads[caseNo] || [] : [];
  const liveHere = live && live.caseNo === caseNo ? live : null;
  const color = MOOD_COLOR[mood];

  return (
    <div className="flex flex-col h-full">
      {/* ——— the analyst ——— */}
      <div className="relative px-6 pt-5 pb-6 border-b hairline shrink-0 overflow-hidden bg-[color-mix(in_srgb,var(--wall-blue-soft)_70%,transparent)]">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)]">
          <span className="flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Analyst · on duty
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={caseNo ?? "none"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: dur.short, ease: ease.settle }}
            >
              {caseNo ? <Scramble text={`${selectedCase?.symbol} · ${caseNo}`} duration={520} /> : "no file open"}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center text-center mt-4">
          <div className="relative" style={{ color }}>
            <motion.div
              aria-hidden="true"
              className="absolute -inset-10 rounded-full blur-2xl"
              animate={{
                backgroundColor: color,
                opacity: mood === "idle" ? 0.16 : mood === "thinking" ? 0.3 : 0.38,
                scale: mood === "answering" ? [1, 1.08, 1] : mood === "filed" ? [0.9, 1.25, 1] : 1,
              }}
              transition={{
                backgroundColor: { duration: dur.long },
                opacity: { duration: dur.long },
                scale:
                  mood === "answering"
                    ? { duration: 1.6, repeat: Infinity, ease: ease.sway }
                    : { duration: dur.long, ease: ease.settle },
              }}
            />
            <AnimatePresence>
              {mood === "thinking" && (
                <motion.span
                  key="ring"
                  className="mood-ring mood-ring-spin"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 0.5, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.08 }}
                  transition={{ duration: dur.short }}
                />
              )}
              {mood === "answering" && (
                <motion.span
                  key="pulse"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="mood-pulse" />
                  <span className="mood-pulse" />
                </motion.span>
              )}
              {(mood === "refusing" || mood === "error" || mood === "filed") && (
                <motion.span
                  key={`flash-${mood}`}
                  className="absolute inset-0 rounded-[30px] border-2 border-current"
                  initial={{ opacity: 0.9, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: ease.settle }}
                />
              )}
            </AnimatePresence>
            <div className="relative">
              <MascotImage mood={mood} size={164} />
            </div>
          </div>

          <div className="mt-4 h-4 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mood}
                className="text-[11px] font-mono uppercase tracking-[0.2em]"
                style={{ color }}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: dur.short, ease: ease.settle }}
              >
                {moodLabel(mood)}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="h-7 mt-0.5 overflow-hidden max-w-sm">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={statusLine}
                className="font-display text-lg"
                initial={{ y: 22, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -22, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: dur.base, ease: ease.glide }}
              >
                {statusLine}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ——— the transcript ——— */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <AnimatePresence mode="wait" initial={false}>
          {!selectedCase ? (
            <EmptyTranscript key="empty" connected={connected} />
          ) : (
            <motion.div
              key={caseNo}
              className="space-y-4"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18, transition: { duration: dur.micro } }}
              transition={{ duration: dur.base, ease: ease.settle }}
            >
              {/* One keyed list, live card last: when the stream finishes, the
                  stored entry takes the live card's key and slot, so React
                  keeps the same element and nothing re-enters. */}
              {[
                ...entries.map((entry) =>
                  entry.role === "visitor" ? (
                    <QuestionSlip key={entry.id} text={entry.text} animate={entry.fresh} />
                  ) : (
                    <AgentCard key={entry.id} kind={entry.kind} caseNo={caseNo!} animate={entry.fresh}>
                      {entry.text}
                    </AgentCard>
                  )
                ),
                liveHere ? (
                  <AgentCard key={liveHere.id} kind={liveHere.kind} caseNo={caseNo!} animate writing>
                    {liveHere.chunks.map((c, i) => (
                      <span key={i} className="ink-chunk">
                        {c}
                      </span>
                    ))}
                    {liveHere.chunks.length > 0 && <span className="type-caret" aria-hidden="true" />}
                    {liveHere.chunks.length === 0 && (
                      <span className="think-dots" aria-label="Working">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </AgentCard>
                ) : null,
              ]}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              key={error}
              className="text-sm text-[var(--tag-red)] flex items-center gap-2"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: [0, -6, 5, -3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              <span className="live-dot" data-tone="red" aria-hidden="true" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ——— the question box ——— */}
      <form onSubmit={ask} className="p-5 border-t hairline flex gap-3 shrink-0 relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={selectedCase ? "How concentrated is this one?" : "Select a position first"}
          disabled={!selectedCase || busy}
          className="field flex-1 border hairline rounded-full px-4 py-2.5 text-sm outline-none disabled:opacity-50"
          maxLength={400}
        />
        <Magnetic strength={0.22}>
          <button
            type="submit"
            className="btn btn-primary btn-shine shrink-0 min-w-[5.5rem]"
            disabled={!selectedCase || busy || !draft.trim()}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={busy ? "busy" : "idle"}
                className="inline-flex items-center gap-1.5"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: dur.micro }}
              >
                {busy ? (
                  <span className="think-dots think-dots-light" aria-label="Working">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <>
                    Ask
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2 6h8M6.5 2.5 10 6 6.5 9.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </Magnetic>
      </form>
    </div>
  );
}

function AgentCard({
  kind,
  caseNo,
  animate,
  writing = false,
  children,
}: {
  kind: Entry["kind"];
  caseNo: string;
  animate: boolean;
  writing?: boolean;
  children: React.ReactNode;
}) {
  const refusal = kind === "refusal";
  const analysis = kind === "analysis";

  return (
    <motion.div
      className={`relative ${analysis ? "panel folder-tab px-5 pt-4 pb-5" : "pl-4 border-l-2"} `}
      style={!analysis ? { borderColor: refusal ? "var(--tag-red)" : "var(--hairline-strong)" } : undefined}
      initial={animate ? { opacity: 0, y: 14, filter: "blur(6px)" } : false}
      animate={
        refusal && animate
          ? { opacity: 1, y: 0, filter: "blur(0px)", x: [0, -5, 4, -2, 0] }
          : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      transition={{ duration: dur.base, ease: ease.settle, x: { duration: 0.4, delay: 0.25 } }}
    >
      {analysis && (
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-mute)] mb-2">
          <span>Opening read</span>
          <span>{caseNo}</span>
        </div>
      )}
      <p
        className={`text-sm leading-relaxed ${refusal ? "text-[var(--tag-red)] pr-24" : "text-[var(--ink-soft)]"} ${analysis ? "text-[15px] text-[var(--ink)]" : ""}`}
      >
        {children}
      </p>

      {analysis && !writing && (
        <div className="absolute -right-2 -bottom-3">
          <Stamp tone="red" size="md" rotate={-10} instant={!animate} delay={0.05}>
            Filed
          </Stamp>
        </div>
      )}
      {refusal && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Stamp tone="red" size="sm" rotate={-6} instant={!animate} delay={0.1} sound="stamp">
            Declined
          </Stamp>
        </div>
      )}
    </motion.div>
  );
}

function QuestionSlip({ text, animate }: { text: string; animate: boolean }) {
  return (
    <motion.div
      className="flex justify-end"
      initial={animate ? { opacity: 0, x: 40, rotate: 2 } : false}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={spring.layout}
    >
      <p className="max-w-[85%] text-sm font-semibold bg-[var(--paper-card)] border hairline rounded-2xl rounded-br-md px-4 py-2.5 shadow-[var(--shadow-file)]">
        {text}
      </p>
    </motion.div>
  );
}

function EmptyTranscript({ connected }: { connected: boolean }) {
  return (
    <motion.div
      className="flex flex-col items-center text-center py-10 gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: dur.micro } }}
      transition={{ duration: dur.base, ease: ease.settle }}
    >
      <motion.svg
        width="44"
        height="20"
        viewBox="0 0 44 20"
        className="text-[var(--ink-mute)] hidden lg:block"
        animate={{ x: [0, -8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: ease.sway }}
        aria-hidden="true"
      >
        <path d="M42 10H4M11 3 3 10l8 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
      <p className="text-sm text-[var(--ink-mute)] max-w-xs leading-relaxed">
        {connected
          ? "Select a position on the left and he opens its file, unprompted. After that you can ask him about it."
          : "Connect a wallet and he opens a file on every position in it."}
      </p>
    </motion.div>
  );
}
