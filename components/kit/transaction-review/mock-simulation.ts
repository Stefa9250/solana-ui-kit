/**
 * Mock simulation — stands in for a real preview so the demo works standalone.
 * The component only needs asset changes + warnings + a fee; swap the
 * internals and the UI doesn't change.
 *
 * Real integration:
 *
 *   // 1) Net balance changes — simulate and diff pre/post token balances.
 *   const sim = await connection.simulateTransaction(vtx, {
 *     accounts: { encoding: "base64", addresses: writableTokenAccounts },
 *     replaceRecentBlockhash: true,
 *   });
 *   // Decode the returned account data, compare to current balances, and
 *   // convert raw amounts to human units with each mint's decimals.
 *
 *   // 2) Warnings — a transaction scanner turns raw instructions into
 *   //    human risks (unlimited approvals, known-malicious programs, a
 *   //    recipient you've never sent to). Blowfish, or your own heuristics.
 *
 *   // 3) Fee — getFeeForMessage(message); price from any feed.
 *
 * Never hard-block on a failed simulation: pass simulationFailed and let the
 * user decide, rather than trapping them.
 */

import type { ReviewAsset, ReviewWarning } from "./transaction-review";

const SOL_ICON =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzOTcgMzExIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIzNjAuOSIgeTE9IjM1MS41IiB4Mj0iMTQxLjIiIHkyPSItNjkuMyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzAwRkZBMyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0RDMUZGRiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZykiIGQ9Ik02NC42IDIzNy45YzIuNC0yLjQgNS43LTMuOCA5LjItMy44aDMxNy40YzUuOCAwIDguNyA3IDQuNiAxMS4xbC02Mi43IDYyLjdjLTIuNCAyLjQtNS43IDMuOC05LjIgMy44SDYuNWMtNS44IDAtOC43LTctNC42LTExLjFsNjIuNy02Mi43eiIvPjxwYXRoIGZpbGw9InVybCgjZykiIGQ9Ik02NC42IDMuOEM2Ny4xIDEuNCA3MC40IDAgNzMuOSAwaDMxNy40YzUuOCAwIDguNyA3IDQuNiAxMS4xbC02Mi43IDYyLjdjLTIuNCAyLjQtNS43IDMuOC05LjIgMy44SDYuNWMtNS44IDAtOC43LTctNC42LTExLjFMNjQuNiAzLjh6Ii8+PHBhdGggZmlsbD0idXJsKCNnKSIgZD0iTTMzMi4zIDEyMC40Yy0yLjQtMi40LTUuNy0zLjgtOS4yLTMuOEg1LjdjLTUuOCAwLTguNyA3LTQuNiAxMS4xbDYyLjcgNjIuN2MyLjQgMi40IDUuNyAzLjggOS4yIDMuOGgzMTcuNGM1LjggMCA4LjctNyA0LjYtMTEuMWwtNjIuNy02Mi43eiIvPjwvc3ZnPg==";

export interface SimulationScenario {
  origin: string;
  assets: ReviewAsset[];
  warnings: ReviewWarning[];
  feeUsd: number;
  feeSol: number;
  severity?: "safe" | "warn" | "block";
}

export const SIMULATION_SCENARIOS: Record<string, SimulationScenario> = {
  // A clean swap — you pay SOL, you receive USDC.
  swap: {
    origin: "jup.ag",
    assets: [
      { symbol: "SOL", amount: "2.5", usd: 430.45, direction: "out", icon: SOL_ICON },
      {
        symbol: "USDC",
        amount: "428.10",
        usd: 428.1,
        direction: "in",
        color: "#2775ca",
      },
    ],
    warnings: [],
    feeUsd: 0.0013,
    feeSol: 0.0000075,
  },
  // A plain send to an address never transacted with before.
  send: {
    origin: "app.squads.so",
    assets: [
      { symbol: "SOL", amount: "10", usd: 1721.8, direction: "out", icon: SOL_ICON },
    ],
    warnings: [
      {
        level: "warn",
        title: "New recipient",
        detail:
          "You’ve never sent to this address before. Double-check it matches — address-poisoning scams seed lookalikes into your history.",
      },
    ],
    feeUsd: 0.0009,
    feeSol: 0.000005,
  },
  // The dangerous one: an unlimited token approval to an unknown program.
  drain: {
    origin: "free-airdrop-claim.xyz",
    assets: [
      { symbol: "USDC", amount: "0", usd: 0, direction: "out", color: "#2775ca" },
    ],
    warnings: [
      {
        level: "danger",
        title: "Grants unlimited access to your USDC",
        detail:
          "This approves an unknown program to move ALL of your USDC, now and in future, with no cap. Legitimate apps request only the amount they need. Rejecting is strongly recommended.",
      },
      {
        level: "warn",
        title: "Unverified program",
        detail: "This program isn’t in any known registry.",
      },
    ],
    feeUsd: 0.0011,
    feeSol: 0.0000064,
    severity: "block",
  },
  // A stake/vote-style tx that moves nothing.
  noChange: {
    origin: "marinade.finance",
    assets: [],
    warnings: [],
    feeUsd: 0.0009,
    feeSol: 0.000005,
  },
};

export function simulate(key: keyof typeof SIMULATION_SCENARIOS) {
  return new Promise<SimulationScenario>((resolve) =>
    setTimeout(() => resolve(SIMULATION_SCENARIOS[key]), 900),
  );
}
