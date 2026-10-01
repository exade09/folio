// The front desk and the analyst live in different halves of the page. The
// desk asks him to open a token with a window event rather than a shared
// store: one line to send, one listener to receive, nothing else to wire.
export const OPEN_CA_EVENT = "folio:open-ca";

export function requestOpenCa(mint: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CA_EVENT, { detail: { mint } }));
  // Below the two-column breakpoint the analyst sits under the desk: bring
  // him into view so the click visibly does something.
  if (window.matchMedia("(max-width: 1023px)").matches) {
    document.getElementById("analyst")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
