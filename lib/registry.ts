/**
 * Component registry — the single source of truth for the docs site.
 *
 * Adding a new component:
 *   1. Create its folder under components/kit/<slug>/
 *   2. Add one entry here.
 * That's it — the landing index and /components/<slug> docs page pick it up.
 */

export type PropRow = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export type RegistryEntry = {
  name: string;
  slug: string;
  description: string;
  /** Repo-relative path to the self-contained component source file. */
  path: string;
  props: PropRow[];
  /** Short JSX snippet rendered in the docs page's Usage section. */
  usage?: string;
  /** Guidance callout rendered under the demo (e.g. which variant to pick). */
  note?: string;
};

export const registry: RegistryEntry[] = [
  {
    name: "Transaction Status",
    slug: "transaction-status",
    description:
      "Every state of a Solana transaction — pending, confirming, confirmed, failed — with human-readable errors and calm, purposeful motion.",
    path: "components/kit/transaction-status/transaction-status.tsx",
    usage: `<TransactionStatus
  status={status}
  signature={signature}
  error={error}
  confirmations={confirmations}
  errorMap={[{ test: /0x1771|"Custom":6001/, text: "Price moved too much." }]}
  onRetry={() => resubmit()}
  onDismiss={() => reset()}
/>`,
    note: "Feed confirmations from a getSignatureStatuses polling loop — signatureSubscribe fires once and can't drive a count. See the README's “Wiring up real data” pattern.",
    props: [
      {
        name: "status",
        type: '"idle" | "pending" | "confirming" | "confirmed" | "failed"',
        default: '"idle"',
        description: "Current transaction state. Idle renders nothing.",
      },
      {
        name: "signature",
        type: "string",
        description:
          "Transaction signature — used for the Solscan explorer link and the shortened display.",
      },
      {
        name: "error",
        type: "string",
        description:
          "Raw error from the RPC / wallet. Mapped to plain language; raw value shown under “technical details”. Simulation-failure prefixes are stripped before matching.",
      },
      {
        name: "errorMap",
        type: "{ test: RegExp; text: string }[]",
        description:
          "Your program's error rules, matched before the built-in defaults. Anchor custom errors (0x1770 + N) are program-specific — map them here.",
      },
      {
        name: "confirmations",
        type: "number",
        description:
          "Confirmations so far. Omit for an indeterminate confirming state.",
      },
      {
        name: "totalConfirmations",
        type: "number",
        default: "31",
        description:
          "Confirmation target (finality is ~31 slots). Most dApps treat the confirmed commitment (~1–2s) as success — jump to status=\"confirmed\" then, or omit confirmations for an indeterminate bar.",
      },
      {
        name: "cluster",
        type: '"mainnet-beta" | "devnet" | "testnet"',
        default: '"mainnet-beta"',
        description: "Explorer links point at this cluster.",
      },
      {
        name: "explorerUrl",
        type: "(signature: string) => string",
        description:
          "Override the explorer entirely, e.g. Solana Explorer or SolanaFM. Defaults to Solscan.",
      },
      {
        name: "onRetry",
        type: "() => void",
        description: "Called when the user clicks Retry in the failed state.",
      },
      {
        name: "onDismiss",
        type: "() => void",
        description:
          "When provided, shows a dismiss button and enables autoDismissMs.",
      },
      {
        name: "autoDismissMs",
        type: "number",
        description:
          "Auto-dismiss this many ms after confirmed (requires onDismiss).",
      },
      {
        name: "autoFocusRetry",
        type: "boolean",
        default: "true",
        description:
          "Move focus to Retry on failure. Disable if failures can land while the user is typing elsewhere.",
      },
      {
        name: "details",
        type: "{ primary: string; secondary?: string; meta?: string }",
        description:
          "Optional transaction summary card (e.g. “Sending 2.5 SOL / to wallet.sol”). During confirming it doubles as the progress fill.",
      },
      {
        name: "className",
        type: "string",
        description: "Extra classes for the root element.",
      },
    ],
  },
  {
    name: "Transaction Review",
    slug: "transaction-review",
    description:
      "The screen that decides trust: a plain-language, simulation-driven preview of what a transaction does before signing — net balance changes, fee, and warnings, with a safe / warn / block verdict that makes Reject prominent when it matters.",
    path: "components/kit/transaction-review/transaction-review.tsx",
    usage: `<TransactionReview
  origin="jup.ag"
  assets={[
    { symbol: "SOL", amount: "2.5", usd: 430.45, direction: "out" },
    { symbol: "USDC", amount: "428.10", usd: 428.1, direction: "in" },
  ]}
  warnings={[{ level: "warn", title: "New recipient" }]}
  feeUsd={0.0013}
  severity="warn"
  onSign={sign}
  onReject={reject}
/>`,
    note: "Renders a simulation you pass in — it does not run one; see the README's “Wiring up real data” for mapping simulateTransaction deltas into assets (native SOL isn't a token account; the fee is inside the payer's lamport delta; approvals move zero balance). An explicit `severity` can only RAISE the verdict the warnings imply, never hide a danger. A “block” makes Reject primary and gates “Sign anyway” behind an acknowledgement. Approvals are modelled as their own row (unlimited → coral) rather than a fake “−0” balance line, and the empty state warns that a zero-balance tx can still change authorities. The fee rounds up and never shows exponential notation, matching FeeExplainer.",
    props: [
      {
        name: "origin",
        type: "string",
        description:
          "The dApp domain requesting the signature — the headline of the anti-phishing header. Pair with originVerified.",
      },
      {
        name: "originVerified",
        type: "boolean",
        default: "false",
        description:
          "Shows a “Verified” or “Unverified” chip next to the origin. Caller-asserted.",
      },
      {
        name: "assets",
        type: "ReviewAsset[]",
        description:
          "Net balance changes: { symbol, direction, amount? | rawAmount?+decimals?, usd?, icon?, color? }. Prefer rawAmount+decimals (raw base units) — the component does the conversion. Grouped into “You pay” / “You receive” with a net line.",
      },
      {
        name: "approvals",
        type: "ReviewApproval[]",
        description:
          "Token approvals the tx grants: { symbol, amount?, icon?, color? }. Omitting amount means unlimited, rendered coral — because an approval moves no balance and would otherwise be invisible.",
      },
      {
        name: "warnings",
        type: "ReviewWarning[]",
        description:
          "Scanner findings, most severe first: { level: \"info\" | \"warn\" | \"danger\", title, detail? }. Danger drives the block verdict.",
      },
      {
        name: "feeUsd / feeSol",
        type: "number",
        description: "Network fee, shown USD-primary. Falls back to “typically under $0.01”.",
      },
      {
        name: "severity",
        type: '"safe" | "warn" | "block"',
        description:
          "Overall verdict. An explicit value can only raise the level the warnings imply — it can't demote a danger. Block flips Reject to primary and gates “Sign anyway”. Defaults to the highest warning level.",
      },
      {
        name: "requireAckOnBlock",
        type: "boolean",
        default: "true",
        description:
          "Require an “I understand this is high-risk” checkbox before Sign is enabled on a block verdict.",
      },
      {
        name: "simulatedBy",
        type: "string",
        description: "Quiet attribution (“Simulated by Blowfish”) so users can calibrate trust in the preview.",
      },
      {
        name: "simulating",
        type: "boolean",
        default: "false",
        description: "Simulation in flight — shows skeletons.",
      },
      {
        name: "simulationFailed",
        type: "boolean",
        default: "false",
        description:
          "Simulation couldn't run — shows a proceed-with-caution notice instead of blocking.",
      },
      {
        name: "signing",
        type: "boolean",
        default: "false",
        description: "Sign in flight — spinner on Sign, both actions disabled.",
      },
      {
        name: "onSign / onReject",
        type: "() => void",
        description: "The two terminal actions.",
      },
    ],
  },
  {
    name: "Token Amount Input",
    slug: "token-amount-input",
    description:
      "A token amount field that handles decimals exactly, formats as you type, reserves rent when maxing, and corrects rather than alarms when the amount is too large.",
    path: "components/kit/token-amount-input/token-amount-input.tsx",
    usage: `<TokenAmountInput
  token={SOL}
  balance="12.45"
  price="172.18"
  value={amount}
  onChange={setAmount}
  onMax={(v) => track("max", v)}
  onValidityChange={({ valid }) => setCanSubmit(valid)}
  tokens={MOCK_TOKENS}
  onSelectToken={setToken}
/>`,
    note: "Every comparison, MAX subtraction and balance check runs on BigInt base units and truncates, never rounds, so MAX can't exceed the real balance. The USD conversion is float maths — a display estimate that never decides validity. Pass `balance`/`price` as strings to avoid the precision a JS number loses above 2^53 raw units. `value` is always in token units, even while typing in USD.",
    props: [
      {
        name: "token",
        type: "TokenInfo",
        description:
          "{ symbol, name?, mint?, decimals, icon?, color?, feeReserve? }. `decimals` caps what can be typed (SOL 9, USDC 6); `mint` keys token lists, since symbols aren't unique on Solana; `feeReserve` is what MAX holds back on native SOL — a constant is a simplification for rentExemptMin + fees + accounts created.",
      },
      {
        name: "balance",
        type: "number | string",
        description:
          "Human-unit balance. Prefer a string — a JS number loses bits above 2^53 raw units (~9B USDC, ~9M SOL). Omit while fetching to show the skeleton.",
      },
      {
        name: "price",
        type: "number | string",
        description:
          "USD price per whole token. Display only — never decides validity. Omit while fetching; the USD toggle disables without it.",
      },
      {
        name: "value",
        type: "string",
        description:
          "Amount as a plain decimal string, always in token units — even when the user is typing in USD.",
      },
      {
        name: "onChange",
        type: "(value: string) => void",
        description:
          "Receives the sanitized token amount. Invalid characters and excess decimals are silently dropped, never surfaced as an error.",
      },
      {
        name: "onMax",
        type: "(value: string) => void",
        description: "Fired after MAX fills the field, with the amount it used.",
      },
      {
        name: "onValidityChange",
        type: "(v: { valid, insufficient, exceedsReserve }) => void",
        description:
          "Fires when validity changes so a parent can gate its own submit button without re-deriving the base-unit maths. `exceedsReserve` means the amount fits the balance but would leave nothing to pay fees.",
      },
      {
        name: "loading",
        type: "boolean",
        default: "false",
        description:
          "Balance/price still fetching — shimmers the balance and conversion lines and disables input.",
      },
      {
        name: "disabled",
        type: "boolean",
        default: "false",
        description: "Disables the field and its controls.",
      },
      {
        name: "label",
        type: "string",
        default: '"Amount"',
        description: "Visible field label, bound to the input.",
      },
      {
        name: "tokens",
        type: "TokenInfo[]",
        description:
          "Supplying more than one (with onSelectToken) turns the token pill into a picker.",
      },
      {
        name: "onSelectToken",
        type: "(token: TokenInfo) => void",
        description: "Called when a token is chosen from the picker.",
      },
      {
        name: "className",
        type: "string",
        description: "Extra classes for the root element.",
      },
    ],
  },
  {
    name: "Fee Explainer",
    slug: "fee-explainer",
    description:
      "Translates Solana priority fees into plain language — cost in dollars, time in seconds. Lamports never reach the user, and a missing estimate never blocks them.",
    path: "components/kit/fee-explainer/fee-explainer.tsx",
    usage: `<FeeExplainer
  feeUsd={0.0021}
  feeSol={0.000012}
  confirmTime={[2, 5]}
  baseFeeUsd={0.00086}
  priorityFeeUsd={0.00124}
  speed={speed}
  onSpeedChange={setSpeed}
  speedOptions={speedOptions}
  congested={congested}
/>`,
    note: "Costs round UP, never to nearest, and the displayed total is the sum of the rounded parts — so the breakdown always reconciles with the headline. Nothing unknown renders as a number: a null or NaN shows “—”, never “$0.00”. Pass `extraCosts` for account rent or tips, otherwise the headline understates a first-time token transfer by ~270× (ATA rent is ~0.00204 SOL against a ~$0.001 fee).",
    props: [
      {
        name: "feeUsd",
        type: "number",
        description:
          "Total cost in USD — the primary figure everywhere. Omit for the unavailable fallback.",
      },
      {
        name: "feeSol",
        type: "number",
        description: "The same total in SOL, shown as the secondary reference.",
      },
      {
        name: "confirmTime",
        type: "number | [number, number]",
        description:
          "Seconds. A tuple renders as a range (“2–5s”); a single number renders as “~2s”.",
      },
      {
        name: "baseFeeUsd / baseFeeSol",
        type: "number",
        description:
          "Base fee portion. With the priority pair, the info affordance expands into the breakdown.",
      },
      {
        name: "priorityFeeUsd / priorityFeeSol",
        type: "number",
        description:
          "Priority fee portion, explained in one plain sentence in the breakdown.",
      },
      {
        name: "speed",
        type: '"normal" | "fast" | "turbo"',
        description:
          "Selected tier. With onSpeedChange and speedOptions, renders the selector as a keyboard-navigable radio group.",
      },
      {
        name: "onSpeedChange",
        type: "(speed: FeeSpeed) => void",
        description: "Called when a speed tier is chosen.",
      },
      {
        name: "speedOptions",
        type: "FeeSpeedOption[]",
        description:
          "{ speed, label, feeUsd, confirmTime } per tier — each option shows its own cost and time.",
      },
      {
        name: "extraCosts",
        type: "{ label, usd?, sol?, hint? }[]",
        description:
          "Costs beyond the network fee — account rent, bundle tips. When present the headline becomes the total the user actually pays and the label defaults to “Estimated cost”. Creating an associated token account costs ~0.00204 SOL, which dwarfs the fee itself.",
      },
      {
        name: "congested",
        type: "boolean",
        default: "false",
        description:
          "Raises a calm “network is busy” notice using the kit's warning treatment, and eases it back out when congestion clears.",
      },
      {
        name: "loading",
        type: "boolean",
        default: "false",
        description: "Shimmers the fee line while the estimate is in flight.",
      },
      {
        name: "open",
        type: "boolean",
        description:
          "Control the breakdown externally. Omit to let the component manage it.",
      },
      {
        name: "onOpenChange",
        type: "(open: boolean) => void",
        description: "Notified when the breakdown wants to open or close.",
      },
      {
        name: "label",
        type: "string",
        default: '"Network fee"',
        description: "Row label.",
      },
    ],
  },
  {
    name: "Address Display",
    slug: "address-display",
    description:
      "A Solana address done right: middle-truncated, deterministic avatar, one-tap copy of the full address, and a program/token affordance so nobody sends funds into a program by mistake.",
    path: "components/kit/address-display/address-display.tsx",
    usage: `<AddressDisplay
  address={pubkey}
  name="jupiter.sol"
  kind="program"
  variant="card"
  showExplorer
  onCopy={(addr) => track("copy", addr)}
/>`,
    note: "Copy always writes the full base58 address (with a clipboard fallback for insecure contexts and a visible failure state), never the shortened form. `kind` defaults to “unknown” — trust is opt-in; declare “wallet” explicitly to drop the badge. The chip and short form are visual anchors, not identity checks: distinct addresses can share a prefix/suffix (address-poisoning grinds exactly that), so verify by copying the full string. Malformed input renders an “Invalid address” affordance rather than a broken link.",
    props: [
      {
        name: "address",
        type: "string",
        description: "Full base58 address. Truncated for display, copied in full.",
      },
      {
        name: "name",
        type: "string",
        description:
          "Known label — a .sol domain, a program name — shown in place of the truncated address, which drops to the secondary line.",
      },
      {
        name: "kind",
        type: '"wallet" | "program" | "token" | "unknown"',
        default: '"unknown"',
        description:
          "Programs and token mints get an amber cautionary badge and a shield glyph so they aren't mistaken for a personal wallet; unknown shows “Unverified”. Caller-supplied — not verified by the component.",
      },
      {
        name: "chars",
        type: "number",
        default: "6",
        description:
          "Characters shown on each side of the ellipsis. Clamped to a floor of 4 — lower lets distinct addresses render identically.",
      },
      {
        name: "onCopyError",
        type: "() => void",
        description:
          "Called if the copy failed (blocked clipboard / insecure context). The button also shows a visible failure state.",
      },
      {
        name: "cluster",
        type: '"mainnet-beta" | "devnet" | "testnet"',
        default: '"mainnet-beta"',
        description: "Explorer links point at this cluster.",
      },
      {
        name: "explorerUrl",
        type: "(address: string) => string",
        description: "Override the explorer. Defaults to Solscan.",
      },
      {
        name: "showExplorer / showAvatar / showCopy",
        type: "boolean",
        description:
          "Toggle the explorer link (card only), the avatar, and the copy button.",
      },
      {
        name: "onCopy",
        type: "(address: string) => void",
        description: "Called after a successful copy, with the full address.",
      },
      {
        name: "loading",
        type: "boolean",
        default: "false",
        description: "Identity still resolving — shows a skeleton.",
      },
      {
        name: "variant",
        type: '"inline" | "card"',
        default: '"inline"',
        description:
          "Inline is a compact chip; card is a padded row with the name, kind and explorer link.",
      },
    ],
  },
  {
    name: "State Screen",
    slug: "state-screen",
    description:
      "The empty and error screens nobody designs: RPC down, no tokens, network congested, wallet not connected. One calm layout, three restrained tones, presets with the copy already written.",
    path: "components/kit/state-screen/state-screen.tsx",
    usage: `<StateScreen
  {...STATE_PRESETS.rpcDown}
  action={{ label: "Try again", onClick: refetch }}
  secondaryAction={{ label: "Switch endpoint", onClick: pickRpc }}
  busy={retrying}
/>`,
    note: "STATE_PRESETS ships end-user copy for rpcDown, rateLimited, wrongNetwork, noTokens, noTransactions and notConnected — spread one and add handlers. Congestion is deliberately not here: the kit models a busy network as FeeExplainer's inline banner, not a full-screen dead-end. The error tone is a muted coral, never alarm-red, and can reveal the raw error under “technical details”. `busy` shows a spinner and keeps the action's own label (or its busyLabel) — never a baked-in “Retrying…”.",
    props: [
      {
        name: "title",
        type: "string",
        description: "The headline. Required.",
      },
      {
        name: "description",
        type: "string",
        description: "One line of plain-language explanation.",
      },
      {
        name: "icon",
        type: "LucideIcon | ReactNode",
        description:
          "A lucide icon component (rendered at 24px in a tinted circle) or any node for full control.",
      },
      {
        name: "tone",
        type: '"neutral" | "brand" | "warning" | "error"',
        default: '"neutral"',
        description:
          "Tints the icon. Brand is the inviting emerald for a call-to-action like connect-wallet; error is a muted coral. Announcements are always polite — the full-screen visual carries the urgency.",
      },
      {
        name: "action",
        type: "{ label, onClick?, href?, busyLabel?, newTab? }",
        description:
          "Primary way forward — a button, or a link when href is set (external URLs get a ↗ and open a new tab; override with newTab). onClick fires alongside navigation. Rendered only if it can actually do something.",
      },
      {
        name: "secondaryAction",
        type: "{ label, onClick?, href?, ... }",
        description: "A quieter secondary option, same shape as action.",
      },
      {
        name: "busy",
        type: "boolean",
        default: "false",
        description:
          "Spinner on the primary action, keeping its own label (or busyLabel); disables it while in flight. A link stays a link — it never becomes a dead button.",
      },
      {
        name: "errorDetail",
        type: "string",
        description:
          "Error tone only — the raw error, revealed under a collapsible “technical details” like TransactionStatus.",
      },
      {
        name: "headingLevel",
        type: "1 | 2 | 3 | 4",
        default: "2",
        description: "Heading level for the title. Set it to fit your page hierarchy.",
      },
      {
        name: "autoFocusAction",
        type: "boolean",
        default: "false",
        description:
          "Move focus to the primary action on mount — for post-error screens, matching TransactionStatus's autoFocusRetry.",
      },
      {
        name: "compact",
        type: "boolean",
        default: "false",
        description:
          "Tighter vertical padding for use inside a card rather than a full page.",
      },
    ],
  },
  {
    name: "Connect Wallet",
    slug: "connect-wallet",
    description:
      "The full connect flow: a trigger that opens an anchored panel, morphs through wallet list → connecting → optional sign-in-with-Solana → success, then becomes a connected account chip.",
    path: "components/kit/connect-wallet/connect-wallet.tsx",
    usage: `<ConnectWallet
  wallets={wallets}
  status={status}
  address={address}
  onSelectWallet={(w) => connect(w)}
  onSign={() => signIn()}   // omit status="signing" to skip SIWS
  onDisconnect={() => disconnect()}
/>`,
    note: "Dropdown vs Modal: this anchored flow owns the trigger and becomes the connected chip — pick it when connect lives in your navbar. Pick the modal when connect is triggered from arbitrary places, or when the trigger sits inside an overflow-hidden container (this panel doesn't portal).",
    props: [
      {
        name: "wallets",
        type: "WalletOption[]",
        description:
          "Wallets to list. Detected wallets are badged and sorted first; undetected ones link to their install pages. Mark some `recommended` to group the rest behind a “More wallets” row. Set `icon` (URL or data URI, e.g. wallet.adapter.icon) for real logos; initials otherwise.",
      },
      {
        name: "status",
        type: '"disconnected" | "connecting" | "signing" | "rejected" | "connected"',
        description:
          "Wallet lifecycle, driven by your adapter calls. The signing step is optional — never set it if your dApp doesn't use sign-in-with-Solana.",
      },
      {
        name: "onSelectWallet",
        type: "(wallet: WalletOption) => void",
        description: "Called when a detected wallet is picked (also powers Try again).",
      },
      {
        name: "onSign",
        type: "() => void",
        description: "Called from the sign-in-with-Solana step's Sign button.",
      },
      {
        name: "onDisconnect",
        type: "() => void",
        description:
          "Called from the chip menu, the sign step, and the rejected Cancel.",
      },
      {
        name: "error",
        type: "string",
        description:
          "Raw connection error. Mapped to plain language in the rejected state.",
      },
      {
        name: "selectedWalletId",
        type: "string",
        description:
          "Which wallet is mid-flow when driven externally. Clicking a row tracks this internally.",
      },
      {
        name: "address",
        type: "string",
        description: "Connected address — shown in the success beat and the chip.",
      },
      {
        name: "connectedWalletId",
        type: "string",
        description:
          "Badges this wallet “Connected” in the list (multi-wallet apps).",
      },
      {
        name: "termsUrl",
        type: "string",
        description:
          "Terms of service link in the header line. Omit both URLs to hide the line.",
      },
      {
        name: "privacyUrl",
        type: "string",
        description: "Privacy policy link in the header line.",
      },
      {
        name: "open",
        type: "boolean",
        description:
          "Control the panel externally. Omit to let the component manage it (trigger click, Escape, outside click, auto-close).",
      },
      {
        name: "onOpenChange",
        type: "(open: boolean) => void",
        description: "Notified when the panel wants to open or close.",
      },
    ],
  },
  {
    name: "Connect Wallet Modal",
    slug: "connect-wallet-modal",
    description:
      "Wallet selection, connecting, rejected, and connected states in one accessible modal. Detected wallets first, install links for the rest.",
    path: "components/kit/connect-wallet-modal/connect-wallet-modal.tsx",
    usage: `<ConnectWalletModal
  open={open}
  onClose={() => setOpen(false)}
  wallets={wallets}
  onSelectWallet={(w) => connect(w)}
  status={status}
  error={error}
  termsUrl="/terms"
  privacyUrl="/privacy"
/>`,
    note: "Dropdown vs Modal: this centered modal portals to document.body and locks scroll — pick it when connect is triggered from arbitrary places. Pick the anchored ConnectWallet when connect lives in your navbar and you want the trigger-to-chip morph.",
    props: [
      {
        name: "open",
        type: "boolean",
        default: "false",
        description: "Whether the modal is shown.",
      },
      {
        name: "onClose",
        type: "() => void",
        description:
          "Called on Escape, backdrop click, or the close button. Focus returns to the trigger.",
      },
      {
        name: "wallets",
        type: "WalletOption[]",
        description:
          "Wallets to list. Detected wallets are badged and sorted first; undetected ones link to their install pages. Mark some `recommended` to group the rest behind a “More wallets” row. Set `icon` (URL or data URI, e.g. wallet.adapter.icon) for real logos; initials otherwise.",
      },
      {
        name: "onSelectWallet",
        type: "(wallet: WalletOption) => void",
        description: "Called when the user picks a detected wallet.",
      },
      {
        name: "connectedWalletId",
        type: "string",
        description:
          "Badges this wallet “Connected” in the list — for reopening the modal to switch wallets.",
      },
      {
        name: "termsUrl",
        type: "string",
        description:
          "Terms of service link in the header line. Omit both URLs to hide the line.",
      },
      {
        name: "privacyUrl",
        type: "string",
        description: "Privacy policy link in the header line.",
      },
      {
        name: "status",
        type: '"list" | "connecting" | "rejected" | "connected"',
        default: '"list"',
        description:
          "Connection state. Connected shows a brief success then auto-dismisses (~1.5s).",
      },
      {
        name: "error",
        type: "string",
        description:
          "Raw connection error. Mapped to plain language; raw value shown under “technical details”.",
      },
      {
        name: "selectedWalletId",
        type: "string",
        description:
          "Which wallet is connecting/rejected/connected when the state is driven externally. Clicking a row tracks this internally.",
      },
      {
        name: "address",
        type: "string",
        description: "Connected address shown in the success state.",
      },
    ],
  },
];

export function getEntry(slug: string): RegistryEntry | undefined {
  return registry.find((e) => e.slug === slug);
}
