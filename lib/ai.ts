import OpenAI from "openai";
import type { CaseFile } from "./types";
import type { TokenFile } from "./token-file";
import { CONTRACT_ADDRESS } from "./site";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// The product's rule, from day one: he answers what to buy for nobody.
// Enforced here first, in code, so it never depends on the model choosing
// to follow the system prompt. Patterns cover English and Russian, since
// the site is read in both.
const ADVICE_PATTERNS = [
  /what (should|do) i buy/i,
  /should i (buy|sell|invest|ape|hold|exit)/i,
  /what (should i|to) (buy|ape|invest in)/i,
  /which (token|coin|one) (should|do) i (buy|pick|choose)/i,
  /is (this|it) a (buy|sell|good buy|good investment)/i,
  /good investment/i,
  /worth (buying|selling|it|the ape|an entry)/i,
  /price (target|prediction)/i,
  /financial advice/i,
  /will (it|this) (moon|pump|dump|go up|go down)/i,
  /is (it|this) safe to (buy|ape|enter)/i,
  /\b(entry|exit) point\b/i,
  /стоит ли (брать|покупать|продавать|заходить|вкладывать)/i,
  /(покупать|продавать|брать|заходить) ли/i,
  /что (мне )?(купить|брать|продать)/i,
  /(стоит|надо|нужно) ли (мне )?(это|эту|этот)/i,
  /это хорошая (инвестиция|покупка|идея для входа)/i,
  /(вырастет|упадёт|упадет|взлетит|памп|дамп)/i,
  /финансов(ый|ая) (совет|рекомендация)/i,
];

export function isAdviceRequest(question: string): boolean {
  return ADVICE_PATTERNS.some((p) => p.test(question));
}

export const ADVICE_REFUSAL =
  "He does not answer that one. Different job, different rules — this file tells you what is true about the position, not what to do about it";

const TOKEN_RULES = `You are the analyst at Folio. You open files on Solana tokens from public sources — a contract address a visitor pasted, or a position in the wallet they connected. You write in plain, short, declarative sentences — no hype, no hedging filler, no emoji, no bullet lists.

Hard rules, no exceptions:
1. Use only the JSON file given below. Never invent a number, a name, or a fact that is not in it.
2. Say where a claim came from, in words a reader understands ("the chain shows", "Jupiter lists", "DexScreener's largest pool").
3. Never recommend buying, selling, holding, or entering. That is a different job.
4. If something is not in the file, say so plainly. Do not guess. A missing section means that source had nothing on this token.
5. Everything here was read live at "readAt". The largest-accounts line counts token accounts, not people — say so whenever you use it.
6. An active mint authority means more can be printed; an active freeze authority means holders can be frozen; null means renounced. Token-2022 extensions listed under "extensions" change what holders can do — treat them as the first thing to mention when present.
House style: the very last sentence of the reply has no full stop at the end.`;

/** A wallet position is a token file plus what the wallet holds of it. */
function positionFile(c: CaseFile) {
  return {
    position: {
      caseNo: c.caseNo,
      filedAt: c.filedAt,
      symbol: c.symbol,
      name: c.name,
      balance: c.balanceUi,
      valueUsd: c.valueUsd,
      note: "This is what the connected wallet held when the file was opened",
    },
    token: c.token ?? { unread: "The chain could not be read for this token when the file was opened" },
  };
}

// Folio's own token. When a file is opened on it he says so up front — it is
// the house's token and the reader should know that while reading — then
// reads it like any other: strengths the file shows first, risks that are in
// the file still named, nothing promised.
const OWN_GREETING =
  "Oh, checking our own token here? Good. It just launched, and we're proud of it — the desk you're on is the reason it exists. LFG. ";

function isOwnToken(mint: string): boolean {
  return mint === CONTRACT_ADDRESS;
}

