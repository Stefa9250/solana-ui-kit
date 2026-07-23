"use client";

/**
 * TokenAmountInput — Solana UI Kit
 *
 * The boring-but-critical parts of a token amount field, done properly:
 * per-token decimal caps, exact base-unit comparison and MAX arithmetic,
 * a MAX that leaves rent behind, and a calm correction — not a red alarm —
 * when the amount is too large.
 *
 * Exactness, precisely scoped: every comparison, MAX subtraction and balance
 * check runs on BigInt base units and truncates, never rounds, so MAX can
 * never exceed the real balance. The USD conversion is float maths — it is a
 * display estimate only and never decides validity. Pass `balance`/`price` as
 * strings to avoid the precision loss a JS number has above 2^53 raw units.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file. Tokens used here:
 *   --sk-bg --sk-surface --sk-card --sk-raised --sk-skeleton
 *   --sk-border --sk-border-strong --sk-accent
 *   --sk-text --sk-text-secondary --sk-text-tertiary --sk-text-quaternary
 *   --sk-warning --sk-warning-border
 *
 * <TokenAmountInput
 *   token={SOL}
 *   balance="12.45"
 *   price="172.18"
 *   value={amount}
 *   onChange={setAmount}
 *   onMax={(v) => track("max", v)}
 * />
 */

import {
  useEffect,
  useId,
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
  /** Mint address. Symbols are not unique on Solana — key lists on this. */
  mint?: string;
  /** On-chain decimals — SOL 9, USDC 6, BONK 5. Caps what can be typed. */
  decimals: number;
  /** Logo URL or data URI. Falls back to a colored initial. */
  icon?: string;
  /** Brand color behind the initial fallback. */
  color?: string;
  /**
   * Held back by MAX so the account can still pay fees. Native SOL only.
   * A constant is a simplification: what you actually need is
   * rentExemptMin + baseFee x signatures + priorityFee + accountsCreated.
   * Compute it per transaction where you can.
   */
  feeReserve?: number | string;
}

export interface TokenAmountValidity {
  /** A non-zero amount that is within balance and leaves the fee reserve. */
  valid: boolean;
  /** Amount exceeds the balance. */
  insufficient: boolean;
  /** Within balance but eats into the fee reserve. */
  exceedsReserve: boolean;
}

export interface TokenAmountInputProps {
  token: TokenInfo;
  /** Human-unit balance. Prefer a string — a number loses bits above 2^53. */
  balance?: number | string;
  /** USD price per whole token. Display only; never decides validity. */
  price?: number | string;
  /** Amount as a plain decimal string, always in token units ("1.25"). */
  value: string;
  onChange: (value: string) => void;
  /** Fired after MAX fills the field, with the amount it used. */
  onMax?: (value: string) => void;
  /** Fired when the amount's validity changes, so a parent can gate submit. */
  onValidityChange?: (validity: TokenAmountValidity) => void;
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
 * Number handling. Everything that decides anything runs through
 * BigInt base units and truncates.
 * ------------------------------------------------------------------ */

/** "1e-9" -> "0.000000001", exactly (no float round-trip). */
function expandExponential(s: string): string {
  const m = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(s);
  if (!m) return s;
  const [, int, frac = "", expStr] = m;
  const exp = parseInt(expStr, 10);
  const digits = int + frac;
  const point = int.length + exp;
  if (point <= 0) return "0." + "0".repeat(-point) + digits;
  if (point >= digits.length) return digits + "0".repeat(point - digits.length);
  return digits.slice(0, point) + "." + digits.slice(point);
}

/** Digits and at most one dot, decimals truncated to the token's cap. */
function sanitizeCore(input: string, decimals: number): string {
  let s = input.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  if (s.startsWith(".")) s = "0" + s;
  s = s.replace(/^0+(?=\d)/, "");
  if (decimals <= 0) return s.split(".")[0];
  const [int, frac] = s.split(".");
  return frac === undefined ? int : int + "." + frac.slice(0, decimals);
}

/**
 * Normalizes anything a parent might hand us — exponential notation, a
 * pre-formatted "1,234", stray characters — into a plain decimal string.
 * Commas are treated as grouping here; negatives are rejected outright.
 */
function normalizeAmount(raw: string, decimals: number): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("-")) return "";
  return sanitizeCore(expandExponential(trimmed.replace(/,/g, "")), decimals);
}

