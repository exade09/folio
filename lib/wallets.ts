import {
  BaseWalletAdapter,
  WalletNotReadyError,
  WalletReadyState,
  type WalletName,
  type SupportedTransactionVersions,
} from "@solana/wallet-adapter-base";
import type { PublicKey } from "@solana/web3.js";

// Which wallets the picker offers, and in what order.
//
// Phantom, Solflare and Backpack are always listed. When one is installed it
// registers itself through Wallet Standard under the same name and takes the
// place of the stand-in below, so the connection is always the wallet's own.
// Solflare is the exception: its adapter can also connect without the
// extension, through Solflare's web wallet, so it is a real adapter here.
// MetaMask also registers for Solana now; Folio leaves it out.

export const FEATURED_WALLETS = ["Phantom", "Solflare", "Backpack"] as const;

const HIDDEN = /metamask/i;
export function isHiddenWallet(name: string): boolean {
  return HIDDEN.test(name);
}

/** Where to send someone who does not have the wallet yet. */
export const INSTALL_URL: Record<string, string> = {
  Phantom: "https://phantom.com/download",
  Backpack: "https://backpack.app/download",
  Solflare: "https://solflare.com/download",
};

/**
 * On a phone a browser extension does not exist; the wallet's own app has a
 * browser with the wallet built in. These links open Folio inside it.
 */
export function openInWalletApp(name: string): string | null {
  if (typeof window === "undefined") return null;
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  switch (name) {
    case "Phantom":
      return `https://phantom.app/ul/browse/${url}?ref=${ref}`;
    case "Backpack":
      return `https://backpack.app/ul/v1/browse/${url}?ref=${ref}`;
    case "Solflare":
      return `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
    default:
      return null;
  }
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * A wallet that is not installed: listed so the visitor can find it, never
 * connected through. Selecting it does nothing; the picker sends the visitor
 * to install it (desktop) or to open Folio in the wallet's app (phone).
 */
class NotInstalledWallet extends BaseWalletAdapter {
  name: WalletName;
  url: string;
  icon: string;
  readonly supportedTransactionVersions: SupportedTransactionVersions = null;

  constructor(name: string, icon: string) {
    super();
    this.name = name as WalletName;
    this.url = INSTALL_URL[name] ?? "";
    this.icon = icon;
  }
  get publicKey(): PublicKey | null {
    return null;
  }
  get connecting() {
    return false;
  }
  get readyState() {
    return typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.NotDetected;
  }
  async connect(): Promise<void> {
    throw new WalletNotReadyError();
  }
  async disconnect(): Promise<void> {}
  async sendTransaction(): Promise<string> {
    throw new WalletNotReadyError();
  }
}

/** A plain lettered tile, used only until the wallet supplies its own icon. */
function letterIcon(letter: string, bg: string, fg = "#ffffff"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="${bg}"/><text x="20" y="27" font-family="Arial, sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="${fg}">${letter}</text></svg>`;
  return `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

export function notInstalledWallets() {
  return [
    new NotInstalledWallet("Phantom", letterIcon("P", "#ab9ff2", "#1c1c1c")),
    new NotInstalledWallet("Backpack", letterIcon("B", "#e33e3f")),
  ];
}
