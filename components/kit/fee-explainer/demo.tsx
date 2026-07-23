"use client";

/**
 * Docs demo for FeeExplainer. State buttons force every case; the speed
 * selector is live, so changing it re-estimates through the mock oracle and
 * you can watch the values tick.
 * Not part of the copy-paste component.
 */

import { useEffect, useRef, useState } from "react";
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
  const [estimate, setEstimate] = useState<FeeEstimate | null>(null);
  const fetchRef = useRef(0);

  const congested = scenario === "Congested";
  const forcedLoading = scenario === "Loading";
  const unavailable = scenario === "Unavailable";
  const minimal = scenario === "Minimal";
  const expanded = scenario === "Expanded";

  // Re-estimate whenever speed or congestion changes — a real fee refresh.
  useEffect(() => {
    const attempt = ++fetchRef.current;
    void (async () => {
      const next = await mockFeeOracle.estimate(speed, congested);
      if (fetchRef.current !== attempt) return;
      setEstimate(next);
    })();
  }, [speed, congested]);

  const loading = forcedLoading || estimate === null;
  const showEstimate = !unavailable && !loading && estimate !== null;

  // The selector needs each tier's cost up front, not just the selected one.
  const speedOptions = SPEEDS.map((s) => {
    const e = estimateFee(s, congested);
    return {
      speed: s,
      label: SPEED_LABELS[s],
      feeUsd: e.feeUsd,
      confirmTime: e.confirmTime,
    };
  });

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

      <div className="border border-[#22262f] bg-[#0c0e12] p-6">
        <div className="mx-auto max-w-[420px]">
          <FeeExplainer
            feeUsd={showEstimate ? estimate.feeUsd : undefined}
            feeSol={showEstimate ? estimate.feeSol : undefined}
            confirmTime={showEstimate ? estimate.confirmTime : undefined}
            baseFeeUsd={
              showEstimate && !minimal ? estimate.baseFeeUsd : undefined
            }
            baseFeeSol={
              showEstimate && !minimal ? estimate.baseFeeSol : undefined
            }
            priorityFeeUsd={
              showEstimate && !minimal ? estimate.priorityFeeUsd : undefined
            }
            priorityFeeSol={
              showEstimate && !minimal ? estimate.priorityFeeSol : undefined
            }
            speed={minimal ? undefined : speed}
            onSpeedChange={minimal ? undefined : setSpeed}
            speedOptions={minimal ? undefined : speedOptions}
            congested={congested}
            loading={loading && !unavailable}
            open={expanded ? true : undefined}
          />
        </div>
      </div>
    </div>
  );
}
