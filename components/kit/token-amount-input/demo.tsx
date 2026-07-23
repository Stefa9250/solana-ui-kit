"use client";

/**
 * Docs demo for TokenAmountInput. State buttons force every case; the token
 * pill is a live picker, and typing behaves exactly as it would in a dApp.
 * Not part of the copy-paste component.
 */

import { useState } from "react";
import { TokenAmountInput, type TokenInfo } from "./token-amount-input";
import { MOCK_BALANCES, MOCK_PRICES, MOCK_TOKENS } from "./mock-tokens";

const SCENARIOS = [
  "Empty",
  "Typing",
  "Max applied",
  "Insufficient",
  "Loading",
] as const;

type Scenario = (typeof SCENARIOS)[number];

export default function TokenAmountInputDemo() {
  const [token, setToken] = useState<TokenInfo>(MOCK_TOKENS[0]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [touchedByScenario, setTouchedByScenario] = useState<Scenario>("Empty");

  const balance = MOCK_BALANCES[token.symbol] ?? 0;
  const price = MOCK_PRICES[token.symbol] ?? 0;
  const maxValid = Math.max(balance - (token.feeReserve ?? 0), 0);

  const runScenario = (label: Scenario) => {
    setTouchedByScenario(label);
    setLoading(false);
    switch (label) {
      case "Empty":
        setValue("");
        break;
      case "Typing":
        setValue("2.5");
        break;
      case "Max applied":
        setValue(String(maxValid));
        break;
      case "Insufficient":
        setValue(String(balance * 2));
        break;
      case "Loading":
        setValue("");
        setLoading(true);
        break;
    }
  };

  const switchToken = (next: TokenInfo) => {
    setToken(next);
    // A balance from another token would be meaningless here.
    setValue("");
    setTouchedByScenario("Empty");
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
              label === touchedByScenario
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
            key={t.symbol}
            type="button"
            onClick={() => switchToken(t)}
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
            balance={loading ? undefined : balance}
            price={loading ? undefined : price}
            value={value}
            onChange={setValue}
            loading={loading}
            label="You pay"
            tokens={MOCK_TOKENS}
            onSelectToken={switchToken}
          />
        </div>
      </div>
    </div>
  );
}
