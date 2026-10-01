// Public facts about Folio itself, in one place.

/**
 * The token's contract address, shown in the header and copied on click.
 * NEXT_PUBLIC_FOLIO_CA overrides it without a code change (set it in Vercel
 * and redeploy); otherwise this value is used.
 */
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FOLIO_CA?.trim() || "7ZicDFckE7thihzjc4RVAmo56BYkbgKpYk28DYxepump";

export const X_URL = "https://x.com/folioclerk";
export const X_HANDLE = "@folioclerk";

/** The model the analyst runs on, as the docs name it. Keep OPENAI_MODEL in step. */
export const AGENT_MODEL = "GPT-6 ASTRA";