/**
 * Sanitizes what a user typed. Unlike the prop path, a lone comma is read as
 * a decimal separator when it can't be a thousands mark — on most non-US
 * keypads the decimal key emits "," and silently turning "1,5" into 15 is a
 * 10x overspend. A comma followed by exactly three digits is still grouping.
 */
function sanitizeTyped(raw: string, decimals: number): string {
  let s = raw.replace(/\s/g, "");
  if (s.startsWith("-")) return "";
  // A pasted "1e9" must not collapse to 19.
  s = expandExponential(s);
  if (!s.includes(".")) {
    const commas = s.split(",").length - 1;
    const after = commas === 1 ? s.slice(s.indexOf(",") + 1) : "";
    s =
      commas === 1 && after.length !== 3
        ? s.replace(",", ".")
        : s.replace(/,/g, "");
  } else {
    s = s.replace(/,/g, "");
  }
  return sanitizeCore(s, decimals);
}

/** 1234567.89 -> "1,234,567.89". Only applied when the field isn't focused. */
function groupThousands(s: string): string {
  if (!s) return "";
  const [int, frac] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === undefined ? grouped : grouped + "." + frac;
}

/** Total: any malformed input becomes 0 rather than throwing mid-render. */
function toBaseUnits(s: string, decimals: number): bigint {
  const clean = normalizeAmount(s, decimals);
  if (!clean) return BigInt(0);
  const [int, frac = ""] = clean.split(".");
  const padded =
    decimals > 0 ? (frac + "0".repeat(decimals)).slice(0, decimals) : "";
  try {
    return BigInt((int || "0") + padded);
  } catch {
    return BigInt(0);
  }
}

function fromBaseUnits(v: bigint, decimals: number): string {
  if (decimals <= 0) return v.toString();
  const s = v.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}

/**
 * Strings go straight through (exact). Numbers get extra digits from toFixed
 * and are then truncated — toFixed(decimals) alone rounds half-up, which can
 * produce a MAX one base unit larger than the balance actually holds.
 */
function amountToBaseUnits(
  v: number | string | undefined,
  decimals: number,
): bigint | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string") return toBaseUnits(v, decimals);
  if (!Number.isFinite(v) || v <= 0) return BigInt(0);
  return toBaseUnits(v.toFixed(Math.min(decimals + 4, 100)), decimals);
}

