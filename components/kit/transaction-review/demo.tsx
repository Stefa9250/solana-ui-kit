"use client";

/**
 * Docs demo for TransactionReview. Buttons pick a scenario, which "simulates"
 * through the mock (skeleton for ~900ms) and then shows the review; Sign runs
 * a brief signing state. The "Malicious" scenario shows the block verdict —
 * note Reject becomes the prominent action.
 * Not part of the copy-paste component.
 */

import { useEffect, useRef, useState } from "react";
import { DemoStage } from "@/components/docs/demo-stage";
import { TransactionReview } from "./transaction-review";
import {
  SIMULATION_SCENARIOS,
  simulate,
  type SimulationScenario,
} from "./mock-simulation";

const SCENARIOS = [
  { key: "swap", label: "Swap" },
  { key: "send", label: "Send (new recipient)" },
  { key: "drain", label: "Malicious" },
  { key: "noChange", label: "No balance change" },
  { key: "failed", label: "Preview failed" },
] as const;
type ScenarioKey = (typeof SCENARIOS)[number]["key"];

export default function TransactionReviewDemo() {
  const [scenario, setScenario] = useState<ScenarioKey>("swap");
  // Keyed by the scenario it was fetched for, so a stale result can't show
  // against a newly selected one — and only the async callback sets state.
  const [sim, setSim] = useState<{ key: ScenarioKey; data: SimulationScenario } | null>(
    null,
  );
  const [signing, setSigning] = useState(false);
  const fetchRef = useRef(0);

  const failed = scenario === "failed";

  useEffect(() => {
    if (failed) return;
    const attempt = ++fetchRef.current;
    void (async () => {
      const result = await simulate(scenario as keyof typeof SIMULATION_SCENARIOS);
      if (fetchRef.current !== attempt) return;
      setSim({ key: scenario, data: result });
    })();
  }, [scenario, failed]);

  const fresh = !failed && sim?.key === scenario ? sim.data : null;
  const simulating = !failed && fresh === null;

  const sign = () => {
    setSigning(true);
    setTimeout(() => setSigning(false), 1600);
  };

  const code = failed
    ? `<TransactionReview
  origin="free-airdrop-claim.xyz"
  simulationFailed
  onSign={sign}
  onReject={reject}
/>`
    : `<TransactionReview
  origin="${fresh?.origin ?? "jup.ag"}"${fresh?.originVerified ? "\n  originVerified" : ""}
  assets={assets}${fresh?.approvals?.length ? "\n  approvals={approvals}" : ""}
  warnings={warnings}
  feeSol={${fresh?.feeSol ?? 0.0000075}}${fresh?.simulatedBy ? `\n  simulatedBy="${fresh.simulatedBy}"` : ""}${fresh?.severity ? `\n  severity="${fresh.severity}"` : ""}
  onSign={sign}
  onReject={reject}
/>`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo states">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setScenario(s.key)}
            className={`cursor-pointer px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
              s.key === scenario
                ? "bg-[#00543f] text-[#18e3a5] hover:bg-[#006a53]"
                : "border border-[#373a41] bg-[#13161b] text-[#f0f0f1] hover:bg-[#22262f]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <DemoStage contentClassName="mx-auto max-w-[400px]" code={code}>
        <TransactionReview
          origin={failed ? "free-airdrop-claim.xyz" : fresh?.origin}
          originVerified={fresh?.originVerified}
          assets={fresh?.assets}
          approvals={fresh?.approvals}
          warnings={fresh?.warnings}
          feeUsd={fresh?.feeUsd}
          feeSol={fresh?.feeSol}
          simulatedBy={fresh?.simulatedBy}
          severity={fresh?.severity}
          simulating={simulating}
          simulationFailed={failed}
          signing={signing}
          onSign={sign}
          onReject={() => {}}
        />
      </DemoStage>
    </div>
  );
}
