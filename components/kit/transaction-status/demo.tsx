"use client";

/**
 * Docs demo for TransactionStatus. Cycles every state, simulating the
 * confirmation stream a real RPC subscription would deliver.
 * Not part of the copy-paste component.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import {
  TransactionStatus,
  type TransactionStatusErrorRule,
  type TransactionStatusState,
} from "./transaction-status";

// Anchor custom errors are program-specific — this maps Jupiter's 6001
// (0x1771). Integrators pass their own program's rules the same way.
const DEMO_ERROR_MAP: TransactionStatusErrorRule[] = [
  {
    test: /0x1771/i,
    text: "Price moved too much. Try again or increase slippage.",
  },
];

const SIGNATURE = "5tj8y9F3nQeR2m1kLp7VxAqW3sZ4bTn6uHc9dK1eMoP8";
const TOTAL = 31;

type DemoScenario = {
  label: string;
  status: TransactionStatusState;
  error?: string;
};

const SCENARIOS: DemoScenario[] = [
  { label: "Idle", status: "idle" },
  { label: "Pending", status: "pending" },
  { label: "Confirming", status: "confirming" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Failed — slippage", status: "failed", error: "0x1771" },
  { label: "Failed — no SOL", status: "failed", error: "insufficient lamports for fee" },
  { label: "Failed — timeout", status: "failed", error: "blockhash expired" },
  { label: "Failed — rejected", status: "failed", error: "user rejected the request" },
  {
    label: "Failed — unknown",
    status: "failed",
    error: "Program failed: custom program error: 0x64a2",
  },
];

export default function TransactionStatusDemo() {
  const [scenario, setScenario] = useState<DemoScenario>(SCENARIOS[0]);
  const [confirmations, setConfirmations] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSimulation = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (settleRef.current) clearTimeout(settleRef.current);
    timerRef.current = null;
    settleRef.current = null;
  }, []);

  useEffect(() => stopSimulation, [stopSimulation]);

  const activate = useCallback(
    (next: DemoScenario) => {
      stopSimulation();
      setScenario(next);
      if (next.status !== "confirming") return;
      // Simulate the confirmation stream, then settle into confirmed.
      setConfirmations(0);
      let count = 0;
      timerRef.current = setInterval(() => {
        count += Math.ceil(Math.random() * 4);
        if (count >= TOTAL) {
          count = TOTAL;
          stopSimulation();
          setConfirmations(count);
          settleRef.current = setTimeout(
            () => setScenario(SCENARIOS[3]),
            500,
          );
        } else {
          setConfirmations(count);
        }
      }, 180);
    },
    [stopSimulation],
  );

  const { status, error } = scenario;
  const isFailedScenario = (s: DemoScenario) =>
    s.status === "failed" && s.error === error;
  const detailsPrimary = `${status === "confirmed" ? "Sent" : "Sending"} 2.5 SOL`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo states">
        {SCENARIOS.map((s) => {
          const active =
            s.status === status &&
            (s.status !== "failed" || isFailedScenario(s));
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => activate(s)}
              className={`cursor-pointer px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
                active
                  ? "bg-[#00543f] text-[#18e3a5] hover:bg-[#006a53]"
                  : "border border-[#373a41] bg-[#13161b] text-[#f0f0f1] hover:bg-[#22262f]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[220px] border border-[#22262f] bg-[#161b26] p-6">
        {status === "idle" ? (
          <div className="flex h-[172px] flex-col items-center justify-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#333741]">
              <Clock aria-hidden className="size-[18px] text-[#61656c]" />
            </div>
            <div className="text-[14px] text-[#61656c]">
              No active transaction
            </div>
            <button
              type="button"
              onClick={() => activate(SCENARIOS[1])}
              className="mt-1 cursor-pointer bg-[#00543f] px-4 py-2 text-[13px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              New transaction
            </button>
          </div>
        ) : (
          <TransactionStatus
            status={status}
            signature={SIGNATURE}
            error={error}
            errorMap={DEMO_ERROR_MAP}
            confirmations={status === "confirming" ? confirmations : undefined}
            totalConfirmations={TOTAL}
            onRetry={() => activate(SCENARIOS[2])}
            onDismiss={() => activate(SCENARIOS[0])}
            details={{
              primary: detailsPrimary,
              secondary: "to sol.domain.eth",
              meta: "9xQe…F4kM",
            }}
            className="min-h-[172px]"
          />
        )}
      </div>
    </div>
  );
}