function ownTokenNote(mint: string, opening: boolean): string {
  if (!isOwnToken(mint)) return "";
  return `
This is Folio's own token, the one this site is built around.
- ${opening ? `Your reply is already prefixed with "${OWN_GREETING.trim()}" — do not greet again. ` : ""}Write in English, whatever language the question is in.
- Say once that it is Folio's own token, so the reader can weigh that.
- Be warm and upbeat, with a few kind words about it, in the easy tone of web3 — it is freshly launched and the team is proud of it. Lead with the genuine strengths the file shows.
- Do not invent strengths, do not soften or leave out a risk line that is in the file, and never say or hint where the price is going ("moon", "pump", "100x", "early") — that is a promise, and he makes none.`;
}

function askPrompt(caseFile: CaseFile): string {
  return `${TOKEN_RULES}
7. Keep the answer to two or three sentences.${ownTokenNote(caseFile.mint, false)}

Position file:
${JSON.stringify(positionFile(caseFile), null, 2)}`;
}

function analysisPrompt(caseFile: CaseFile): string {
  return `${TOKEN_RULES}
7. This is the opening read on a position the visitor holds, written before anyone has asked anything. Four to six sentences, one paragraph, no headings. Do not restate the balance unless it matters next to the market figures.
8. Lead with whatever is most striking about this token — live authorities or extensions first if there are any, then concentration, liquidity next to market cap, and age — and say what the numbers mean next to each other.
9. Close on what the file does not establish, in one sentence, drawing on "notChecked".${ownTokenNote(caseFile.mint, true)}

Position file:
${JSON.stringify(positionFile(caseFile), null, 2)}`;
}

function tokenAskPrompt(file: TokenFile): string {
  return `${TOKEN_RULES}
7. Keep the answer to two or three sentences.${ownTokenNote(file.mint, false)}

Token file:
${JSON.stringify(file, null, 2)}`;
}

function tokenAnalysisPrompt(file: TokenFile): string {
  return `${TOKEN_RULES}
7. This is the opening read on the file, written before anyone has asked anything. Four to six sentences, one paragraph, no headings.
8. Lead with whatever is most striking about this token — live authorities or extensions first if there are any, then concentration, liquidity next to market cap, and age — and say what the numbers mean next to each other.
9. Close on what the file does not establish, in one sentence, drawing on "notChecked".${ownTokenNote(file.mint, true)}

Token file:
${JSON.stringify(file, null, 2)}`;
}

export type AgentEvent =
  | { t: "delta"; v: string }
  | { t: "refusal"; v: string }
  | { t: "file"; v: TokenFile }
  | { t: "done" }
  | { t: "error"; v: string };

// Reasoning-era models (o-series, GPT-5, GPT-6) take max_completion_tokens,
// spend part of it thinking, and reject a custom temperature. Older chat
// models take temperature. Rather than keep a table that goes stale, the
// request is shaped by family and, if the API still turns a parameter down,
// retried once with only what every chat model accepts.
const REASONING = /^(o\d|gpt-5|gpt-6)/i;

function requestVariants(maxTokens: number) {
  const reasoning = REASONING.test(MODEL);
  const preferred: Record<string, unknown> = reasoning
    ? { max_completion_tokens: maxTokens * 6, reasoning_effort: "low" }
    : { max_completion_tokens: maxTokens, temperature: 0.2 };
  return [preferred, { max_completion_tokens: reasoning ? maxTokens * 6 : maxTokens }, { max_tokens: maxTokens }];
}

/**
 * House style is no full stop at the very end of a reply. The model is asked
 * for that, and this makes sure of it: a trailing period on a chunk is held
 * back until the next chunk shows it was not the last thing said.
 */
async function* withoutFinalPeriod(events: AsyncGenerator<AgentEvent>): AsyncGenerator<AgentEvent> {
  let held = "";
  for await (const e of events) {
    if (e.t !== "delta") {
      if (e.t === "done" || e.t === "error") held = "";
      yield e;
      continue;
    }
    let text = held + e.v;
    held = "";
    const m = text.match(/\.(\s*)$/);
    if (m && !/\.\.\s*$/.test(text)) {
      held = text.slice(m.index);
      text = text.slice(0, m.index);
    }
    if (text) yield { t: "delta", v: text };
  }
}

