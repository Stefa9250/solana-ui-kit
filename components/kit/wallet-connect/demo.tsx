"use client";

/**
 * Docs demo for WalletConnect. A faux dApp navbar hosts the real component;
 * organic clicks run the full flow (Phantom approves then asks for a
 * signature, Solflare rejects). State buttons force each step.
 * Not part of the copy-paste component.
 */

import { useRef, useState } from "react";
import {
  WalletConnect,
  type WalletConnectFlowStatus,
  type WalletOption,
} from "./wallet-connect";

const WALLETS: WalletOption[] = [
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
const NONE_DETECTED = WALLETS.map((w) => ({ ...w, detected: false }));
const ADDRESS = "GK7z…4jNq";

export default function WalletConnectDemo() {
  const [status, setStatus] = useState<WalletConnectFlowStatus>("disconnected");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>();
  const [wallets, setWallets] = useState<WalletOption[]>(WALLETS);
  // Bumps on every forced state / close so stale mock timers are ignored.
  const attemptRef = useRef(0);

  const force = (
    next: WalletConnectFlowStatus,
    opts: {
      open?: boolean;
      wallets?: WalletOption[];
      error?: string;
      selectedWalletId?: string;
    } = {},
  ) => {
    attemptRef.current += 1;
    setWallets(opts.wallets ?? WALLETS);
    setError(opts.error);
    setSelectedWalletId(opts.selectedWalletId);
    setStatus(next);
    setOpen(opts.open ?? true);
  };

  // Mock wallet layer. TODO: swap for @solana/wallet-adapter —
  //   select(walletName); await connect(); then signIn() for SIWS.
  const handleSelectWallet = (wallet: WalletOption) => {
    const attempt = ++attemptRef.current;
    setSelectedWalletId(wallet.id);
    setError(undefined);
    setStatus("connecting");
    setTimeout(() => {
      if (attemptRef.current !== attempt) return;
      if (wallet.id === "solflare") {
        setError("user rejected the request");
        setStatus("rejected");
      } else {
        setStatus("signing");
      }
    }, 2600);
  };

  const handleSign = () => {
    const attempt = ++attemptRef.current;
    setStatus("connecting");
    setTimeout(() => {
      if (attemptRef.current !== attempt) return;
      setStatus("connected");
    }, 1400);
  };

  const handleDisconnect = () => {
    attemptRef.current += 1;
    setStatus("disconnected");
    setOpen(false);
    setSelectedWalletId(undefined);
    setError(undefined);
  };

  const scenarios = [
    "Disconnected",
    "Wallet list",
    "No wallet installed",
    "Connecting",
    "Signing",
    "Rejected",
    "Connected",
  ] as const;

  const runScenario = (label: (typeof scenarios)[number]) => {
    switch (label) {
      case "Disconnected":
        handleDisconnect();
        break;
      case "Wallet list":
        force("disconnected");
        break;
      case "No wallet installed":
        force("disconnected", { wallets: NONE_DETECTED });
        break;
      case "Connecting":
        force("disconnected");
        handleSelectWallet(WALLETS[0]);
        break;
      case "Signing":
        force("signing", { selectedWalletId: "phantom" });
        break;
      case "Rejected":
        force("rejected", {
          selectedWalletId: "phantom",
          error: "user rejected the request",
        });
        break;
      case "Connected":
        force("connected", { open: false, selectedWalletId: "phantom" });
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

      <div className="min-h-[420px] border border-[#22262f] bg-[#0c0e12]">
        <div className="flex items-center justify-between border-b border-[#22262f] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div aria-hidden className="size-3.5 bg-emerald-600" />
            <span className="text-[13px] font-semibold text-[#94969c]">
              demo dApp
            </span>
          </div>
          <WalletConnect
            wallets={wallets}
            status={status}
            open={open}
            onOpenChange={setOpen}
            onSelectWallet={handleSelectWallet}
            onSign={handleSign}
            onDisconnect={handleDisconnect}
            error={error}
            selectedWalletId={selectedWalletId}
            address={ADDRESS}
          />
        </div>
        <div aria-hidden className="grid grid-cols-3 gap-3 p-4">
          <div className="col-span-2 h-28 bg-[#12151c]" />
          <div className="h-28 bg-[#12151c]" />
          <div className="h-14 bg-[#12151c]" />
          <div className="h-14 bg-[#12151c]" />
          <div className="h-14 bg-[#12151c]" />
        </div>
      </div>
    </div>
  );
}
