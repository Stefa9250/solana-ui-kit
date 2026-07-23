/**
 * Mock token market — stands in for an RPC + price feed so the demo works
 * standalone. The input only needs a token, a balance, and a price; swap the
 * internals below and the UI doesn't change.
 *
 * Real integration sketch (inside a React component — hooks can't be called
 * from the plain functions below):
 *
 *   // Balance: native SOL vs SPL differ.
 *   const lamports = await connection.getBalance(publicKey);
 *   const sol = lamports / LAMPORTS_PER_SOL;
 *   // SPL:
 *   const { value } = await connection.getTokenAccountBalance(ata);
 *   const amount = Number(value.amount) / 10 ** value.decimals;
 *
 *   // Price: any feed works — Pyth, Jupiter, Birdeye, CoinGecko.
 *   const res = await fetch(`https://price.jup.ag/v6/price?ids=${symbol}`);
 *
 * Decimals below are the real on-chain values — SOL 9, USDC 6, BONK 5.
 */

import type { TokenInfo } from "./token-amount-input";

export const MOCK_TOKENS: TokenInfo[] = [
  {
    symbol: "SOL",
    name: "Solana",
    // Symbols are not unique on Solana — duplicate-symbol scam tokens are
    // routine — so lists key on the mint.
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    color: "#14f195",
    // Native SOL pays the fee, so MAX holds this back. SPL tokens leave it
    // undefined. A constant is a simplification: the honest figure is
    // rentExemptMin (890880 lamports) + baseFee x sigs + priority fee +
    // any accounts the transaction creates. Compute it per tx where you can.
    feeReserve: "0.01",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    color: "#2775ca",
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    color: "#f5ac37",
  },
];

/**
 * Deliberately awkward numbers: a large balance and a sub-cent price.
 * Strings, not numbers — a JS number loses bits above 2^53 raw units
 * (~9B USDC, ~9M SOL), and the component's exact path accepts strings.
 */
export const MOCK_BALANCES: Record<string, string> = {
  SOL: "12.45",
  USDC: "1234567.89",
  BONK: "48200000",
};

export const MOCK_PRICES: Record<string, string> = {
  SOL: "172.18",
  USDC: "1",
  BONK: "0.00002417",
};

/** A balance smaller than the fee reserve — MAX must not offer anything. */
export const DUST_SOL_BALANCE = "0.004";

export interface TokenMarket {
  getBalance(symbol: string): Promise<string>;
  getPrice(symbol: string): Promise<string>;
}

export const mockTokenMarket: TokenMarket = {
  async getBalance(symbol) {
    await new Promise((r) => setTimeout(r, 900));
    return MOCK_BALANCES[symbol] ?? "0";
  },
  async getPrice(symbol) {
    await new Promise((r) => setTimeout(r, 900));
    return MOCK_PRICES[symbol] ?? "0";
  },
};
