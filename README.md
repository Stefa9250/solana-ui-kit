# Solana UI Kit

**The missing UX layer for Solana dApps.**

Most Solana dApps get the hard part right — the program, the RPC plumbing, the
wallet adapter — and then show users a spinner and a raw error code. This kit
covers the moments *after the click*: transaction status, wallet connection,
and the other high-anxiety seconds where trust is won or lost.

- **Copy-paste, not a package.** Like shadcn/ui: you copy a component file into
  your project and own the code. No npm install, no versioning treadmill, no
  build step.
- **Dark-mode first.** Designed for how dApps actually ship.
- **Accessible.** Focus management, `aria-live` announcements, keyboard
  navigation, `prefers-reduced-motion` respected.
- **Calm, purposeful motion.** 200–400ms transitions that explain state, not
  decorate it.
- **Human-readable errors.** `0x1771` becomes "Price moved too much." — the raw
  error stays one click away under technical details.

## Install

There is nothing to install. Each component is a single self-contained file.

1. Make sure your project has **React 18+**, **Tailwind CSS**, and
   **lucide-react** — the only dependencies any component uses:

   ```bash
   npm install lucide-react
   ```

2. Run the docs site (`npm install && npm run dev`, then open
   `http://localhost:3000`), pick a component, and hit **Copy source**.

3. Paste it into your project, e.g.
   `components/transaction-status/transaction-status.tsx`, and import it:

   ```tsx
   import { TransactionStatus } from "@/components/transaction-status/transaction-status";
   ```

## Components

| Component | Description |
| --- | --- |
| [Transaction Status](components/kit/transaction-status/transaction-status.tsx) | Pending → confirming (`12 of 31`) → confirmed / failed, with mapped Solana errors, Solscan links, Retry, and a collapsible raw-error view. |
| [Wallet Connect](components/kit/wallet-connect/wallet-connect.tsx) | The full connect flow: trigger button → anchored panel morphing through wallet list, connecting, optional sign-in-with-Solana, success → connected account chip. |
| [Wallet Connect Modal](components/kit/wallet-connect-modal/wallet-connect-modal.tsx) | The same states as a centered modal, for apps that prefer it. Wallet list (detected first), no-wallet empty state, connecting hint, calm rejection, auto-dismiss. Focus-trapped and keyboard-friendly. |

Each component folder also contains its docs demo (`demo.tsx`) and, where
useful, a mock layer (`mock-wallet.ts`) with `TODO` markers showing exactly
where real `@solana/wallet-adapter` calls plug in. You only need to copy the
component file itself.

## Patterns

**Program-specific errors.** Anchor custom errors (`0x1770 + N`) mean
different things per program — pass your program's rules via `errorMap` and
they're matched before the built-in defaults:

```tsx
<TransactionStatus
  status={status}
  error={error}
  errorMap={[
    { test: /0x1771/i, text: "Price moved too much. Try again or increase slippage." },
  ]}
/>
```

**Multiple transactions.** The component is intentionally single-transaction.
For a queue, render a list keyed by signature:

```tsx
{transactions.map((tx) => (
  <TransactionStatus
    key={tx.signature}
    status={tx.status}
    signature={tx.signature}
    error={tx.error}
    onRetry={() => resubmit(tx)}
    onDismiss={() => remove(tx.signature)}
  />
))}
```

**Commitment levels.** `confirmations` counting to 31 tracks finality, but
most dApps treat the `confirmed` commitment (~1–2s) as success. If that's
you, jump straight to `status="confirmed"` — or omit `confirmations` while
confirming for a calm indeterminate bar.

## Out of scope

This kit deliberately does **not** include:

- Charts or analytics widgets
- Swap widgets or other DeFi trade UIs
- NFT galleries
- Mobile-native components (React Native etc.)

There are good projects for all of those. This kit stays focused on the
universal UX moments every dApp shares.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Adding a component is one folder under
`components/kit/` plus one entry in `lib/registry.ts`.

## License

[MIT](LICENSE)
