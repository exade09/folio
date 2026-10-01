// Whether the visitor has just asked to connect — clicked "Connect wallet" and
// then picked a wallet from the modal — as opposed to the page loading with a
// wallet remembered from last time.
//
// The distinction decides how the provider connects (see app/providers.tsx):
// a visitor who just chose a wallet gets a full connect, which may show the
// wallet's approval prompt; a page load gets only a silent reconnect, which
// succeeds if the wallet already trusts this site and does nothing otherwise.
// Without the full connect, picking a wallet in the modal selected it and
// then stopped there — nothing ever asked the wallet to connect.

let intent = false;

export function markConnectIntent() {
  intent = true;
}

export function consumeConnectIntent(): boolean {
  const v = intent;
  intent = false;
  return v;
}
