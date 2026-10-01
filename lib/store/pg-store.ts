import type { CaseFile } from "../types";
import type { CaseDraft, CaseStore } from "./types";

/** The one thing the store needs from a Postgres driver. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}

// One table, written only by INSERT. Case numbers come from a sequence, so
// any number of instances filing at once can never hand out the same number
// twice, and a trigger rejects UPDATE, DELETE and TRUNCATE outright: a filed
// case cannot be changed or removed through this database, by this app or
// anyone else with the connection string. Retiring the rule is a deliberate
// DROP TRIGGER, not an accident.
//
// The schema is created on first use, idempotently, in a single DO block that
// takes a transaction-scoped advisory lock first — two cold instances racing
// to create it would otherwise collide on CREATE ... IF NOT EXISTS.
const SCHEMA = `
DO $folio$
BEGIN
  PERFORM pg_advisory_xact_lock(724113);

  CREATE SEQUENCE IF NOT EXISTS folio_case_seq;

  CREATE TABLE IF NOT EXISTS folio_cases (
    seq      bigint      PRIMARY KEY,
    case_no  text        NOT NULL UNIQUE,
    filed_at timestamptz NOT NULL DEFAULT now(),
    wallet   text        NOT NULL,
    mint     text        NOT NULL,
    data     jsonb       NOT NULL
  );

  CREATE INDEX IF NOT EXISTS folio_cases_wallet_mint_seq
    ON folio_cases (wallet, mint, seq DESC);

  CREATE OR REPLACE FUNCTION folio_cases_append_only() RETURNS trigger
  LANGUAGE plpgsql AS $fn$
  BEGIN
    RAISE EXCEPTION 'folio_cases is append-only: a filed case is never edited or removed';
  END
  $fn$;

  CREATE OR REPLACE TRIGGER folio_cases_no_rewrite
    BEFORE UPDATE OR DELETE ON folio_cases
    FOR EACH ROW EXECUTE FUNCTION folio_cases_append_only();

  CREATE OR REPLACE TRIGGER folio_cases_no_truncate
    BEFORE TRUNCATE ON folio_cases
    FOR EACH STATEMENT EXECUTE FUNCTION folio_cases_append_only();
END
$folio$;
`;

// The number is formatted in SQL from the sequence value inside the same
// statement that inserts the row. Six digits, zero-padded, and never
// truncated: lpad would cut 1000000 down to 100000, so longer numbers are
// written out whole — the same rule formatCaseNo applies on the file store.
const INSERT = `
WITH n AS (SELECT nextval('folio_case_seq') AS seq)
INSERT INTO folio_cases (seq, case_no, wallet, mint, data)
SELECT n.seq,
       'F-' || CASE WHEN n.seq < 1000000 THEN lpad(n.seq::text, 6, '0') ELSE n.seq::text END,
       $1, $2, $3::jsonb
FROM n
RETURNING case_no, filed_at, data
`;

const COLUMNS = "case_no, filed_at, data";

function toCase(row: Record<string, unknown>): CaseFile {
  const data = (typeof row.data === "string" ? JSON.parse(row.data) : row.data) as CaseDraft;
  return {
    ...data,
    caseNo: String(row.case_no),
    // Drivers disagree on whether timestamptz arrives as a Date or a string.
    filedAt: new Date(row.filed_at as string | Date).toISOString(),
  };
}

export function createPgStore(db: Db): CaseStore {
  let ready: Promise<void> | null = null;

  // Once per instance. A failed attempt is forgotten so the next call retries
  // instead of every later request inheriting the same rejected promise.
  function ensureSchema(): Promise<void> {
    if (!ready) {
      ready = db.query(SCHEMA).then(
        () => undefined,
        (err) => {
          ready = null;
          throw err;
        }
      );
    }
    return ready;
  }

  async function q(text: string, params: unknown[] = []) {
    await ensureSchema();
    return db.query(text, params);
  }

  return {
    async fileCase(draft) {
      const [row] = await q(INSERT, [draft.wallet, draft.mint, JSON.stringify(draft)]);
      return toCase(row);
    },

    async getCase(caseNo) {
      const [row] = await q(`SELECT ${COLUMNS} FROM folio_cases WHERE case_no = $1`, [caseNo]);
      return row ? toCase(row) : null;
    },

    async listLatestCasesForWallet(wallet) {
      const rows = await q(
        `SELECT DISTINCT ON (mint) ${COLUMNS} FROM folio_cases WHERE wallet = $1 ORDER BY mint, seq DESC`,
        [wallet]
      );
      return rows.map(toCase);
    },

    async getCaseHistory(wallet, mint) {
      const rows = await q(
        `SELECT ${COLUMNS} FROM folio_cases WHERE wallet = $1 AND mint = $2 ORDER BY seq DESC`,
        [wallet, mint]
      );
      return rows.map(toCase);
    },

    async listRecentCases(limit = 200) {
      const rows = await q(`SELECT ${COLUMNS} FROM folio_cases ORDER BY seq DESC LIMIT $1`, [
        Math.max(1, Math.min(1000, Math.floor(limit))),
      ]);
      return rows.map(toCase);
    },
  };
}
