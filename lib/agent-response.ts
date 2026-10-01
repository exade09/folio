import type { AgentEvent } from "./ai";

// Newline-delimited JSON rather than SSE: the client reaches these routes with
// a POST, which EventSource cannot do, so there is nothing to gain from the
// SSE framing and one less format to get wrong.
export function ndjsonResponse(events: AsyncGenerator<AgentEvent>): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
        if (value.t === "done" || value.t === "error") {
          controller.close();
        }
      } catch {
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ t: "error", v: "The analyst stopped mid-file." })}\n`)
        );
        controller.close();
      }
    },
    async cancel() {
      // The reader went away (tab closed, another position selected). Let the
      // generator unwind so the upstream request is not left hanging.
      await events.return?.(undefined as never);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export function agentError(message: string, status: number): Response {
  return Response.json({ t: "error", v: message }, { status });
}
