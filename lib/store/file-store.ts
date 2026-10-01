import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CaseFile, WalletCaseIndexEntry } from "../types";
import { formatCaseNo, type CaseDraft, type CaseStore } from "./types";

// Plain JSON files on disk — the store for local development when no
// DATABASE_URL is set. Append-only by construction: a case file is written
// once under a fresh number and never opened for writing again.
//
// On Vercel the deployment directory is read-only, so it falls back to the
// instance's temp dir. That keeps /api/scan from failing outright, but those
// files are per-instance and short-lived; set DATABASE_URL for anything real.

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
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function walletIndexFile(wallet: string) {
  // The wallet arrives from a query string on /briefing; anything that is not
  // a base58 address never becomes part of a path.
  if (!BASE58_ADDRESS.test(wallet)) return null;
  return path.join(WALLETS_DIR, `${wallet}.json`);
}

// Every filing is a read-modify-write of the counter and the indexes. /api/scan
// files a wallet's positions in parallel, and without this queue two filings
// could read the same counter, take the same number, and the second would
// overwrite the first — the one thing a filed case must never suffer. Filings
// in this process run one at a time, in arrival order.
let queue: Promise<unknown> = Promise.resolve();
function serially<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function fileOne(draft: CaseDraft): Promise<CaseFile> {
  await ensureDirs();
  const counter = await readJson<{ n: number }>(COUNTER_FILE, { n: 0 });
  const n = counter.n + 1;
  await writeJson(COUNTER_FILE, { n });

  const caseFile: CaseFile = { ...draft, caseNo: formatCaseNo(n), filedAt: new Date().toISOString() };
  // "wx": refuse to write if the file already exists. A stale counter (copied
  // data, a hand edit) then fails loudly instead of replacing a filed case.
  await fs.writeFile(path.join(ROOT, `${caseFile.caseNo}.json`), JSON.stringify(caseFile, null, 2), {
    encoding: "utf-8",
    flag: "wx",
  });

  const indexFile = walletIndexFile(caseFile.wallet);
  if (!indexFile) throw new Error("Refusing to file a case for a malformed wallet address.");
  const index = await readJson<Record<string, WalletCaseIndexEntry>>(indexFile, {});
  const existing = index[caseFile.mint];
  index[caseFile.mint] = {
    mint: caseFile.mint,
    latestCaseNo: caseFile.caseNo,
    history: existing ? [...existing.history, caseFile.caseNo] : [caseFile.caseNo],
  };
  await writeJson(indexFile, index);

  const recent = await readJson<{ caseNo: string; filedAt: string }[]>(RECENT_FILE, []);
  recent.unshift({ caseNo: caseFile.caseNo, filedAt: caseFile.filedAt });
  await writeJson(RECENT_FILE, recent.slice(0, RECENT_CAP));

  return caseFile;
}

async function getCase(caseNo: string): Promise<CaseFile | null> {
  // Case numbers come from URLs; refuse anything that is not one before it
  // can become a path.
  if (!/^F-\d{6,}$/.test(caseNo)) return null;
  return readJson<CaseFile | null>(path.join(ROOT, `${caseNo}.json`), null);
}

async function getWalletIndex(wallet: string): Promise<Record<string, WalletCaseIndexEntry>> {
  const file = walletIndexFile(wallet);
  return file ? readJson<Record<string, WalletCaseIndexEntry>>(file, {}) : {};
}

function present(cases: (CaseFile | null)[]): CaseFile[] {
  return cases.filter((c): c is CaseFile => c !== null);
}

export const fileStore: CaseStore = {
  fileCase: (draft) => serially(() => fileOne(draft)),

  getCase,

  async listLatestCasesForWallet(wallet) {
    const index = await getWalletIndex(wallet);
    return present(await Promise.all(Object.values(index).map((e) => getCase(e.latestCaseNo))));
  },

  async getCaseHistory(wallet, mint) {
    const entry = (await getWalletIndex(wallet))[mint];
    if (!entry) return [];
    return present(await Promise.all(entry.history.map(getCase))).reverse();
  },

  async listRecentCases(limit = 200) {
    await ensureDirs();
    const recent = await readJson<{ caseNo: string }[]>(RECENT_FILE, []);
    return present(await Promise.all(recent.slice(0, limit).map((r) => getCase(r.caseNo))));
  },
};
