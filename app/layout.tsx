import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Fraunces } from "next/font/google";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/SiteHeader";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { IntroProvider } from "@/components/motion/Intro";
import { Atmosphere } from "@/components/motion/Atmosphere";
import { INTRO_PREPAINT_SCRIPT } from "@/lib/intro-script";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Folio — an analyst for your Solana wallet",
  description:
    "Connect a wallet and Folio opens a file on every position in it: contract age, holder concentration, where the liquidity sits, who collects the creator fee, what the socials have been doing. Every line carries the source you can open.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
      // The pre-paint script below may set data-intro on <html> before React
      // hydrates; that attribute is expected to differ from the server's.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_PREPAINT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <Providers>
            <IntroProvider>
              <Atmosphere />
              <SiteHeader />
              <main className="flex-1 relative">{children}</main>
            </IntroProvider>
          </Providers>
        </MotionProvider>
        <svg className="grain-overlay" aria-hidden="true">
          <filter id="folio-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#folio-grain)" />
        </svg>
      </body>
    </html>
  );
}
