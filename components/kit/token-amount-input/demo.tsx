"use client";

/**
 * Docs demo for TokenAmountInput. State buttons force every case; the token
 * pill is a live picker, and typing behaves exactly as it would in a dApp.
 *
 * Switching tokens deliberately KEEPS the amount, so the decimal re-clamp is
 * visible (SOL 9dp -> USDC 6dp truncates the extra digits) rather than hidden.
 * Not part of the copy-paste component.
 */

import { useEffect, useRef, useState } from "react";
import {
  TokenAmountInput,
  type TokenAmountValidity,
  type TokenInfo,
} from "./token-amount-input";
import {
  DUST_SOL_BALANCE,
  MOCK_BALANCES,
  MOCK_TOKENS,
  mockTokenMarket,
} from "./mock-tokens";

const SCENARIOS = [
  "Empty",
  "Typing",
  "Max applied",
  "Eats fee reserve",
  "Insufficient",
  "Dust balance",
  "Loading",
  "Disabled",
  "Single token",
] as const;

type Scenario = (typeof SCENARIOS)[number];

export default function TokenAmountInputDemo() {
  const [token, setToken] = useState<TokenInfo>(MOCK_TOKENS[0]);
  const [value, setValue] = useState("");
  const [scenario, setScenario] = useState<Scenario>("Empty");
  const [validity, setValidity] = useState<TokenAmountValidity | null>(null);
  // Live-fetched via the mock market so the skeleton is exercised for real.
  // Stored with the symbol it belongs to, so a stale token's numbers can
  // never be shown against a newly selected one.
  const [market, setMarket] = useState<{
    symbol: string;
    balance: string;
    price: string;
  } | null>(null);
  const fetchRef = useRef(0);

  useEffect(() => {
    const attempt = ++fetchRef.current;
    void (async () => {
      const [balance, price] = await Promise.all([
        mockTokenMarket.getBalance(token.symbol),
        mockTokenMarket.getPrice(token.symbol),
      ]);
      if (fetchRef.current !== attempt) return;
      setMarket({ symbol: token.symbol, balance, price });
    })();
  }, [token.symbol]);

  const fresh = market?.symbol === token.symbol ? market : null;
  const loading = scenario === "Loading" || fresh === null;
  const disabled = scenario === "Disabled";
  const singleToken = scenario === "Single token";
  const effectiveBalance =
    scenario === "Dust balance" && token.symbol === "SOL"
      ? DUST_SOL_BALANCE
      : fresh?.balance;
  const price = fresh?.price;

  const runScenario = (label: Scenario) => {
    setScenario(label);
    const bal = MOCK_BALANCES[token.symbol] ?? "0";
    const reserve = Number(token.feeReserve ?? 0);
    switch (label) {
      case "Empty":
      case "Loading":
      case "Disabled":
      case "Single token":
        setValue("");
        break;
      case "Typing":
        setValue("2.5");
        break;
      case "Max applied":
        setValue(String(Math.max(Number(bal) - reserve, 0)));
        break;
      case "Eats fee reserve":
        // Inside the balance, but leaves nothing to pay the fee with.
        setValue(bal);
        break;
      case "Insufficient":
        setValue(String(Number(bal) * 2));
        break;
      case "Dust balance":
        setValue("");
        break;
    }
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

      <div className="flex flex-wrap gap-2" role="group" aria-label="Token">
        {MOCK_TOKENS.map((t) => (
          <button
            key={t.mint ?? t.symbol}
            type="button"
            onClick={() => setToken(t)}
            className={`cursor-pointer px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
              t.symbol === token.symbol
                ? "bg-[#00543f] text-[#18e3a5] hover:bg-[#006a53]"
                : "border border-[#373a41] bg-[#13161b] text-[#f0f0f1] hover:bg-[#22262f]"
            }`}
          >
            {t.symbol}
            <span className="ml-1.5 font-normal text-[#61656c]">
              {t.decimals}d
            </span>
          </button>
        ))}
      </div>

      <div className="border border-[#22262f] bg-[#0c0e12] p-6">
        <div className="mx-auto max-w-[420px]">
          <TokenAmountInput
            token={token}
            balance={effectiveBalance}
            price={price}
            value={value}
            onChange={setValue}
            onValidityChange={setValidity}
            loading={loading}
            disabled={disabled}
            label="You pay"
            tokens={singleToken ? undefined : MOCK_TOKENS}
            onSelectToken={singleToken ? undefined : setToken}
          />

          {/* Proves onValidityChange is usable for gating a real submit. */}
          <button
            type="button"
            disabled={!validity?.valid}
            className="mt-4 w-full cursor-pointer bg-[#00543f] px-4 py-2.5 text-[13px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40"
          >
            {validity?.insufficient
              ? "Not enough balance"
              : validity?.exceedsReserve
                ? "Leaves nothing for fees"
                : "Review send"}
          </button>
        </div>
      </div>
    </div>
  );
}
