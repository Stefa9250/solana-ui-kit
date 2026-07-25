"use client";

/**
 * Docs demo for StateScreen. Buttons switch between the shipped presets;
 * "RPC down" wires a real retry with a busy spinner and a technical-detail
 * view. (Network congestion is intentionally NOT here — the kit models that
 * as FeeExplainer's inline banner, not a full-screen dead-end.)
 * Not part of the copy-paste component.
 */

import { useState } from "react";
import { StateScreen, STATE_PRESETS } from "./state-screen";

const SCENARIOS = [
  "RPC down",
  "Rate limited",
  "Wrong network",
  "No tokens",
  "No transactions",
  "Not connected",
] as const;
type Scenario = (typeof SCENARIOS)[number];

export default function StateScreenDemo() {
  const [scenario, setScenario] = useState<Scenario>("RPC down");
  const [retrying, setRetrying] = useState(false);

  const retry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 1600);
  };

  const node = (() => {
    switch (scenario) {
      case "RPC down":
        return (
          <StateScreen
            {...STATE_PRESETS.rpcDown}
            action={{ label: "Try again", onClick: retry, busyLabel: "Retrying…" }}
            secondaryAction={{
              label: "Network status",
              href: "https://status.solana.com",
            }}
            errorDetail="fetch failed: 503 Service Unavailable (api.mainnet-beta.solana.com)"
            busy={retrying}
          />
        );
      case "Rate limited":
        return <StateScreen {...STATE_PRESETS.rateLimited} />;
      case "Wrong network":
        return (
          <StateScreen
            {...STATE_PRESETS.wrongNetwork}
            action={{ label: "Switch to mainnet", onClick: () => {} }}
          />
        );
      case "No tokens":
        return (
          <StateScreen
            {...STATE_PRESETS.noTokens}
            action={{ label: "Receive tokens", onClick: () => {} }}
          />
        );
      case "No transactions":
        return <StateScreen {...STATE_PRESETS.noTransactions} />;
      case "Not connected":
        return (
          <StateScreen
            {...STATE_PRESETS.notConnected}
            action={{ label: "Connect wallet", onClick: () => {} }}
          />
        );
    }
  })();

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

      <div className="border border-[#22262f] bg-[#0c0e12]">{node}</div>
    </div>
  );
}
