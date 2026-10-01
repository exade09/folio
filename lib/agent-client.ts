import type { TokenFile } from "./token-file";

export type AgentEvent =
  | { t: "delta"; v: string }
  | { t: "refusal"; v: string }
  | { t: "file"; v: TokenFile }
  | { t: "done" }
  | { t: "error"; v: string };

function isAgentEvent(value: unknown): value is AgentEvent {
  if (!value || typeof value !== "object") return false;
  const t = (value as { t?: unknown }).t;
  return t === "delta" || t === "refusal" || t === "file" || t === "done" || t === "error";
}

/**
 * Reads a newline-delimited JSON agent stream, handing each event to `onEvent`
 * as it lands. A chunk boundary can fall anywhere, including mid-character, so
 * the decoder is kept in streaming mode and the tail of an incomplete line is
 * carried into the next read rather than parsed as-is.
 */
export async function readAgentStream(
  res: Response,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  if (!res.ok || !res.body) {
    let message = "The analyst is unreachable right now";
    try {
      const data = await res.json();
      if (typeof data?.v === "string") message = data.v;
    } catch {
      // A non-JSON error body tells us nothing more than the status already did.
    }
    onEvent({ t: "error", v: message });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (isAgentEvent(parsed)) onEvent(parsed);
      } catch {
        // A line that isn't JSON is not something the agent sent; skip it
        // rather than tearing down a stream that is otherwise fine.
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      const parsed: unknown = JSON.parse(tail);
      if (isAgentEvent(parsed)) onEvent(parsed);
    } catch {
      // Same reasoning as above.
    }
  }
}
