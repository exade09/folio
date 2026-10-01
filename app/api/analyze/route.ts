import { NextRequest } from "next/server";
import { resolveCase } from "@/lib/case-input";
import { streamAnalysisOfCase } from "@/lib/ai";
import { agentError, ndjsonResponse } from "@/lib/agent-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The opening read on a position, streamed the moment it is selected. Same
// grounding as /api/ask — one case file, nothing else — but nobody had to
// ask a question first.
export async function POST(req: NextRequest) {
  let body: { caseNo?: string; caseFile?: unknown };
  try {
    body = await req.json();
  } catch {
    return agentError("Malformed request body", 400);
  }

  const caseNo = (body.caseNo || "").trim();
  if (!caseNo) {
    return agentError("Missing case number", 400);
  }

  const caseFile = await resolveCase(caseNo, body.caseFile);
  if (!caseFile) {
    return agentError("No such file", 404);
  }

  return ndjsonResponse(streamAnalysisOfCase(caseFile));
}
