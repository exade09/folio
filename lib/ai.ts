import OpenAI from "openai";
import type { CaseFile } from "./types";

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
  "He does not answer that one. Different job, different rules — this file tells you what is true about the position, not what to do about it.";

const HOUSE_RULES = `You are the analyst who filed this case. You write in plain, short, declarative sentences — no hype, no hedging filler, no emoji, no bullet lists.

Hard rules, no exceptions:
1. Use only the JSON case file given below. Never invent a number, a name, or a fact that is not in it.
2. Name the field a claim came from, in words a reader understands ("the holder line", "the liquidity line").
3. Never recommend buying, selling, holding, or entering. That is a different job.
4. If something is not in the file, say so plainly. Do not guess.
5. Every field carries a "demo" or "live" tag. Say once, briefly, when what you are reporting is simulated pending a live data source. Never present a demo figure as live.`;

function askPrompt(caseFile: CaseFile): string {
  return `${HOUSE_RULES}
6. Keep the answer to two or three sentences.

Case file:
${JSON.stringify(caseFile, null, 2)}`;
}

function analysisPrompt(caseFile: CaseFile): string {
  return `${HOUSE_RULES}
6. This is the opening read on the file, written before anyone has asked anything. Four to six sentences, one paragraph, no headings.
7. Walk the five facts in the order they matter for this particular position rather than the order they appear: lead with whatever is most striking about it, then the rest. Say what the numbers mean next to each other — an old contract with concentrated holders reads differently from a new one with the same spread.
8. Close on what the file does not establish, in one sentence.

Case file:
${JSON.stringify(caseFile, null, 2)}`;
}

export type AgentEvent =
  | { t: "delta"; v: string }
  | { t: "refusal"; v: string }
  | { t: "done" }
  | { t: "error"; v: string };

async function* streamCompletion(
  system: string,
  user: string,
  maxTokens: number
): AsyncGenerator<AgentEvent> {
  let stream;
  try {
    const openai = getClient();
    stream = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
  } catch {
    yield {
      t: "error",
      v: "The analyst is unreachable right now (no model configured or the request failed).",
    };
    return;
  }

  let produced = false;
  try {
    for await (const chunk of stream) {
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
    yield { t: "error", v: "The line to the analyst dropped mid-answer." };
    return;
  }

  if (!produced) {
    yield { t: "delta", v: "That's not in the file." };
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
  return streamCompletion(askPrompt(caseFile), question, 260);
}

export function streamAnalysisOfCase(caseFile: CaseFile): AsyncGenerator<AgentEvent> {
  return streamCompletion(
    analysisPrompt(caseFile),
    `Open the file on ${caseFile.symbol} and give me your read on it.`,
    420
  );
}
