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
};

export const registry: RegistryEntry[] = [
  {
    name: "Transaction Status",
    slug: "transaction-status",
    description:
      "Every state of a Solana transaction — pending, confirming, confirmed, failed — with human-readable errors and calm, purposeful motion.",
    path: "components/kit/transaction-status/transaction-status.tsx",
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
          "Optional transaction summary card (e.g. “Sending 2.5 SOL / to sol.domain.eth”). During confirming it doubles as the progress fill.",
      },
      {
        name: "className",
        type: "string",
        description: "Extra classes for the root element.",
      },
    ],
  },
  {
    name: "Wallet Connect Modal",
    slug: "wallet-connect-modal",
    description:
      "Wallet selection, connecting, rejected, and connected states in one accessible modal. Detected wallets first, install links for the rest.",
    path: "components/kit/wallet-connect-modal/wallet-connect-modal.tsx",
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
          "Wallets to list. Detected wallets are badged and sorted first; undetected ones link to their install pages.",
      },
      {
        name: "onSelectWallet",
        type: "(wallet: WalletOption) => void",
        description: "Called when the user picks a detected wallet.",
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
