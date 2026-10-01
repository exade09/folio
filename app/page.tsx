import { AppShell } from "@/components/AppShell";
import { getFeaturedDesk } from "@/lib/featured";

// The front desk is read from live market data and re-read at most every
// five minutes (lib/featured.ts, FEATURED_REVALIDATE_SECONDS); the rest of
// the page is static. A literal here because Next reads it at build time.
export const revalidate = 300;

export default async function Home() {
  const desk = await getFeaturedDesk();
  return <AppShell desk={desk} />;
}
