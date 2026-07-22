/**
 * Mock wallet layer — stands in for @solana/wallet-adapter so the demo works
 * standalone. The modal only needs a wallet list and a connect() promise;
 * swap the internals below and the UI doesn't change.
 *
 * Real integration sketch (inside a React component — hooks can't be called
 * from plain functions like the ones below):
 *
 *   import { useWallet } from "@solana/wallet-adapter-react";
 *   import { WalletReadyState } from "@solana/wallet-adapter-base";
 *
 *   const { wallets, select, connect, publicKey } = useWallet();
 *   const options = wallets.map((w) => ({
 *     id: w.adapter.name,
 *     name: w.adapter.name,
 *     icon: w.adapter.icon,
 *     detected: w.readyState === WalletReadyState.Installed,
 *     installUrl: w.adapter.url,
 *   }));
 *   // on select: select(walletName); await connect();
 *   // then read publicKey.toBase58() — connect() itself returns void.
 */

import type { WalletOption } from "./connect-wallet-modal";

export interface WalletLayer {
  listWallets(): WalletOption[];
  connect(walletId: string): Promise<{ address: string }>;
}

export const mockWalletLayer: WalletLayer = {
  listWallets() {
    return [
      {
        id: "phantom",
        name: "Phantom",
        detected: true,
        color: "#ab9ff2",
        installUrl: "https://phantom.app/download",
      },
      {
        id: "solflare",
        name: "Solflare",
        detected: true,
        color: "#fc9231",
        installUrl: "https://solflare.com/download",
      },
      {
        id: "backpack",
        name: "Backpack",
        detected: false,
        color: "#e33e3f",
        installUrl: "https://backpack.app/download",
      },
    ];
  },

  async connect(walletId: string) {
    // Simulated: Phantom approves after a delay long enough to show the
    // "check your wallet" hint; Solflare rejects to demo the calm failure.
    await new Promise((resolve) => setTimeout(resolve, 4200));
    if (walletId === "solflare") {
      throw new Error("user rejected the request");
    }
    return { address: "GK7zVzHYf7hM4dQxkNvR8mW2jL5tYbAcD9eF6gHiJkMq" };
  },
};
