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
| [Wallet Connect Modal](components/kit/wallet-connect-modal/wallet-connect-modal.tsx) | Wallet list (detected first), no-wallet empty state, connecting with "check your wallet" hint, calm rejection, connected with auto-dismiss. Focus-trapped and keyboard-friendly. |

Each component folder also contains its docs demo (`demo.tsx`) and, where
useful, a mock layer (`mock-wallet.ts`) with `TODO` markers showing exactly
where real `@solana/wallet-adapter` calls plug in. You only need to copy the
component file itself.

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
