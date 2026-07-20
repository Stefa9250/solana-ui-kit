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
    name: "Wallet Connect",
    slug: "wallet-connect",
    description:
      "The full connect flow: a trigger that opens an anchored panel, morphs through wallet list → connecting → optional sign-in-with-Solana → success, then becomes a connected account chip.",
    path: "components/kit/wallet-connect/wallet-connect.tsx",
    usage: `<WalletConnect
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
    name: "Wallet Connect Modal",
    slug: "wallet-connect-modal",
    description:
      "Wallet selection, connecting, rejected, and connected states in one accessible modal. Detected wallets first, install links for the rest.",
    path: "components/kit/wallet-connect-modal/wallet-connect-modal.tsx",
    usage: `<WalletConnectModal
  open={open}
  onClose={() => setOpen(false)}
  wallets={wallets}
  onSelectWallet={(w) => connect(w)}
  status={status}
  error={error}
  termsUrl="/terms"
  privacyUrl="/privacy"
/>`,
    note: "Dropdown vs Modal: this centered modal portals to document.body and locks scroll — pick it when connect is triggered from arbitrary places. Pick the anchored WalletConnect when connect lives in your navbar and you want the trigger-to-chip morph.",
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
