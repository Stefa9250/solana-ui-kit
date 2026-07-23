"use client";

/**
 * TokenAmountInput — Solana UI Kit
 *
 * The boring-but-critical parts of a token amount field, done properly:
 * per-token decimal caps, exact base-unit math (never 0.30000000000000004),
 * thousands separators that survive typing (caret included), a MAX that
 * leaves rent behind, and a calm correction — not a red alarm — when the
 * amount is larger than the balance.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file.
 *
 * <TokenAmountInput
 *   token={SOL}
 *   balance={12.45}
 *   price={172.18}
 *   value={amount}
 *   onChange={setAmount}
 *   onMax={(v) => track("max", v)}
 * />
 */

import {
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";

export interface TokenInfo {
  symbol: string;
  name?: string;
  /** On-chain decimals — SOL 9, USDC 6, BONK 5. Caps what can be typed. */
  decimals: number;
  /** Logo URL or data URI. Falls back to a colored initial. */
  icon?: string;
  /** Brand color behind the initial fallback. */
  color?: string;
  /**
   * Held back by MAX so the account stays rent-exempt and can still pay
   * fees. Native SOL only — leave undefined for SPL tokens.
   */
  feeReserve?: number;
}

export interface TokenAmountInputProps {
  token: TokenInfo;
  /** Human-unit balance (12.45). Omit while it's still loading. */
  balance?: number;
  /** USD price per whole token. Omit while it's still loading. */
  price?: number;
  /** Amount as a plain decimal string, always in token units ("1.25"). */
  value: string;
  onChange: (value: string) => void;
  /** Fired after MAX fills the field, with the amount it used. */
  onMax?: (value: string) => void;
  /** Balance/price still fetching — shows skeletons, input disabled. */
  loading?: boolean;
  disabled?: boolean;
  /** Field label (visible). Defaults to "Amount". */
  label?: string;
  /** Supplying more than one turns the token pill into a picker. */
  tokens?: TokenInfo[];
  onSelectToken?: (token: TokenInfo) => void;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Number handling — all comparison/subtraction happens in base units
 * (BigInt), so nothing ever round-trips through a float.
 * ------------------------------------------------------------------ */

/** Digits and at most one dot, decimals capped per token. Never throws. */
function sanitizeAmount(raw: string, decimals: number): string {
  let s = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  if (s.startsWith(".")) s = "0" + s;
  s = s.replace(/^0+(?=\d)/, "");
  if (decimals <= 0) return s.split(".")[0];
  const [int, frac] = s.split(".");
  return frac === undefined ? int : int + "." + frac.slice(0, decimals);
}

/** 1234567.89 -> "1,234,567.89". Keeps a trailing dot and typed zeros. */
function groupThousands(s: string): string {
  if (!s) return "";
  const [int, frac] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === undefined ? grouped : grouped + "." + frac;
}

function toBaseUnits(s: string, decimals: number): bigint {
  if (!s || s === ".") return BigInt(0);
  const [int, frac = ""] = s.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt((int || "0") + (decimals > 0 ? padded : ""));
}

function fromBaseUnits(v: bigint, decimals: number): string {
  if (decimals <= 0) return v.toString();
  const s = v.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}

/** toFixed first so a float balance can't smuggle in binary noise. */
function numberToBaseUnits(n: number, decimals: number): bigint {
  if (!Number.isFinite(n) || n <= 0) return BigInt(0);
  return toBaseUnits(n.toFixed(decimals), decimals);
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

function formatUsd(v: number): string {
  if (!Number.isFinite(v)) return "$0.00";
  if (v > 0 && v < 0.01) return "<$0.01";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Readable token quantity — full precision is noise in a preview line. */
function formatTokenDisplay(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "0";
  return groupThousands(trimZeros(n.toFixed(Math.min(decimals, 6))));
}

/* ------------------------------------------------------------------ */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/** Inject the kit stylesheet once per document, however many mount. */
function useKitStyles(id: string, css: string) {
  useInsertionEffect(() => {
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const STYLE_ID = "sol-tai-styles";
const KEYFRAMES = `
@keyframes sol-tai-tick { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-tai-settle { from { opacity: 0.5; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
@keyframes sol-tai-note { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-tai-swap-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-tai-swap-down { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-tai-shimmer { from { transform: translateX(-100%); } to { transform: translateX(220%); } }
@keyframes sol-tai-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.sol-tai-tick { animation: sol-tai-tick 150ms cubic-bezier(0.32,0.72,0,1) both; }
.sol-tai-settle { animation: sol-tai-settle 260ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-tai-note { animation: sol-tai-note 200ms cubic-bezier(0.32,0.72,0,1) both; }
.sol-tai-swap-up { animation: sol-tai-swap-up 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-tai-swap-down { animation: sol-tai-swap-down 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-tai-pop { animation: sol-tai-pop 160ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-tai-skeleton { position: relative; overflow: hidden; background: var(--sk-fill,#22262f); }
.sol-tai-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: sol-tai-shimmer 1.6s cubic-bezier(0.4,0,0.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .sol-tai-tick, .sol-tai-settle, .sol-tai-note, .sol-tai-swap-up, .sol-tai-swap-down, .sol-tai-pop {
    animation: none !important;
  }
  .sol-tai-skeleton::after { animation: none !important; display: none; }
}
`;

function TokenGlyph({ token, size = 24 }: { token: TokenInfo; size?: number }) {
  if (token.icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data-URI logos need no optimization
      <img
        src={token.icon}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="shrink-0 rounded-full object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-[var(--sk-bg,#0c0e12)]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: token.color ?? "#94969c",
      }}
    >
      {token.symbol.slice(0, 1)}
    </span>
  );
}

export function TokenAmountInput({
  token,
  balance,
  price,
  value,
  onChange,
  onMax,
  loading = false,
  disabled = false,
  label = "Amount",
  tokens,
  onSelectToken,
  className,
}: TokenAmountInputProps) {
  const [mode, setMode] = useState<"token" | "usd">("token");
  const [usdDraft, setUsdDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [settling, setSettling] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputId = `sol-tai-${token.symbol.toLowerCase()}`;

  const reduceMotion = useReducedMotion();
  useKitStyles(STYLE_ID, KEYFRAMES);

  const decimals = token.decimals;
  const isBusy = loading || disabled;
  const hasPrice = price !== undefined && price > 0;

  /* --- derived amounts, all in exact base units --- */
  const balanceBase =
    balance === undefined ? null : numberToBaseUnits(balance, decimals);
  const reserveBase = token.feeReserve
    ? numberToBaseUnits(token.feeReserve, decimals)
    : BigInt(0);
  const maxBase =
    balanceBase === null
      ? null
      : balanceBase > reserveBase
        ? balanceBase - reserveBase
        : BigInt(0);
  const maxAmount = maxBase === null ? null : fromBaseUnits(maxBase, decimals);
  const amountBase = toBaseUnits(value, decimals);

  const insufficient =
    !isBusy && balanceBase !== null && amountBase > balanceBase;
  const reservedApplied =
    reserveBase > BigInt(0) &&
    maxBase !== null &&
    value !== "" &&
    amountBase === maxBase;

  /* --- the two lines: whichever isn't being typed shows the conversion --- */
  const rawForMode = mode === "token" ? value : usdDraft;
  const displayValue = groupThousands(rawForMode);

  let secondaryText: string | null = null;
  if (hasPrice) {
    if (mode === "token") {
      secondaryText = formatUsd(value ? Number(value) * price! : 0);
    } else {
      const qty = usdDraft ? Number(usdDraft) / price! : 0;
      secondaryText = `${formatTokenDisplay(qty, decimals)} ${token.symbol}`;
    }
  }

  const balanceText =
    balance === undefined
      ? null
      : `${formatTokenDisplay(balance, decimals)} ${token.symbol}`;

  /* --- caret survives re-formatting --- */
  useIsoLayoutEffect(() => {
    if (caretRef.current === null || !inputRef.current) return;
    const pos = Math.min(caretRef.current, inputRef.current.value.length);
    inputRef.current.setSelectionRange(pos, pos);
    caretRef.current = null;
  });

  /* --- MAX settle + fee note timing --- */
  useEffect(() => {
    if (!settling) return;
    const t = setTimeout(() => setSettling(false), 280);
    return () => clearTimeout(t);
  }, [settling]);

  useEffect(() => {
    if (!swapping) return;
    const t = setTimeout(() => setSwapping(false), 260);
    return () => clearTimeout(t);
  }, [swapping]);

  /* --- announce the conversion politely, not on every keystroke --- */
  useEffect(() => {
    const t = setTimeout(() => {
      if (isBusy || !secondaryText) return setAnnouncement("");
      setAnnouncement(
        mode === "token"
          ? `${value || "0"} ${token.symbol} is about ${secondaryText}`
          : `${usdDraft || "0"} dollars is about ${secondaryText}`,
      );
    }, 700);
    return () => clearTimeout(t);
  }, [secondaryText, value, usdDraft, mode, token.symbol, isBusy]);

  /* --- token picker dismissal --- */
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  const commit = (clean: string) => {
    if (mode === "token") {
      onChange(clean);
      return;
    }
    setUsdDraft(clean);
    // USD mode still reports token units upstream — the parent never has to
    // know which side the user is typing on.
    onChange(
      hasPrice && clean ? trimZeros((Number(clean) / price!).toFixed(decimals)) : "",
    );
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const typed = el.value;
    const caret = el.selectionStart ?? typed.length;
    const significantBefore = typed.slice(0, caret).replace(/[^\d.]/g, "").length;

    const clean = sanitizeAmount(typed, mode === "token" ? decimals : 2);
    const formatted = groupThousands(clean);

    let seen = 0;
    let idx = 0;
    while (idx < formatted.length && seen < significantBefore) {
      if (/[\d.]/.test(formatted[idx])) seen++;
      idx++;
    }
    caretRef.current = idx;
    commit(clean);
  };

  const applyMax = () => {
    if (maxAmount === null) return;
    if (mode === "usd") {
      const usd = hasPrice ? (Number(maxAmount) * price!).toFixed(2) : "";
      setUsdDraft(usd);
    }
    onChange(maxAmount);
    onMax?.(maxAmount);
    setSettling(true);
    inputRef.current?.focus();
  };

  const toggleMode = () => {
    if (!hasPrice) return;
    if (mode === "token") {
      setUsdDraft(value ? (Number(value) * price!).toFixed(2) : "");
      setMode("usd");
    } else {
      setMode("token");
    }
    setSwapping(true);
  };

  const pickToken = (next: TokenInfo) => {
    setPickerOpen(false);
    onSelectToken?.(next);
  };

  const pickerKeys = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setPickerOpen(false);
    }
  };

  const canPick = !!tokens && tokens.length > 1 && !!onSelectToken;

  // Driven inline rather than via an arbitrary Tailwind class: the colour is
  // state-dependent, and an inline style resolves identically in any consumer's
  // project regardless of their Tailwind version or content config.
  const borderColor = insufficient
    ? "var(--sk-warning-border,#8a6c2f)"
    : focused
      ? "var(--sk-border-strong,#373a41)"
      : "var(--sk-border,#22262f)";

  const primaryAnim = swapping && !reduceMotion ? "sol-tai-swap-up" : "";
  const secondaryAnim = swapping && !reduceMotion ? "sol-tai-swap-down" : "sol-tai-tick";

  return (
    <div className={className}>
      <div
        style={{ borderColor }}
        className="border bg-[var(--sk-surface,#161b26)] p-5 transition-colors duration-200 ease-out"
      >
        {/* label + swap */}
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-[var(--sk-text-tertiary,#94969c)]"
          >
            {label}
          </label>
          <button
            type="button"
            onClick={toggleMode}
            disabled={!hasPrice || isBusy}
            aria-label={
              mode === "token" ? "Enter amount in USD instead" : `Enter amount in ${token.symbol} instead`
            }
            className="flex items-center gap-1.5 border border-[var(--sk-border,#22262f)] px-2 py-1 text-[11px] font-semibold text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUpDown aria-hidden className="size-3" />
            {mode === "token" ? "USD" : token.symbol}
          </button>
        </div>

        {/* amount + token */}
        <div key={mode} className={`mt-3 flex items-center gap-3 ${primaryAnim}`}>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {mode === "usd" && (
              <span
                aria-hidden
                className="text-[28px] font-semibold leading-none text-[var(--sk-text-tertiary,#94969c)]"
              >
                $
              </span>
            )}
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              placeholder="0.00"
              value={displayValue}
              onChange={handleInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={isBusy}
              aria-describedby={`${inputId}-secondary ${inputId}-balance`}
              aria-invalid={insufficient || undefined}
              className={`w-full min-w-0 bg-transparent text-[28px] font-semibold leading-none tabular-nums text-[var(--sk-text,#f7f7f7)] outline-none placeholder:text-[var(--sk-text-quaternary,#61656c)] disabled:opacity-40 ${
                settling && !reduceMotion ? "sol-tai-settle" : ""
              }`}
            />
          </div>

          {/* token pill / picker */}
          <div ref={pickerRef} className="relative shrink-0" onKeyDown={pickerKeys}>
            <button
              type="button"
              onClick={() => canPick && setPickerOpen((v) => !v)}
              disabled={isBusy || !canPick}
              aria-haspopup={canPick ? "listbox" : undefined}
              aria-expanded={canPick ? pickerOpen : undefined}
              className={`flex items-center gap-2 border border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)] py-1.5 pl-2 pr-2.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 disabled:opacity-60 ${
                canPick
                  ? "cursor-pointer hover:bg-[var(--sk-border,#22262f)] active:scale-[0.98]"
                  : "cursor-default"
              }`}
            >
              <TokenGlyph token={token} size={22} />
              <span className="text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                {token.symbol}
              </span>
              {canPick && (
                <ChevronDown
                  aria-hidden
                  className="size-3.5 text-[var(--sk-text-quaternary,#61656c)]"
                />
              )}
            </button>

            {pickerOpen && canPick && (
              <div
                role="listbox"
                aria-label="Select token"
                className="sol-tai-pop absolute right-0 top-full z-20 mt-1.5 w-44 origin-top-right border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] py-1 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
              >
                {tokens!.map((t) => (
                  <button
                    key={t.symbol}
                    type="button"
                    role="option"
                    aria-selected={t.symbol === token.symbol}
                    onClick={() => pickToken(t)}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:-outline-offset-2"
                  >
                    <TokenGlyph token={t} size={20} />
                    <span className="flex-1 text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                      {t.symbol}
                    </span>
                    {t.symbol === token.symbol && (
                      <Check
                        aria-hidden
                        className="size-3.5 text-[var(--sk-accent,#34d399)]"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* conversion line */}
        <div className="mt-2 flex h-5 items-center" id={`${inputId}-secondary`}>
          {loading ? (
            <span className="sol-tai-skeleton block h-3 w-24" aria-hidden />
          ) : (
            secondaryText && (
              <span
                key={swapping ? `swap-${mode}` : secondaryText}
                className={`text-[13px] tabular-nums text-[var(--sk-text-tertiary,#94969c)] ${
                  reduceMotion ? "" : secondaryAnim
                }`}
              >
                {mode === "token" ? "≈ " : "≈ "}
                {secondaryText}
              </span>
            )
          )}
        </div>

        {/* insufficient — eases in and back out, never flashes */}
        <div
          className={`grid transition-all duration-200 ease-out ${
            insufficient
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--sk-warning,#e8b562)]">
              <span>You only have {balanceText}</span>
              {maxAmount !== null && (
                <button
                  type="button"
                  onClick={applyMax}
                  className="cursor-pointer font-semibold underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text,#f7f7f7)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                >
                  Use {groupThousands(maxAmount)}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* balance + MAX */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--sk-border,#22262f)] pt-3">
          <div className="min-w-0 text-[13px]" id={`${inputId}-balance`}>
            {loading ? (
              <span className="sol-tai-skeleton block h-3 w-32" aria-hidden />
            ) : (
              <span className="text-[var(--sk-text-tertiary,#94969c)]">
                Balance:{" "}
                <span className="tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
                  {balanceText ?? "—"}
                </span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {reservedApplied && (
              <span
                className={`text-[11px] text-[var(--sk-text-quaternary,#61656c)] ${
                  reduceMotion ? "" : "sol-tai-note"
                }`}
              >
                {trimZeros(token.feeReserve!.toFixed(decimals))} {token.symbol}{" "}
                kept for fees
              </span>
            )}
            <button
              type="button"
              onClick={applyMax}
              disabled={isBusy || maxAmount === null}
              className="cursor-pointer border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sk-text-secondary,#cecfd2)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text,#f7f7f7)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>
      </div>

      {/* politeness: conversion is debounced, the correction is immediate */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {insufficient && balanceText
          ? `Amount is more than your balance. You only have ${balanceText}.`
          : ""}
      </div>
    </div>
  );
}
