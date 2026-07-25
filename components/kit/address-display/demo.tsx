"use client";

/**
 * Docs demo for AddressDisplay. Buttons force every case; the inline chips
 * and the card variant both copy the full address to your clipboard.
 * Not part of the copy-paste component.
 */

import { useState } from "react";
import { AddressDisplay, type AddressKind } from "./address-display";

// Real mainnet addresses, so the avatars and explorer links are genuine.
const WALLET = "GK7zVzHYf7hM4dQxkNvR8mW2jL5tYbAcD9eF6gHiJkMq";
const PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"; // Jupiter v6
const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

const SCENARIOS = ["Wallet", "Named", "Program", "Token mint", "Loading"] as const;
type Scenario = (typeof SCENARIOS)[number];

export default function AddressDisplayDemo() {
  const [scenario, setScenario] = useState<Scenario>("Wallet");

  const config: {
    address: string;
    kind: AddressKind;
    name?: string;
    loading?: boolean;
  } =
    scenario === "Named"
      ? { address: WALLET, kind: "wallet", name: "stefan.sol" }
      : scenario === "Program"
        ? { address: PROGRAM, kind: "program", name: "Jupiter Aggregator" }
        : scenario === "Token mint"
          ? { address: MINT, kind: "token", name: "USD Coin" }
          : scenario === "Loading"
            ? { address: WALLET, kind: "wallet", loading: true }
            : { address: WALLET, kind: "wallet" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo states">
        {SCENARIOS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setScenario(label)}
            className={`cursor-pointer px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
              label === scenario
                ? "bg-[#00543f] text-[#18e3a5] hover:bg-[#006a53]"
                : "border border-[#373a41] bg-[#13161b] text-[#f0f0f1] hover:bg-[#22262f]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 border border-[#22262f] bg-[#0c0e12] p-6">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.04em] text-[#61656c]">
            Inline
          </span>
          <div>
            <AddressDisplay
              address={config.address}
              name={config.name}
              kind={config.kind}
              loading={config.loading}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.04em] text-[#61656c]">
            Card
          </span>
          <div className="max-w-[360px]">
            <AddressDisplay
              address={config.address}
              name={config.name}
              kind={config.kind}
              loading={config.loading}
              variant="card"
              showExplorer
            />
          </div>
        </div>
      </div>
    </div>
  );
}
