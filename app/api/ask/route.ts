import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/cases-store";
import { answerFromCase } from "@/lib/ai";

export async function POST(req: NextRequest) {
  let body: { caseNo?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const caseNo = (body.caseNo || "").trim();
  const question = (body.question || "").trim();

  if (!caseNo || !question) {
    return NextResponse.json({ error: "Missing case number or question." }, { status: 400 });
  }
  if (question.length > 400) {
    return NextResponse.json({ error: "Keep it to one question." }, { status: 400 });
  }

  const caseFile = await getCase(caseNo);
  if (!caseFile) {
    return NextResponse.json({ error: "No such file." }, { status: 404 });
  }

  try {
    const result = await answerFromCase(caseFile, question);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "The analyst is unreachable right now (no model configured or the request failed)." },
      { status: 502 }
    );
  }
}
