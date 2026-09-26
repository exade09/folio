import type { Confidence } from "@/lib/types";

export function StampBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`stamp ${confidence === "live" ? "stamp-live" : "stamp-demo"}`}>
      {confidence === "live" ? "Live" : "Demo"}
    </span>
  );
}
