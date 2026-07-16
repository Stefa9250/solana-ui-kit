"use client";

/**
 * Docs demo for WalletConnectModal. The trigger + state buttons drive the
 * modal through every state; organic clicks flow through the mock wallet
 * layer (Phantom approves, Solflare rejects).
 * Not part of the copy-paste component.
 */

import { useRef, useState } from "react";
import {
  WalletConnectModal,
  type WalletConnectStatus,
  type WalletOption,
} from "./wallet-connect-modal";
import { mockWalletLayer } from "./mock-wallet";

const DEFAULT_WALLETS = mockWalletLayer.listWallets();
const NONE_DETECTED = DEFAULT_WALLETS.map((w) => ({ ...w, detected: false }));

export default function WalletConnectModalDemo() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WalletConnectStatus>("list");
  const [error, setError] = useState<string | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>();
  const [wallets, setWallets] = useState<WalletOption[]>(DEFAULT_WALLETS);
  // Bumps on every forced state / close so stale connect() results are ignored.
  const attemptRef = useRef(0);

  const openWith = (
    next: WalletConnectStatus,
    opts: { wallets?: WalletOption[]; error?: string; selectedWalletId?: string } = {},
  ) => {
    attemptRef.current += 1;
    setWallets(opts.wallets ?? DEFAULT_WALLETS);
    setError(opts.error);
    setSelectedWalletId(opts.selectedWalletId);
    setStatus(next);
    setOpen(true);
  };

  const handleClose = () => {
    attemptRef.current += 1;
    setOpen(false);
  };

  const handleSelectWallet = async (wallet: WalletOption) => {
    const attempt = ++attemptRef.current;
    setSelectedWalletId(wallet.id);
    setError(undefined);
    setStatus("connecting");
    try {
      const { address: connected } = await mockWalletLayer.connect(wallet.id);
      if (attemptRef.current !== attempt) return;
      setAddress(connected);
      setStatus("connected");
    } catch (err) {
      if (attemptRef.current !== attempt) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus("rejected");
    }
  };

  const scenarios = [
    "Wallet list",
    "No wallet installed",
    "Connecting",
    "Rejected",
    "Rejected — not responding",
    "Connected",
  ] as const;

  const runScenario = (label: (typeof scenarios)[number]) => {
    switch (label) {
      case "Wallet list":
        openWith("list");
        break;
      case "No wallet installed":
        openWith("list", { wallets: NONE_DETECTED });
        break;
      case "Connecting":
        openWith("list");
        void handleSelectWallet(DEFAULT_WALLETS[0]);
        break;
      case "Rejected":
        openWith("rejected", { selectedWalletId: "phantom" });
        break;
      case "Rejected — not responding":
        openWith("rejected", {
          selectedWalletId: "phantom",
          error: "wallet not responding: timeout waiting for approval",
        });
        break;
      case "Connected":
        setAddress("GK7z…4jNq");
        openWith("connected", { selectedWalletId: "phantom" });
        break;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo states">
        {scenarios.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => runScenario(label)}
            className="cursor-pointer border border-[#373a41] bg-[#13161b] px-3 py-1.5 text-[12px] font-semibold text-[#f0f0f1] transition-colors duration-150 hover:bg-[#22262f] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-[220px] items-center justify-center border border-[#22262f] bg-[#0c0e12] p-6">
        <button
          type="button"
          onClick={() => openWith("list")}
          className="cursor-pointer bg-[#00543f] px-5 py-2.5 text-[14px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
        >
          Connect wallet
        </button>
      </div>

      <WalletConnectModal
        open={open}
        onClose={handleClose}
        wallets={wallets}
        onSelectWallet={handleSelectWallet}
        status={status}
        error={error}
        selectedWalletId={selectedWalletId}
        address={address}
      />
    </div>
  );
}
