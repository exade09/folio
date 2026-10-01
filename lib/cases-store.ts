import { neon } from "@neondatabase/serverless";
import { fileStore } from "./store/file-store";
import { createPgStore } from "./store/pg-store";
import type { CaseStore } from "./store/types";

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

export const fileCase: CaseStore["fileCase"] = (draft) => getStore().fileCase(draft);
export const getCase: CaseStore["getCase"] = (caseNo) => getStore().getCase(caseNo);
export const listLatestCasesForWallet: CaseStore["listLatestCasesForWallet"] = (wallet) =>
  getStore().listLatestCasesForWallet(wallet);
export const getCaseHistory: CaseStore["getCaseHistory"] = (wallet, mint) =>
  getStore().getCaseHistory(wallet, mint);
export const listRecentCases: CaseStore["listRecentCases"] = (limit) => getStore().listRecentCases(limit);
