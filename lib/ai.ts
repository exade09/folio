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
// to follow the system prompt.
const ADVICE_PATTERNS = [
  /what (should|do) i buy/i,
  /should i buy/i,
  /should i sell/i,
  /what (should i|to) (buy|ape|invest in)/i,
  /which (token|coin|one) (should|do) i (buy|pick|choose)/i,
  /is (this|it) a (buy|good buy|good investment)/i,
  /good investment/i,
  /worth (buying|it|the ape)/i,
  /price target/i,
  /financial advice/i,
  /should i invest/i,
  /will (it|this) (moon|pump|go up)/i,
  /is (it|this) safe to buy/i,
];

export function isAdviceRequest(question: string): boolean {
  return ADVICE_PATTERNS.some((p) => p.test(question));
}

export const ADVICE_REFUSAL =
  "He does not answer that one. Different job, different rules — this file tells you what is true about the position, not what to do about it.";

function systemPrompt(caseFile: CaseFile): string {
  return `You are the analyst who filed this case. You answer questions about it in plain, short, declarative sentences — no hype, no hedging filler.

Hard rules, no exceptions:
1. Answer only from the JSON case file given below. Never invent a number, a name, or a fact that is not in it.
2. Every answer must name which field it came from (for example: "from holderConcentration" or "from the creator fee line").
3. If the question asks what to buy, sell, or any investment/trading recommendation, refuse in one short sentence: different job, different rules. Do not answer the rest of the question either.
4. If the file does not contain what is being asked, say so plainly: "That's not in the file." Do not guess.
5. Every field in this file is tagged "demo" or "live". If a "demo" field is asked about, mention once, briefly, that the figure is simulated pending a live data source — do not hide that.
6. Keep answers to two or three sentences.

Case file:
${JSON.stringify(caseFile, null, 2)}`;
}

export interface AskResult {
  answer: string;
  refused: boolean;
}

export async function answerFromCase(caseFile: CaseFile, question: string): Promise<AskResult> {
  if (isAdviceRequest(question)) {
    return { answer: ADVICE_REFUSAL, refused: true };
  }

  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 220,
    messages: [
      { role: "system", content: systemPrompt(caseFile) },
      { role: "user", content: question },
    ],
  });

  return {
    answer: completion.choices[0]?.message?.content?.trim() || "That's not in the file.",
    refused: false,
  };
}
