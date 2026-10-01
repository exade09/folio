import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CaseFile, WalletCaseIndexEntry } from "./types";

// A file-based, append-only store. A case, once written, is never edited or
// deleted — re-scanning a position files a new case number and the old one
// stays exactly as it was, aged-badly readings included. This is a local
// dev-grade store (plain JSON on disk); swap it for a real database before
// deploying anywhere with an ephemeral filesystem, the interface below is
// the only thing that would need to move.

// On Vercel the deployment directory is read-only; the only writable place is
// the instance's temp dir. Filing there keeps /api/scan working, with the
// catch that it is per-instance and short-lived: a case page served by a
// different instance, or after a cold start, will not find the file. The
// analyst panel does not depend on it (the client sends the case along — see
// lib/case-input.ts). A real database is still the fix; this keeps the
// product usable until then.
const ROOT = process.env.VERCEL
  ? path.join(os.tmpdir(), "folio-cases")
  : path.join(process.cwd(), "data", "cases");
const WALLETS_DIR = path.join(ROOT, "_wallets");
const COUNTER_FILE = path.join(ROOT, "_counter.json");
const RECENT_FILE = path.join(ROOT, "_recent.json");
const RECENT_CAP = 500;

async function ensureDirs() {
  await fs.mkdir(WALLETS_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

async function nextCaseNo(): Promise<string> {
  await ensureDirs();
  const counter = await readJson<{ n: number }>(COUNTER_FILE, { n: 0 });
  const n = counter.n + 1;
  await writeJson(COUNTER_FILE, { n });
  return `F-${String(n).padStart(6, "0")}`;
}

function walletIndexFile(wallet: string) {
  return path.join(WALLETS_DIR, `${wallet}.json`);
}

export async function fileCase(
  draft: Omit<CaseFile, "caseNo" | "filedAt">
): Promise<CaseFile> {
  await ensureDirs();
  const caseNo = await nextCaseNo();
  const caseFile: CaseFile = {
    ...draft,
    caseNo,
    filedAt: new Date().toISOString(),
  };

  await writeJson(path.join(ROOT, `${caseNo}.json`), caseFile);

  const indexFile = walletIndexFile(caseFile.wallet);
  const index = await readJson<Record<string, WalletCaseIndexEntry>>(indexFile, {});
  const existing = index[caseFile.mint];
  index[caseFile.mint] = {
    mint: caseFile.mint,
    latestCaseNo: caseNo,
    history: existing ? [...existing.history, caseNo] : [caseNo],
  };
  await writeJson(indexFile, index);

  const recent = await readJson<{ caseNo: string; filedAt: string }[]>(RECENT_FILE, []);
  recent.unshift({ caseNo, filedAt: caseFile.filedAt });
  await writeJson(RECENT_FILE, recent.slice(0, RECENT_CAP));

  return caseFile;
}

export async function getCase(caseNo: string): Promise<CaseFile | null> {
  return readJson<CaseFile | null>(path.join(ROOT, `${caseNo}.json`), null);
}

export async function getWalletIndex(wallet: string): Promise<Record<string, WalletCaseIndexEntry>> {
  return readJson<Record<string, WalletCaseIndexEntry>>(walletIndexFile(wallet), {});
}

export async function listLatestCasesForWallet(wallet: string): Promise<CaseFile[]> {
  const index = await getWalletIndex(wallet);
  const cases = await Promise.all(
    Object.values(index).map((entry) => getCase(entry.latestCaseNo))
  );
  return cases.filter((c): c is CaseFile => c !== null);
}

export async function getCaseHistory(wallet: string, mint: string): Promise<CaseFile[]> {
  const index = await getWalletIndex(wallet);
  const entry = index[mint];
  if (!entry) return [];
  const cases = await Promise.all(entry.history.map(getCase));
  return cases.filter((c): c is CaseFile => c !== null).reverse();
}

export async function listRecentCases(limit = 200): Promise<CaseFile[]> {
  await ensureDirs();
  const recent = await readJson<{ caseNo: string; filedAt: string }[]>(RECENT_FILE, []);
  const cases = await Promise.all(recent.slice(0, limit).map((r) => getCase(r.caseNo)));
  return cases.filter((c): c is CaseFile => c !== null);
}
