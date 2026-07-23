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
    decimals: 9,
    color: "#14f195",
    // Native SOL pays the fee and must stay rent-exempt, so MAX holds this
    // back. SPL tokens leave it undefined.
    feeReserve: 0.01,
  },
  { symbol: "USDC", name: "USD Coin", decimals: 6, color: "#2775ca" },
  { symbol: "BONK", name: "Bonk", decimals: 5, color: "#f5ac37" },
];

/** Deliberately awkward numbers: a large balance and a sub-cent price. */
export const MOCK_BALANCES: Record<string, number> = {
  SOL: 12.45,
  USDC: 1234567.89,
  BONK: 48200000,
};

export const MOCK_PRICES: Record<string, number> = {
  SOL: 172.18,
  USDC: 1,
  BONK: 0.00002417,
};

export interface TokenMarket {
  getBalance(symbol: string): Promise<number>;
  getPrice(symbol: string): Promise<number>;
}

export const mockTokenMarket: TokenMarket = {
  async getBalance(symbol) {
    await new Promise((r) => setTimeout(r, 900));
    return MOCK_BALANCES[symbol] ?? 0;
  },
  async getPrice(symbol) {
    await new Promise((r) => setTimeout(r, 900));
    return MOCK_PRICES[symbol] ?? 0;
  },
};
