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
import { WALLET_LOGOS } from "@/components/docs/wallet-logos";
import { mockWalletLayer } from "./mock-wallet";

const DEFAULT_WALLETS: WalletOption[] = [
  {
    id: "phantom",
    icon: WALLET_LOGOS.phantom,
    name: "Phantom",
    detected: true,
    recommended: true,
    color: "#ab9ff2",
    installUrl: "https://phantom.app/download",
  },
  {
    id: "solflare",
    icon: WALLET_LOGOS.solflare,
    name: "Solflare",
    detected: true,
    recommended: true,
    color: "#fc9231",
    installUrl: "https://solflare.com/download",
  },
  {
    id: "backpack",
    icon: WALLET_LOGOS.backpack,
    name: "Backpack",
    detected: true,
    recommended: true,
    color: "#e33e3f",
    installUrl: "https://backpack.app/download",
  },
  {
    id: "trust",
    icon: WALLET_LOGOS.trust,
    name: "Trust",
    detected: false,
    recommended: true,
    color: "#3375bb",
    installUrl: "https://trustwallet.com/download",
  },
  {
    id: "coinbase",
    icon: WALLET_LOGOS.coinbase,
    name: "Coinbase Wallet",
    detected: false,
    color: "#1652f0",
    installUrl: "https://www.coinbase.com/wallet/downloads",
  },
  {
    id: "ledger",
    icon: WALLET_LOGOS.ledger,
    name: "Ledger",
    detected: false,
    color: "#d4a0ff",
    installUrl: "https://www.ledger.com/ledger-live",
  },
];
const NONE_DETECTED = DEFAULT_WALLETS.map((w) => ({ ...w, detected: false }));

export default function WalletConnectModalDemo() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WalletConnectStatus>("list");
  const [error, setError] = useState<string | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>();
  const [connectedWalletId, setConnectedWalletId] = useState<string | undefined>();
  const [wallets, setWallets] = useState<WalletOption[]>(DEFAULT_WALLETS);
  // Bumps on every forced state / close so stale connect() results are ignored.
  const attemptRef = useRef(0);

  const openWith = (
    next: WalletConnectStatus,
    opts: {
      wallets?: WalletOption[];
      error?: string;
      selectedWalletId?: string;
      connectedWalletId?: string;
    } = {},
  ) => {
    attemptRef.current += 1;
    setWallets(opts.wallets ?? DEFAULT_WALLETS);
    setError(opts.error);
    setSelectedWalletId(opts.selectedWalletId);
    setConnectedWalletId(opts.connectedWalletId);
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
      setConnectedWalletId(wallet.id);
      setStatus("connected");
    } catch (err) {
      if (attemptRef.current !== attempt) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus("rejected");
    }
  };

  const scenarios = [
    "Wallet list",
    "List — connected",
    "No wallet installed",
    "Connecting",
    "Rejected",
    "Rejected — not responding",
    "Connected",
  ] as const;

  const noneDetected = wallets.every((w) => !w.detected);
  const activeScenario: (typeof scenarios)[number] | null = !open
    ? null
    : status === "connecting"
      ? "Connecting"
      : status === "connected"
        ? "Connected"
        : status === "rejected"
          ? error && /not responding/i.test(error)
            ? "Rejected — not responding"
            : "Rejected"
          : noneDetected
            ? "No wallet installed"
            : connectedWalletId
              ? "List — connected"
              : "Wallet list";

  const runScenario = (label: (typeof scenarios)[number]) => {
    switch (label) {
      case "Wallet list":
        openWith("list");
        break;
      case "List — connected":
        openWith("list", { connectedWalletId: "solflare" });
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
        setAddress("GK7zVzHYf7hM4dQxkNvR8mW2jL5tYbAcD9eF6gHiJkMq");
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
            className={`cursor-pointer px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
              label === activeScenario
                ? "bg-[#00543f] text-[#18e3a5] hover:bg-[#006a53]"
                : "border border-[#373a41] bg-[#13161b] text-[#f0f0f1] hover:bg-[#22262f]"
            }`}
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
        connectedWalletId={connectedWalletId}
        termsUrl="#"
        privacyUrl="#"
      />
    </div>
  );
}
