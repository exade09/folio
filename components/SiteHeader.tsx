import Link from "next/link";
import { FolioMark } from "./FolioMark";
import { ConnectButton } from "./ConnectButton";

export function SiteHeader() {
  return (
    <header className="border-b hairline">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <FolioMark />
          <span className="font-display text-lg tracking-tight">Folio</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-[var(--ink-mute)]">
          <Link href="/briefing" className="hover:text-[var(--foreground)] transition-colors">
            This morning
          </Link>
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