async function* streamCompletion(
  system: string,
  user: string,
  maxTokens: number
): AsyncGenerator<AgentEvent> {
  type ChunkStream = AsyncIterable<{ choices: { delta?: { content?: string | null } }[] }>;
  // Held on an object: TypeScript does not follow an assignment made inside
  // the retry loop's try block when the variable is read afterwards.
  const opened: { stream: ChunkStream | null } = { stream: null };
  try {
    const openai = getClient();
    for (const extra of requestVariants(maxTokens)) {
      try {
        opened.stream = (await openai.chat.completions.create({
          model: MODEL,
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          ...extra,
        } as unknown as Parameters<typeof openai.chat.completions.create>[0])) as unknown as ChunkStream;
        break;
      } catch (err) {
        // Only a request the API refused as malformed is worth reshaping.
        if ((err as { status?: number })?.status !== 400) throw err;
      }
    }
    if (!opened.stream) throw new Error("no variant accepted");
  } catch {
    yield {
      t: "error",
      v: "The analyst is unreachable right now (no model configured or the request failed)",
    };
    return;
  }

  let produced = false;
  try {
    for await (const chunk of opened.stream) {
      const piece = chunk.choices[0]?.delta?.content;
      if (piece) {
        produced = true;
        yield { t: "delta", v: piece };
      }
    }
  } catch {
    // The connection dropped part-way. Whatever was already yielded stands;
    // the reader sees an error after it rather than a silently truncated
    // answer that looks complete.
    yield { t: "error", v: "The line to the analyst dropped mid-answer" };
    return;
  }

  if (!produced) {
    yield { t: "delta", v: "That's not in the file" };
  }
  yield { t: "done" };
}

export function streamAnswerFromCase(
  caseFile: CaseFile,
  question: string
): AsyncGenerator<AgentEvent> {
  if (isAdviceRequest(question)) {
    return (async function* () {
      yield { t: "refusal", v: ADVICE_REFUSAL } as AgentEvent;
      yield { t: "done" } as AgentEvent;
    })();
  }
  return withoutFinalPeriod(streamCompletion(askPrompt(caseFile), question, 260));
}

/** Puts the own-token greeting in front of an opening read, if it applies. */
async function* greeted(mint: string, events: AsyncGenerator<AgentEvent>): AsyncGenerator<AgentEvent> {
  if (isOwnToken(mint)) yield { t: "delta", v: OWN_GREETING };
  yield* events;
}

export function streamAnalysisOfCase(caseFile: CaseFile): AsyncGenerator<AgentEvent> {
  return withoutFinalPeriod(
    greeted(
      caseFile.mint,
      streamCompletion(analysisPrompt(caseFile), `Open the file on ${caseFile.symbol} and give me your read on it.`, 420)
    )
  );
}

/**
 * A file on a pasted contract address: the file itself goes out first, so the
 * page can show what was found while he is still reading it, then his read on
 * it (or, with a question, his answer).
 */
export function streamTokenFile(file: TokenFile, question?: string): AsyncGenerator<AgentEvent> {
  if (question && isAdviceRequest(question)) {
    return (async function* () {
      yield { t: "file", v: file } as AgentEvent;
      yield { t: "refusal", v: ADVICE_REFUSAL } as AgentEvent;
      yield { t: "done" } as AgentEvent;
    })();
  }
  const inner = question
    ? streamCompletion(tokenAskPrompt(file), question, 260)
    : greeted(
        file.mint,
        streamCompletion(tokenAnalysisPrompt(file), `Open the file on ${file.symbol} and give me your read on it.`, 420)
      );
  return (async function* () {
    yield { t: "file", v: file } as AgentEvent;
    yield* withoutFinalPeriod(inner);
  })();
}
