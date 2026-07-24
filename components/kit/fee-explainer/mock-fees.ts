/**
 * Mock fee oracle — stands in for an RPC + price feed so the demo works
 * standalone. The component only needs USD and SOL figures plus a time;
 * swap the internals below and the UI doesn't change.
 *
 * The shape here matters more than the numbers: a priority tier is NOT a flat
 * lamport amount, it's a price per compute unit. If you copy this file as a
 * starting point, keep that shape — a tier system built on flat lamports has
 * nowhere to put the compute budget and has to be redesigned when real data
 * arrives.
 *
 * REAL INTEGRATION
 *
 * Base fee — 5000 lamports *per signature*, and `lamports_per_signature` is a
 * cluster fee-governor parameter rather than a true constant. Don't hardcode
 * it: `getFeeForMessage(message)` returns the exact base fee for the actual
 * transaction you're about to send, signatures included.
 *
 *   const { value: lamports } = await connection.getFeeForMessage(message);
 *
 * Priority fee — sample what recent blocks actually paid for the accounts your
 * transaction writes to, then take a percentile per tier:
 *
 *   const recent = await connection.getRecentPrioritizationFees({
 *     lockedWritableAccounts: [somePubkey],
 *   });
 *   const microLamportsPerCu = percentile(recent.map(r => r.prioritizationFee), 0.75);
 *   const priorityLamports = Math.ceil(microLamportsPerCu * computeUnitLimit / 1e6);
 *
 * ⚠ Set ComputeUnitLimit as well as ComputeUnitPrice. If you set the price
 * without a limit, you are billed against the 200k-per-instruction default,
 * so the fee actually charged routinely EXCEEDS the estimate you showed the
 * user — an understatement, which is the direction that generates refunds.
 * Simulate first and set the limit to the units actually consumed (+ headroom).
 *
 * Congestion — not a boolean. It's the shape of the getRecentPrioritizationFees
 * distribution, which is the same data you derive the tiers from. The flat
 * multiplier below is a placeholder so the demo has something to show.
 *
 * Confirmation time — priority fees buy *inclusion probability in the next
 * leader's block*, not lower latency. Under real congestion the failure mode
 * isn't a slow confirm, it's the blockhash expiring after ~150 slots (~60-90s)
 * and the transaction being dropped. Treat every number below as a range with
 * a fat tail, and give users a retry path.
 *
 * Prices come from any feed — Pyth, Jupiter, Birdeye, CoinGecko.
 */

import type { ConfirmTime, FeeSpeed } from "./fee-explainer";

const LAMPORTS_PER_SOL = 1_000_000_000;
/** Matches the token-amount-input mock so the kit tells one story. */
const SOL_USD = 172.18;

/** Per signature — most transactions carry one, plenty carry more. */
const BASE_FEE_LAMPORTS_PER_SIGNATURE = 5_000;

/** The default compute budget an instruction is billed against. */
export const DEFAULT_COMPUTE_UNIT_LIMIT = 200_000;

/**
 * Rent-exempt minimum for a 165-byte SPL token account. Creating an
 * associated token account for a first-time recipient costs this — roughly
 * 200x a congested priority fee, and the single largest thing a "network fee"
 * line can silently omit. It is recoverable: closing the account returns it.
 */
export const ATA_RENT_LAMPORTS = 2_039_280;

/**
 * What a tier actually is: a price per compute unit, in micro-lamports.
 * Multiply by the transaction's compute unit limit to get lamports.
 */
const PRIORITY_MICRO_LAMPORTS_PER_CU: Record<FeeSpeed, number> = {
  normal: 10_000,
  fast: 50_000,
  turbo: 200_000,
};

/**
 * Placeholder only. Real congestion moves the p75 prioritization fee by two to
 * four orders of magnitude, not a tidy constant — derive this from sampled
 * data, never from a number someone typed.
 */
const CONGESTION_MULTIPLIER = 25;

/** Ranges only. A bare "~1s" claims precision the network cannot give. */
const CONFIRM_TIME: Record<FeeSpeed, { calm: ConfirmTime; busy: ConfirmTime }> =
  {
    normal: { calm: [2, 5], busy: [10, 60] },
    fast: { calm: [2, 4], busy: [5, 20] },
    turbo: { calm: [1, 3], busy: [2, 10] },
  };

export const SPEED_LABELS: Record<FeeSpeed, string> = {
  normal: "Normal",
  fast: "Fast",
  turbo: "Turbo",
};

export const SPEEDS: FeeSpeed[] = ["normal", "fast", "turbo"];

export interface FeeParams {
  /** Set this from a simulation, not from hope. */
  computeUnitLimit?: number;
  numSignatures?: number;
  /** Recipient has no token account yet — adds recoverable rent. */
  createsAta?: boolean;
}

export interface FeeEstimate {
  feeUsd: number;
  feeSol: number;
  baseFeeUsd: number;
  baseFeeSol: number;
  priorityFeeUsd: number;
  priorityFeeSol: number;
  confirmTime: ConfirmTime;
  /** Costs that aren't the network fee but that the user still pays. */
  rentUsd?: number;
  rentSol?: number;
}

export function estimateFee(
  speed: FeeSpeed,
  congested = false,
  params: FeeParams = {},
): FeeEstimate {
  const {
    computeUnitLimit = DEFAULT_COMPUTE_UNIT_LIMIT,
    numSignatures = 1,
    createsAta = false,
  } = params;

  const baseLamports = BASE_FEE_LAMPORTS_PER_SIGNATURE * numSignatures;
  const microPerCu =
    PRIORITY_MICRO_LAMPORTS_PER_CU[speed] * (congested ? CONGESTION_MULTIPLIER : 1);
  // Lamports are integers — the runtime ceils, so we ceil.
  const priorityLamports = Math.ceil((microPerCu * computeUnitLimit) / 1e6);

  const toSol = (l: number) => l / LAMPORTS_PER_SOL;
  const baseSol = toSol(baseLamports);
  const prioritySol = toSol(priorityLamports);
  const feeSol = baseSol + prioritySol;
  const rentSol = createsAta ? toSol(ATA_RENT_LAMPORTS) : undefined;

  return {
    feeSol,
    feeUsd: feeSol * SOL_USD,
    baseFeeSol: baseSol,
    baseFeeUsd: baseSol * SOL_USD,
    priorityFeeSol: prioritySol,
    priorityFeeUsd: prioritySol * SOL_USD,
    rentSol,
    rentUsd: rentSol === undefined ? undefined : rentSol * SOL_USD,
    confirmTime: congested
      ? CONFIRM_TIME[speed].busy
      : CONFIRM_TIME[speed].calm,
  };
}

export interface FeeOracle {
  estimate(
    speed: FeeSpeed,
    congested: boolean,
    params?: FeeParams,
  ): Promise<FeeEstimate>;
}

export const mockFeeOracle: FeeOracle = {
  async estimate(speed, congested, params) {
    await new Promise((r) => setTimeout(r, 900));
    return estimateFee(speed, congested, params);
  },
};