function toPrice(v: number | string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function trimTrailingDot(s: string): string {
  return s.endsWith(".") ? s.slice(0, -1) : s;
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

/** Truncates at the display cap — rounding up would overstate a balance. */
function formatBaseUnits(v: bigint, decimals: number, maxFrac = 6): string {
  const full = fromBaseUnits(v, decimals);
  const [int, frac] = full.split(".");
  if (frac === undefined) return groupThousands(int);
  const cut = frac.slice(0, maxFrac).replace(/0+$/, "");
  return groupThousands(int) + (cut ? "." + cut : "");
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
.sol-tai-skeleton { position: relative; overflow: hidden; }
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
  onValidityChange,
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
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const validityRef = useRef(onValidityChange);
  const inputId = useId();
  const warnId = `${inputId}-warn`;

  const reduceMotion = useReducedMotion();
  useKitStyles(STYLE_ID, KEYFRAMES);

  const decimals = token.decimals;
  const isBusy = loading || disabled;
  const priceNum = toPrice(price);
  const hasPrice = priceNum !== undefined;

  /* --- exact amounts --- */
  const balanceBase = amountToBaseUnits(balance, decimals);
  const reserveBase = amountToBaseUnits(token.feeReserve, decimals) ?? BigInt(0);
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
  // Within balance, but would leave nothing to pay the fee with.
  const exceedsReserve =
    !isBusy &&
    !insufficient &&
    maxBase !== null &&
    reserveBase > BigInt(0) &&
    amountBase > maxBase;
  const showWarning = insufficient || exceedsReserve;
  const reservedApplied =
    reserveBase > BigInt(0) &&
    maxBase !== null &&
    maxBase > BigInt(0) &&
    value !== "" &&
    amountBase === maxBase;

  /* --- display --- */
  const rawForMode = mode === "token" ? value : usdDraft;
  // Grouped only when unfocused: separators mid-edit break backspace and the
  // caret, and gain nothing while the user is still typing.
  const displayValue = focused ? rawForMode : groupThousands(rawForMode);
  const sizeClass =
    displayValue.length > 18
      ? "text-[18px]"
      : displayValue.length > 13
        ? "text-[22px]"
        : "text-[28px]";

  let secondaryText: string | null = null;
  if (hasPrice) {
    if (mode === "token") {
      secondaryText = formatUsd(value ? Number(value) * priceNum! : 0);
    } else {
      const qty = usdDraft ? Number(usdDraft) / priceNum! : 0;
      secondaryText = `${formatBaseUnits(
        toBaseUnits(qty.toFixed(Math.min(decimals + 4, 100)), decimals),
        decimals,
      )} ${token.symbol}`;
    }
  }

  const balanceText =
    balanceBase === null
      ? null
      : `${formatBaseUnits(balanceBase, decimals)} ${token.symbol}`;
  const maxText = maxBase === null ? null : formatBaseUnits(maxBase, decimals);

  /* --- caret restore: always disarmed, so it can never fire on a later,
         unrelated render (a price poll used to move the caret mid-edit) --- */
  useIsoLayoutEffect(() => {
    const pending = caretRef.current;
    caretRef.current = null;
    if (pending === null || !inputRef.current) return;
    if (document.activeElement !== inputRef.current) return;
    const pos = Math.min(pending, inputRef.current.value.length);
    inputRef.current.setSelectionRange(pos, pos);
  });

  useEffect(() => {
    validityRef.current = onValidityChange;
  }, [onValidityChange]);

  useEffect(() => {
    validityRef.current?.({
      valid: !showWarning && amountBase > BigInt(0),
      insufficient,
      exceedsReserve,
    });
  }, [showWarning, insufficient, exceedsReserve, amountBase]);

  /* --- a token with fewer decimals must not leave a longer amount behind --- */
  useEffect(() => {
    const clamped = normalizeAmount(value, decimals);
    if (clamped !== value) onChange(clamped);
    // Only when the token's precision changes — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decimals]);

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

  /* --- announce politely, and only while the field is being used --- */
  useEffect(() => {
    if (!focused || isBusy || !secondaryText) return;
    const t = setTimeout(() => {
      setAnnouncement(
        mode === "token"
          ? `${value || "0"} ${token.symbol} is about ${secondaryText}`
          : `${usdDraft || "0"} dollars is about ${secondaryText}`,
      );
    }, 700);
    return () => clearTimeout(t);
  }, [secondaryText, value, usdDraft, mode, token.symbol, isBusy, focused]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [pickerOpen]);

  const commit = (clean: string) => {
    if (mode === "token") {
      onChange(clean);
      return;
    }
    setUsdDraft(clean);
    // USD is an estimate, so this conversion is float maths. The parent still
    // receives token units; validity is decided on the exact base-unit path.
    onChange(
      hasPrice && clean
        ? normalizeAmount(
            (Number(clean) / priceNum!).toFixed(Math.min(decimals + 4, 100)),
            decimals,
          )
        : "",
    );
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const typed = el.value;
    const caret = el.selectionStart ?? typed.length;
    const cap = mode === "token" ? decimals : 2;
    const clean = sanitizeTyped(typed, cap);

    // No separators are inserted while focused, so the caret is simply the
    // number of characters from the typed prefix that survived sanitising.
    let kept = 0;
    let sawDot = false;
    for (const ch of typed.slice(0, caret)) {
      if (ch >= "0" && ch <= "9") kept++;
      else if ((ch === "." || ch === ",") && !sawDot) {
        sawDot = true;
        kept++;
      }
    }
    const caretPos = Math.min(kept, clean.length);

    if (clean === rawForMode) {
      // Nothing changed (a rejected character): React won't re-render, so put
      // the DOM back ourselves rather than leaving a caret armed for later.
      el.value = clean;
      el.setSelectionRange(caretPos, caretPos);
      caretRef.current = null;
      return;
    }
    caretRef.current = caretPos;
    commit(clean);
  };

  const handleBlur = () => {
    setFocused(false);
    const tidy = trimTrailingDot(rawForMode);
    if (tidy !== rawForMode) commit(tidy);
  };

  const applyMax = () => {
    if (maxAmount === null || maxBase === BigInt(0)) return;
    if (mode === "usd") {
      setUsdDraft(hasPrice ? (Number(maxAmount) * priceNum!).toFixed(2) : "");
    }
    onChange(maxAmount);
    onMax?.(maxAmount);
    setSettling(true);
    inputRef.current?.focus();
  };

  const toggleMode = () => {
    if (!hasPrice) return;
    if (mode === "token") {
      setUsdDraft(value ? (Number(value) * priceNum!).toFixed(2) : "");
      setMode("usd");
    } else {
      setMode("token");
    }
    setSwapping(true);
  };

  const pickToken = (next: TokenInfo) => {
    setPickerOpen(false);
    triggerRef.current?.focus();
    onSelectToken?.(next);
  };

  const menuKeys = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setPickerOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const d = e.key === "ArrowDown" ? 1 : -1;
    items[(i + d + items.length) % items.length]?.focus();
  };

  const canPick = !!tokens && tokens.length > 1 && !!onSelectToken;
  const maxDisabled = isBusy || maxBase === null || maxBase === BigInt(0);

  const borderColor = showWarning
    ? "var(--sk-warning-border,#8a6c2f)"
    : focused
      ? "var(--sk-accent,#34d399)"
      : "var(--sk-border,#22262f)";

  const tokenPill = (
    <>
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
    </>
  );

  return (
    <div className={className}>
      <div
        style={{ borderColor }}
        className="border bg-[var(--sk-surface,#161b26)] p-5 transition-colors duration-200 ease-out"
      >
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
              mode === "token"
                ? "Enter amount in US dollars instead"
                : `Enter amount in ${token.symbol} instead`
            }
            className="flex items-center gap-1.5 border border-[var(--sk-border,#22262f)] px-2 py-1 text-[11px] font-semibold text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUpDown aria-hidden className="size-3" />
            {mode === "token" ? "USD" : token.symbol}
          </button>
        </div>

        {/* No key= here: remounting would drop focus and the caret on toggle. */}
        <div
          className={`mt-3 flex items-center gap-3 ${
            swapping && !reduceMotion ? "sol-tai-swap-up" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {mode === "usd" && (
              <span
                aria-hidden
                className={`${sizeClass} font-semibold leading-none text-[var(--sk-text-tertiary,#94969c)]`}
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
              onBlur={handleBlur}
              disabled={isBusy}
              aria-label={`${label} in ${mode === "usd" ? "US dollars" : token.symbol}`}
              aria-describedby={showWarning ? warnId : undefined}
              aria-invalid={showWarning || undefined}
              className={`w-full min-w-0 bg-transparent ${sizeClass} font-semibold leading-none tabular-nums text-[var(--sk-text,#f7f7f7)] outline-none transition-[font-size] duration-150 placeholder:text-[var(--sk-text-quaternary,#61656c)] disabled:opacity-40 ${
                settling && !reduceMotion ? "sol-tai-settle" : ""
              }`}
            />
          </div>

          <div ref={pickerRef} className="relative shrink-0">
            {canPick ? (
              <button
                type="button"
                ref={triggerRef}
                onClick={() => setPickerOpen((v) => !v)}
                disabled={isBusy}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                className="flex cursor-pointer items-center gap-2 border border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)] py-1.5 pl-2 pr-2.5 transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.98] disabled:opacity-40"
              >
                {tokenPill}
              </button>
            ) : (
              // Static, not a disabled button — a lone token must not read as
              // a greyed-out control.
              <div className="flex items-center gap-2 border border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)] py-1.5 pl-2 pr-2.5">
                {tokenPill}
              </div>
            )}

            {pickerOpen && canPick && (
              <div
                ref={menuRef}
                role="menu"
                aria-label="Select token"
                onKeyDown={menuKeys}
                className="sol-tai-pop absolute right-0 top-full z-20 mt-1.5 w-52 origin-top-right border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] py-1 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
              >
                {tokens!.map((t) => (
                  <button
                    key={t.mint ?? t.symbol}
                    type="button"
                    role="menuitem"
                    onClick={() => pickToken(t)}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:-outline-offset-2"
                  >
                    <TokenGlyph token={t} size={20} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                        {t.symbol}
                      </span>
                      {t.name && (
                        <span className="block truncate text-[11px] text-[var(--sk-text-quaternary,#61656c)]">
                          {t.name}
                        </span>
                      )}
                    </span>
                    {(t.mint ?? t.symbol) === (token.mint ?? token.symbol) && (
                      <Check
                        aria-hidden
                        className="size-3.5 shrink-0 text-[var(--sk-accent,#34d399)]"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex h-5 items-center">
          {loading ? (
            <span
              className="sol-tai-skeleton block h-3 w-24 bg-[var(--sk-skeleton,#22262f)]"
              aria-hidden
            />
          ) : (
            secondaryText && (
              // Only animates on discrete events — ticking on every keystroke
              // made the figure twitch continuously while typing.
              <span
                className={`text-[13px] tabular-nums text-[var(--sk-text-tertiary,#94969c)] ${
                  swapping && !reduceMotion ? "sol-tai-swap-down" : ""
                }`}
              >
                {"≈ "}
                {secondaryText}
              </span>
            )
          )}
        </div>

        {/* Eases in and back out; kept mounted for the transition but taken
            out of the tab order and the a11y tree while collapsed. */}
        <div
          id={warnId}
          aria-hidden={!showWarning}
          className={`grid transition-all duration-200 ease-out ${
            showWarning
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--sk-warning,#e8b562)]">
              <span>
                {insufficient
                  ? `You only have ${balanceText ?? "—"}`
                  : `Leaves nothing for network fees`}
              </span>
              {maxText !== null && maxBase !== BigInt(0) && (
                <button
                  type="button"
                  onClick={applyMax}
                  tabIndex={showWarning ? undefined : -1}
                  className="cursor-pointer font-semibold underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text,#f7f7f7)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                >
                  Use {maxText} {token.symbol}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--sk-border,#22262f)] pt-3">
          <div className="min-w-0 text-[13px]">
            {loading ? (
              <span
                className="sol-tai-skeleton block h-3 w-32 bg-[var(--sk-skeleton,#22262f)]"
                aria-hidden
              />
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
                className={`text-[11px] text-[var(--sk-text-tertiary,#94969c)] ${
                  reduceMotion ? "" : "sol-tai-note"
                }`}
              >
                {formatBaseUnits(reserveBase, decimals)} {token.symbol} kept for
                fees
              </span>
            )}
            <button
              type="button"
              onClick={applyMax}
              disabled={maxDisabled}
              className="cursor-pointer border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sk-text-secondary,#cecfd2)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text,#f7f7f7)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {focused && !isBusy ? announcement : ""}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {insufficient && balanceText
          ? `Amount is more than your balance. You only have ${balanceText}.`
          : exceedsReserve
            ? `That amount leaves nothing to pay network fees.`
            : ""}
      </div>
    </div>
  );
}
