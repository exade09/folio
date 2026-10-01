export function StampBadge({ live }: { live: boolean }) {
  return <span className={`stamp ${live ? "stamp-live" : "stamp-demo"}`}>{live ? "Live" : "Unread"}</span>;
}
