import { NextRequest } from "next/server";
import { resolveCase } from "@/lib/case-input";
import { streamAnswerFromCase } from "@/lib/ai";
import { agentError, ndjsonResponse } from "@/lib/agent-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { caseNo?: string; question?: string; caseFile?: unknown };
  try {
    body = await req.json();
  } catch {
    return agentError("Malformed request body", 400);
  }

  const caseNo = (body.caseNo || "").trim();
  const question = (body.question || "").trim();

  if (!caseNo || !question) {
    return agentError("Missing case number or question", 400);
  }
  if (question.length > 400) {
    return agentError("Keep it to one question", 400);
  }

  const caseFile = await resolveCase(caseNo, body.caseFile);
  if (!caseFile) {
    return agentError("No such file", 404);
  }

  return ndjsonResponse(streamAnswerFromCase(caseFile, question));
}
