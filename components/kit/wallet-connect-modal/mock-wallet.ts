/**
 * Mock wallet layer — stands in for @solana/wallet-adapter so the demo works
 * standalone. The modal only needs a wallet list and a connect() promise;
 * swap the internals below and the UI doesn't change.
 */

import type { WalletOption } from "./wallet-connect-modal";

export interface WalletLayer {
  listWallets(): WalletOption[];
  connect(walletId: string): Promise<{ address: string }>;
}

export const mockWalletLayer: WalletLayer = {
  listWallets() {
    // TODO: real detection with @solana/wallet-adapter-react —
    //   const { wallets } = useWallet();
    //   detected: wallet.readyState === WalletReadyState.Installed
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
    // TODO: real connection with @solana/wallet-adapter-react —
    //   select(walletName); await connect();
    //   return { address: publicKey.toBase58() };
    //
    // Simulated: Phantom approves after a delay long enough to show the
    // "check your wallet" hint; Solflare rejects to demo the calm failure.
    await new Promise((resolve) => setTimeout(resolve, 4200));
    if (walletId === "solflare") {
      throw new Error("user rejected the request");
    }
    return { address: "GK7z…4jNq" };
  },
};
