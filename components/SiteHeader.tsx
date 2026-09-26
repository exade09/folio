import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

export function SiteHeader() {
  return (
    <header className="border-b hairline">
      <div className="w-full h-14 px-5 flex items-center justify-between gap-4">
        <Link href="/" className="font-display text-base tracking-tight shrink-0">
          Folio
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
