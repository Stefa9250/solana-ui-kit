/**
 * Per-component usage guidance rendered on the docs page: when to reach for it,
 * its anatomy (for multi-part components), and accessibility behaviour. Kept
 * separate from the registry so the component metadata stays lean.
 */

export type AnatomyPart = { name: string; note: string };

export type Guidance = {
  /** "When to use" bullets. */
  whenToUse?: string[];
  /** Named parts, for multi-part components. */
  anatomy?: AnatomyPart[];
  /** Keyboard / focus / screen-reader behaviour the component guarantees. */
  accessibility?: string[];
};

export const guidance: Record<string, Guidance> = {
  "transaction-status": {
    whenToUse: [
      "Right after a user submits a transaction, to track pending → confirming → confirmed / failed.",
      "When you poll getSignatureStatuses and want the confirmation count surfaced calmly.",
      "Anywhere a raw error code would otherwise leak — it maps common Solana and Anchor errors to plain language, with the raw code one click away.",
    ],
    accessibility: [
      "Status transitions are announced through an aria-live region.",
      "On failure, Retry can take focus automatically (autoFocusRetry).",
      "Respects prefers-reduced-motion — the trace and spinner animations stop.",
      "The raw error stays reachable behind a keyboard-focusable details toggle.",
    ],
  },
  "transaction-review": {
    whenToUse: [
      "Before signing, to preview net balance changes, fee, and warnings in plain language.",
      "For any transaction that moves funds or grants approvals — swaps, sends, staking.",
      "When a scanner (Blowfish or your heuristics) flags risk and you want Reject to become the prominent action.",
    ],
    anatomy: [
      { name: "Origin header", note: "The requesting site and a verified-origin badge." },
      { name: "Balance changes", note: "Out (you pay) and in (you receive) asset rows, with USD." },
      { name: "Approvals", note: "Token approvals as their own rows — unlimited renders coral." },
      { name: "Fee", note: "The network fee in USD and SOL, never double-counted." },
      { name: "Verdict", note: "safe / warn / block, which sets how prominent Reject vs. Sign is." },
    ],
    accessibility: [
      "role=group with an sr-only live announcement of the net change.",
      "Escape triggers onReject; on a blocked verdict, focus lands on Reject.",
      "The “Sign anyway” gate is a real checkbox bound to its label.",
    ],
  },
  "token-amount-input": {
    whenToUse: [
      "Whenever a user types a token amount — swaps, sends, deposits.",
      "When you need exact per-token decimals and thousands separators applied as they type.",
      "When MAX should reserve rent and fees rather than empty the wallet.",
    ],
    accessibility: [
      "type=text with inputMode=decimal raises the numeric keypad and accepts comma decimals.",
      "The insufficient-balance correction is announced and offers the corrected amount.",
      "The amount font stays ≥16px, so iOS doesn’t zoom on focus.",
    ],
  },
  "fee-explainer": {
    whenToUse: [
      "To explain priority fees in plain language before a user confirms.",
      "When you offer Normal / Fast / Turbo speeds and want the trade-off legible.",
      "When the network is congested and you want a calm notice rather than an alarm.",
    ],
    accessibility: [
      "The breakdown is a keyboard-toggleable disclosure.",
      "Speed options form a labelled radio group.",
      "Falls back to an honest “estimate unavailable” state instead of a fabricated number.",
    ],
  },
  "address-display": {
    whenToUse: [
      "Anywhere you surface a wallet, program, or token-mint address.",
      "When users must copy the full address without mis-reads — middle truncation plus one-tap copy.",
      "When a program or token address must be flagged so nobody sends funds into a program by mistake.",
    ],
    anatomy: [
      { name: "Avatar", note: "A deterministic identicon derived from the address." },
      { name: "Address", note: "Middle-truncated to 6+6, with an optional name." },
      { name: "Kind badge", note: "An amber program / token-mint caveat when relevant." },
      { name: "Actions", note: "Copy, plus an explorer link on the card variant." },
    ],
    accessibility: [
      "Screen readers get the full address; Copy is the exact-verification path.",
      "If copy fails, the full base58 is revealed as selectable text.",
      "The caveat badge carries meaning in text, not colour alone.",
    ],
  },
  "state-screen": {
    whenToUse: [
      "For the empty and error moments most apps skip — RPC down, no tokens, not connected.",
      "When a dead-end needs one calm layout with an honest message and a single clear action.",
      "As a full-screen or inline block, using a shipped preset or your own copy.",
    ],
    accessibility: [
      "The icon is decorative; the heading and body carry the meaning.",
      "The primary action is a real button with a visible focus ring.",
      "Retry exposes a busy state, so a repeated tap is obvious.",
    ],
  },
  "connect-wallet": {
    whenToUse: [
      "For the full connect flow anchored to a navbar button.",
      "When you want wallet list → connecting → optional sign-in → connected chip in one piece.",
      "On mobile it becomes a bottom sheet and deeplinks undetected wallets into their app.",
    ],
    anatomy: [
      { name: "Trigger", note: "The Connect button that becomes the account chip." },
      { name: "Panel / sheet", note: "An anchored dropdown on desktop, a bottom sheet on mobile." },
      { name: "Wallet rows", note: "Detected wallets first; undetected ones install or deeplink." },
      { name: "Steps", note: "Connecting, optional sign-in-with-Solana, then success." },
    ],
    accessibility: [
      "Focus is trapped in the panel and returns to the trigger on close.",
      "Escape and an outside tap dismiss; aria-live narrates each step.",
      "Respects prefers-reduced-motion.",
    ],
  },
  "connect-wallet-modal": {
    whenToUse: [
      "The same connect states as a centered modal, for apps that prefer it to an anchored panel.",
      "When you want a focus-trapped overlay with a no-wallet empty state and auto-dismiss.",
      "On mobile it docks as a bottom sheet.",
    ],
    anatomy: [
      { name: "Backdrop", note: "A dimmed, click-to-dismiss overlay." },
      { name: "Dialog", note: "Focus-trapped card on desktop, bottom sheet on mobile." },
      { name: "Wallet rows", note: "Detected first, then install / deeplink options." },
      { name: "States", note: "List, connecting, rejected, and connected." },
    ],
    accessibility: [
      "A focus-trapped dialog with aria-modal; Escape and backdrop close it.",
      "Focus returns to the trigger on close; aria-live narrates status.",
      "The iOS body-scroll lock prevents the background bleeding through.",
    ],
  },
};
