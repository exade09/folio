import { NextRequest } from "next/server";
import { readTokenFile } from "@/lib/token-file";
import { streamTokenFile } from "@/lib/ai";
import { agentError, ndjsonResponse } from "@/lib/agent-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A file on any token from its contract address alone — no wallet needed.
// The file is re-read on every call, so a follow-up question is answered
// against what the chain and the market say now, not five minutes ago.
export async function POST(req: NextRequest) {
  let body: { mint?: unknown; question?: unknown };
  try {
    body = await req.json();
  } catch {
    return agentError("Malformed request body", 400);
  }

  const mint = typeof body.mint === "string" ? body.mint.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!mint) return agentError("Paste a contract address first", 400);
  if (question.length > 400) return agentError("Keep it to one question", 400);

  const result = await readTokenFile(mint);
  if (!result.ok) return agentError(result.message, result.status);

  return ndjsonResponse(streamTokenFile(result.file, question || undefined));
}
