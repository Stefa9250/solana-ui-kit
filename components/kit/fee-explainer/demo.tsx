"use client";

/**
 * Docs demo for FeeExplainer. State buttons force every case; the speed
 * selector is live, so changing it re-estimates through the mock oracle.
 *
 * Note the wiring: `loading` goes true on EVERY re-estimate, not just the
 * first. Showing the previous tier's price as current while a new one is in
 * flight is how users end up confirming a price that already moved.
 * Not part of the copy-paste component.
 */

import { useEffect, useState } from "react";
import { FeeExplainer, type FeeSpeed } from "./fee-explainer";
import {
  SPEEDS,
  SPEED_LABELS,
  estimateFee,
  mockFeeOracle,
  type FeeEstimate,
} from "./mock-fees";

const SCENARIOS = [
  "Default",
  "Expanded",
  "Congested",
  "Loading",
  "Unavailable",
  "Minimal",
] as const;

type Scenario = (typeof SCENARIOS)[number];

export default function FeeExplainerDemo() {
  const [scenario, setScenario] = useState<Scenario>("Default");
  const [speed, setSpeed] = useState<FeeSpeed>("normal");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // Stored with the inputs it was estimated for, so a stale figure can never
  // be shown against a newer speed or congestion state.
  const [market, setMarket] = useState<{ key: string; est: FeeEstimate } | null>(
    null,
  );

  const congested = scenario === "Congested";
  const forcedLoading = scenario === "Loading";
  const unavailable = scenario === "Unavailable";
  const minimal = scenario === "Minimal";
  const key = `${speed}-${congested}`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const est = await mockFeeOracle.estimate(speed, congested);
      if (cancelled) return;
      setMarket({ key: `${speed}-${congested}`, est });
    })();
    return () => {
      cancelled = true;
    };
  }, [speed, congested]);

  // Null the moment the inputs change — which is what makes `loading` honest.
  const fresh = market?.key === key ? market.est : null;
  const loading = forcedLoading || fresh === null;
  const showEstimate = !unavailable && fresh !== null;

  const speedOptions = SPEEDS.map((s) => {
    const e = estimateFee(s, congested);
    return {
      speed: s,
      label: SPEED_LABELS[s],
      // Under "unavailable" the tiers can't be quoted either — only timing.
      feeUsd: unavailable ? undefined : e.feeUsd,
      confirmTime: e.confirmTime,
    };
  });

  const runScenario = (label: Scenario) => {
    setScenario(label);
    setBreakdownOpen(label === "Expanded");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo states">
        {SCENARIOS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => runScenario(label)}
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

      <div className="border border-[#22262f] bg-[#0c0e12] p-6">
        <div className="mx-auto max-w-[420px]">
          <FeeExplainer
            feeUsd={showEstimate ? fresh.feeUsd : undefined}
            feeSol={showEstimate ? fresh.feeSol : undefined}
            confirmTime={showEstimate ? fresh.confirmTime : undefined}
            baseFeeUsd={showEstimate && !minimal ? fresh.baseFeeUsd : undefined}
            baseFeeSol={showEstimate && !minimal ? fresh.baseFeeSol : undefined}
            priorityFeeUsd={
              showEstimate && !minimal ? fresh.priorityFeeUsd : undefined
            }
            priorityFeeSol={
              showEstimate && !minimal ? fresh.priorityFeeSol : undefined
            }
            speed={minimal ? undefined : speed}
            onSpeedChange={minimal ? undefined : setSpeed}
            speedOptions={minimal ? undefined : speedOptions}
            congested={congested}
            loading={loading && !unavailable}
            open={breakdownOpen}
            onOpenChange={setBreakdownOpen}
          />
        </div>
      </div>
    </div>
  );
}
