/**
 * Mock fee oracle — stands in for an RPC + price feed so the demo works
 * standalone. The component only needs USD and SOL figures plus a time;
 * swap the internals below and the UI doesn't change.
 *
 * Real integration sketch:
 *
 *   // Priority fee: sample what recent blocks actually paid for the accounts
 *   // your transaction writes to, then pick a percentile per speed tier.
 *   const recent = await connection.getRecentPrioritizationFees({
 *     lockedWritableAccounts: [somePubkey],
 *   });
 *   const micros = percentile(recent.map((r) => r.prioritizationFee), 0.75);
 *
 *   // Priority lamports = microLamportsPerCU * computeUnitLimit / 1e6.
 *   const priorityLamports = (micros * computeUnitLimit) / 1_000_000;
 *
 *   // Base fee is 5000 lamports per signature.
 *   const baseLamports = 5000 * numSignatures;
 *
 *   // Or use a provider endpoint (Helius getPriorityFeeEstimate, Triton).
 *   // USD needs a SOL price from any feed — Pyth, Jupiter, CoinGecko.
 *
 * Everything below is expressed in lamports and converted once, because the
 * component's contract is that lamports never reach the user.
 */

import type { ConfirmTime, FeeSpeed } from "./fee-explainer";

const LAMPORTS_PER_SOL = 1_000_000_000;
/** Matches the token-amount-input mock so the kit tells one story. */
const SOL_USD = 172.18;

/** 5000 lamports per signature — fixed by the runtime, not the market. */
const BASE_FEE_LAMPORTS = 5000;

/** Priority lamports per tier at a calm network. */
const PRIORITY_LAMPORTS: Record<FeeSpeed, number> = {
  normal: 5_000,
  fast: 25_000,
  turbo: 100_000,
};

/** Only the priority portion reacts to congestion; the base fee is fixed. */
const CONGESTION_MULTIPLIER = 6;

const CONFIRM_TIME: Record<FeeSpeed, { calm: ConfirmTime; busy: ConfirmTime }> = {
  normal: { calm: [2, 5], busy: [5, 15] },
  fast: { calm: [1, 3], busy: [2, 6] },
  turbo: { calm: 1, busy: [1, 2] },
};

export const SPEED_LABELS: Record<FeeSpeed, string> = {
  normal: "Normal",
  fast: "Fast",
  turbo: "Turbo",
};

export const SPEEDS: FeeSpeed[] = ["normal", "fast", "turbo"];

export interface FeeEstimate {
  feeUsd: number;
  feeSol: number;
  baseFeeUsd: number;
  baseFeeSol: number;
  priorityFeeUsd: number;
  priorityFeeSol: number;
  confirmTime: ConfirmTime;
}

export function estimateFee(speed: FeeSpeed, congested = false): FeeEstimate {
  const priorityLamports =
    PRIORITY_LAMPORTS[speed] * (congested ? CONGESTION_MULTIPLIER : 1);
  const baseSol = BASE_FEE_LAMPORTS / LAMPORTS_PER_SOL;
  const prioritySol = priorityLamports / LAMPORTS_PER_SOL;
  return {
    feeSol: baseSol + prioritySol,
    feeUsd: (baseSol + prioritySol) * SOL_USD,
    baseFeeSol: baseSol,
    baseFeeUsd: baseSol * SOL_USD,
    priorityFeeSol: prioritySol,
    priorityFeeUsd: prioritySol * SOL_USD,
    confirmTime: congested
      ? CONFIRM_TIME[speed].busy
      : CONFIRM_TIME[speed].calm,
  };
}

export interface FeeOracle {
  /** Rejects to exercise the "estimate unavailable" fallback. */
  estimate(speed: FeeSpeed, congested: boolean): Promise<FeeEstimate>;
}

export const mockFeeOracle: FeeOracle = {
  async estimate(speed, congested) {
    await new Promise((r) => setTimeout(r, 900));
    return estimateFee(speed, congested);
  },
};
