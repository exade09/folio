import { neon } from "@neondatabase/serverless";
import { fileStore } from "./store/file-store";
import { createPgStore } from "./store/pg-store";
import type { CaseStore } from "./store/types";
import { normalizeCase, type CaseFile } from "./types";

// Which store backs the app is decided by the environment alone:
//
//   DATABASE_URL set  → Postgres (Neon over HTTP). This is what production uses;
//                       the Neon integration on Vercel sets the variable.
//   not set           → JSON files under data/cases, for local development.
//
// POSTGRES_URL is accepted as well, since some integrations name it that way.
// The rest of the app imports only the functions below and never learns which
// one it got.

function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || null;
}

let store: CaseStore | null = null;

function getStore(): CaseStore {
  if (!store) {
    const url = databaseUrl();
    if (url) {
      const sql = neon(url);
      store = createPgStore({
        query: (text, params = []) => sql.query(text, params) as Promise<Record<string, unknown>[]>,
      });
    } else {
      store = fileStore;
    }
  }
  return store;
}

// Records are passed through normalizeCase on the way out: files from before
// Folio read live sources (simulated facts, no version) are left in the
// append-only store — nothing is ever deleted — but no longer served.
const current = (list: unknown[]): CaseFile[] =>
  list.map(normalizeCase).filter((c): c is CaseFile => c !== null);

export const fileCase: CaseStore["fileCase"] = (draft) => getStore().fileCase(draft);
export const getCase: CaseStore["getCase"] = async (caseNo) => normalizeCase(await getStore().getCase(caseNo));
export const listLatestCasesForWallet: CaseStore["listLatestCasesForWallet"] = async (wallet) =>
  current(await getStore().listLatestCasesForWallet(wallet));
export const getCaseHistory: CaseStore["getCaseHistory"] = async (wallet, mint) =>
  current(await getStore().getCaseHistory(wallet, mint));
export const listRecentCases: CaseStore["listRecentCases"] = async (limit) =>
  current(await getStore().listRecentCases(limit));
