"use client";

/**
 * FeeExplainer — Solana UI Kit
 *
 * Translates Solana fees into plain language: cost in USD and time in
 * seconds. Lamports and micro-lamports never reach the screen. USD is
 * primary, SOL is the secondary reference.
 *
 * Two rules this component holds to, because it is a money surface:
 *   1. Costs round UP. Never show a price lower than what the runtime debits.
 *   2. Nothing unknown is ever rendered as a number. A missing or malformed
 *      figure shows "—" or the unavailable fallback — never "$0.00", which
 *      is a claim that is never true of a Solana transaction.
 *
 * A missing estimate never blocks the user.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file. Tokens used here:
 *   --sk-bg --sk-surface --sk-card --sk-skeleton
 *   --sk-border --sk-border-strong --sk-accent
 *   --sk-btn --sk-btn-text --sk-btn-hover
 *   --sk-text --sk-text-secondary --sk-text-tertiary --sk-text-quaternary
 *   --sk-warning
 *
 * <FeeExplainer
 *   feeUsd={0.00172}
 *   feeSol={0.00001}
 *   confirmTime={[2, 5]}
 *   speed={speed}
 *   onSpeedChange={setSpeed}
 *   congested={congested}
 * />
 */

import {
  useEffect,
  useId,
  useInsertionEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type FeeSpeed = "normal" | "fast" | "turbo";

/** Seconds. A tuple renders as a range — never invent precision we lack. */
export type ConfirmTime = number | [number, number];

export interface FeeSpeedOption {
  speed: FeeSpeed;
  label: string;
  /** Omit when there's no estimate — the tier still shows its time. */
  feeUsd?: number;
  confirmTime: ConfirmTime;
}

/**
 * A cost the user pays that isn't the network fee — account rent, a bundle
 * tip. Creating an associated token account costs ~0.00204 SOL, which dwarfs
 * the fee itself, so leaving these out understates a first-time transfer by
 * orders of magnitude.
 */
export interface FeeExtraCost {
  label: string;
  usd?: number;
  sol?: number;
  /** e.g. "one-time, refunded if the account is closed" */
  hint?: string;
}

export interface FeeExplainerProps {
  /** Total cost in USD. Omit (or pass a non-finite value) for the fallback. */
  feeUsd?: number;
  /** The same total in SOL — the secondary reference. */
  feeSol?: number;
  confirmTime?: ConfirmTime;
  /** Breakdown; with both parts finite, the disclosure appears. */
  baseFeeUsd?: number;
  baseFeeSol?: number;
  priorityFeeUsd?: number;
  priorityFeeSol?: number;
  /** With onSpeedChange and speedOptions, renders the speed selector. */
  speed?: FeeSpeed;
  onSpeedChange?: (speed: FeeSpeed) => void;
  speedOptions?: FeeSpeedOption[];
  /**
   * Costs beyond the network fee (account rent, tips). When present the
   * headline becomes the total the user actually pays, and each is itemised
   * in the breakdown.
   */
  extraCosts?: FeeExtraCost[];
  /** Network is busy — raises a calm notice, never an alarm. */
  congested?: boolean;
  /** Estimating — shimmers the fee line. */
  loading?: boolean;
  /** Row label. Defaults to "Network fee". */
  label?: string;
  /**
   * Control the disclosure. Pair with onOpenChange for a fully controlled
   * panel; passing it alone just sets the state (the trigger keeps working).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Formatting. Users see money and seconds, never lamports.
 * ------------------------------------------------------------------ */

/** The single gate: anything not a real number is unknown, not zero. */
function finite(v: number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Costs round up — the runtime does not round in the user's favour. */
function ceilTo(v: number, dp: number): number {
  const f = 10 ** dp;
  // Nudge to absorb binary representation error before ceiling.
  return Math.ceil(v * f - 1e-9) / f;
}

function usdAt(v: number, dp: number): string {
  return `$${ceilTo(v, dp).toFixed(dp)}`;
}

/** Headline formatting — coarse and scannable. */
function formatUsd(v: number | null): string | null {
  if (v === null) return null;
  if (v <= 0) return null;
  if (v < 0.001) return "<$0.001";
  if (v < 0.1) return usdAt(v, 3);
  if (v < 1) return usdAt(v, 2);
  return ceilTo(v, 2).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * One precision for the whole component, scaled to the total. Sub-cent fees
 * need four decimals or every part collapses to "<$0.001" and visibly fails
 * to sum; dollar amounts need two or they read as noise.
 */
function costPrecision(total: number | null): number {
  if (total === null || total <= 0) return 2;
  if (total >= 1) return 2;
  if (total >= 0.01) return 3;
  return 4;
}

/** Trimmed, never exponential — 0.000005 not 5e-6. */
function formatSol(v: number | null): string | null {
  if (v === null || v <= 0) return null;
  const s = v.toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
  return `${s} SOL`;
}

function formatTime(t: ConfirmTime | undefined): string | null {
  if (t === undefined) return null;
  if (Array.isArray(t)) {
    const lo = finite(t[0]);
    const hi = finite(t[1]);
    if (lo === null || hi === null) return null;
    const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
    return a === b ? `~${a}s` : `${a}–${b}s`;
  }
  const n = finite(t);
  return n === null ? null : `~${n}s`;
}

/* ------------------------------------------------------------------ */

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

const STYLE_ID = "sol-fee-styles";
// prefers-reduced-motion is handled entirely in CSS — no matchMedia hook, so
// there's no per-render evaluation and no hydration double-render.
const KEYFRAMES = `
@keyframes sol-fee-tick { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-fee-shimmer { from { transform: translateX(-100%); } to { transform: translateX(220%); } }
.sol-fee-tick { animation: sol-fee-tick 150ms cubic-bezier(0.32,0.72,0,1) both; }
.sol-fee-skeleton { position: relative; overflow: hidden; }
.sol-fee-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: sol-fee-shimmer 1.6s cubic-bezier(0.4,0,0.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .sol-fee-tick { animation: none !important; }
  .sol-fee-skeleton::after { animation: none !important; display: none; }
}
`;

export function FeeExplainer({
  feeUsd,
  feeSol,
  confirmTime,
  baseFeeUsd,
  baseFeeSol,
  priorityFeeUsd,
  priorityFeeSol,
  speed,
  onSpeedChange,
  speedOptions,
  extraCosts,
  congested = false,
  loading = false,
  label,
  open: openProp,
  onOpenChange,
  className,
}: FeeExplainerProps) {
  const [openInternal, setOpenInternal] = useState(openProp ?? false);
  const [prevOpenProp, setPrevOpenProp] = useState(openProp);
  const [announcement, setAnnouncement] = useState("");
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const detailsId = `${baseId}-details`;

  useKitStyles(STYLE_ID, KEYFRAMES);

  // Fully controlled only when a handler comes with the prop. Passing `open`
  // alone still works — it seeds the state instead of freezing the trigger.
  const isControlled = openProp !== undefined && onOpenChange !== undefined;
  const open = isControlled ? openProp! : openInternal;
  if (openProp !== prevOpenProp) {
    setPrevOpenProp(openProp);
    if (!isControlled && openProp !== undefined) setOpenInternal(openProp);
  }
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange!(next);
    else setOpenInternal(next);
  };

  /* --- everything unknown stays unknown --- */
  const fee = finite(feeUsd);
  const sol = finite(feeSol);
  const base = finite(baseFeeUsd);
  const baseSol = finite(baseFeeSol);
  const priority = finite(priorityFeeUsd);
  const prioritySol = finite(priorityFeeSol);

  const extras = (extraCosts ?? []).filter(
    (e) => finite(e.usd) !== null || finite(e.sol) !== null,
  );
  const extrasUsd = extras.reduce((sum, e) => sum + (finite(e.usd) ?? 0), 0);
  const extrasSol = extras.reduce((sum, e) => sum + (finite(e.sol) ?? 0), 0);

  const hasEstimate = fee !== null && fee > 0;
  // The headline is what the user actually pays, not just the network fee.
  const totalUsd = hasEstimate ? fee! + extrasUsd : null;
  const totalSol = sol !== null ? sol + extrasSol : null;
  const hasBreakdown =
    hasEstimate && ((base !== null && priority !== null) || extras.length > 0);
  const showSelector =
    !!speedOptions && speedOptions.length > 0 && !!onSpeedChange && !!speed;

  // "Network fee" stops being true the moment rent or a tip is included.
  const resolvedLabel = label ?? (extras.length ? "Estimated cost" : "Network fee");

  // One precision everywhere, and the displayed total is the SUM OF THE
  // ROUNDED PARTS rather than a separately-rounded total — independent
  // ceiling can't otherwise reconcile, which is how "<$0.001 + <$0.001 =
  // $0.002" happened. Erring upward is the safe direction for a cost.
  const dp = costPrecision(totalUsd);
  const partValues = [
    base,
    priority,
    ...extras.map((e) => finite(e.usd)),
  ].filter((v): v is number => v !== null);
  const roundedPartsTotal = partValues.reduce((s, v) => s + ceilTo(v, dp), 0);
  const displayTotal =
    hasBreakdown && partValues.length
      ? roundedPartsTotal
      : totalUsd !== null
        ? ceilTo(totalUsd, dp)
        : null;

  const feeText =
    displayTotal === null
      ? null
      : displayTotal < 0.001
        ? "<$0.001"
        : usdAt(displayTotal, dp);
  const timeText = formatTime(confirmTime);
  const solText = formatSol(totalSol);

  const baseText = base !== null ? usdAt(base, dp) : null;
  const priorityText = priority !== null ? usdAt(priority, dp) : null;
  const totalText = feeText;

  /* --- announce the settled state; never a figure the screen disclaims,
         and never the same string twice (which would re-fire the region) --- */
  useEffect(() => {
    const next = loading
      ? "Estimating network fee."
      : !hasEstimate
        ? "Fee estimate unavailable. Typically under one cent."
        : `Network fee about ${feeText}${
            timeText ? `, confirms in ${timeText}` : ""
          }${congested ? ". Network is busy, fees are higher than usual." : ""}`;
    const t = setTimeout(() => {
      setAnnouncement((prev) => (prev === next ? prev : next));
    }, 600);
    return () => clearTimeout(t);
  }, [feeText, timeText, congested, loading, hasEstimate]);

  /* --- speed selector: a real radio group --- */
  const selectedIndex = speedOptions?.findIndex((o) => o.speed === speed) ?? -1;

  const onRadioKeys = (e: KeyboardEvent) => {
    if (!speedOptions || !onSpeedChange) return;
    const len = speedOptions.length;
    const from = selectedIndex < 0 ? 0 : selectedIndex;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (from + 1) % len;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (from - 1 + len) % len;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = len - 1;
    if (next === null) return;
    e.preventDefault();
    onSpeedChange(speedOptions[next].speed);
    optionRefs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div className="border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] p-5">
        {/* One calm line: what it costs, how long it takes. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
            {resolvedLabel}
          </span>

          <div className="flex h-5 items-center gap-2">
            {loading ? (
              <span
                className="sol-fee-skeleton block h-3 w-28 bg-[var(--sk-skeleton,#22262f)]"
                aria-hidden
              />
            ) : hasEstimate ? (
              <span
                key={`${feeText}-${timeText}`}
                className="sol-fee-tick text-[13px] tabular-nums text-[var(--sk-text,#f7f7f7)]"
              >
                <span className="font-semibold">≈ {feeText}</span>
                {timeText && (
                  <>
                    <span
                      aria-hidden
                      className="mx-1.5 text-[var(--sk-text-tertiary,#94969c)]"
                    >
                      ·
                    </span>
                    <span className="text-[var(--sk-text-tertiary,#94969c)]">
                      confirms in {timeText}
                    </span>
                  </>
                )}
                {/* Without a breakdown to hold it, the SOL reference would
                    otherwise be silently dropped. */}
                {!hasBreakdown && solText && (
                  <span className="ml-1.5 text-[var(--sk-text-tertiary,#94969c)]">
                    ({solText})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
                Fee estimate unavailable{" "}
                <span className="text-[var(--sk-text-tertiary,#94969c)]">
                  — typically under $0.01
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Text affordance, matching transaction-status's disclosure. Stays
            mounted during loading so the row doesn't reflow twice a cycle. */}
        {hasBreakdown && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={detailsId}
            className="mt-2 cursor-pointer text-[12px] text-[var(--sk-text-tertiary,#94969c)] underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
          >
            {open ? "Hide breakdown" : "Show breakdown"}
          </button>
        )}

        {/* Congestion — ambient weather, not a blocking error, so it does not
            borrow the card-border treatment used for user mistakes. */}
        <div
          aria-hidden={!congested}
          className={`grid transition-all duration-200 ease-out ${
            congested
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {/* Only in the DOM when true, so page search and copy don't pick
                up "network is busy" on a calm network. The copy is honest
                about the real failure mode: under congestion a transaction is
                more likely to expire than to merely be slow. */}
            {congested && (
              <p className="text-[12px] leading-relaxed text-[var(--sk-warning,#e8b562)]">
                Network is busy — fees are higher than usual and transactions
                may need retrying.
              </p>
            )}
          </div>
        </div>

        {hasBreakdown && (
          <div
            id={detailsId}
            aria-hidden={!open}
            className={`grid transition-all duration-200 ease-out ${
              open
                ? "mt-3 grid-rows-[1fr] opacity-100"
                : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[var(--sk-border,#22262f)] pt-3">
                <dl className="flex flex-col gap-2.5">
                  {base !== null && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                      Network base cost
                      <span className="ml-1.5 text-[11px] text-[var(--sk-text-quaternary,#61656c)]">
                        fixed by Solana
                      </span>
                    </dt>
                    <dd className="text-right">
                      <div className="text-[12px] tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
                        {baseText ?? "—"}
                      </div>
                      {formatSol(baseSol) && (
                        <div className="text-[11px] tabular-nums text-[var(--sk-text-tertiary,#94969c)]">
                          {formatSol(baseSol)}
                        </div>
                      )}
                    </dd>
                  </div>
                  )}

                  {priority !== null && (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                        Priority fee
                      </dt>
                      <dd className="text-right">
                        <div className="text-[12px] tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
                          {priorityText ?? "—"}
                        </div>
                        {formatSol(prioritySol) && (
                          <div className="text-[11px] tabular-nums text-[var(--sk-text-tertiary,#94969c)]">
                            {formatSol(prioritySol)}
                          </div>
                        )}
                      </dd>
                    </div>
                    {/* Attached to the row it describes, not orphaned below
                        both of them where it reads as describing the total. */}
                    <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                      A small tip that gets your transaction processed faster
                      during busy periods.
                    </p>
                  </div>
                  )}

                  {extras.map((extra) => (
                    <div key={extra.label}>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                          {extra.label}
                        </dt>
                        <dd className="text-right">
                          <div className="text-[12px] tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
                            {finite(extra.usd) !== null
                              ? usdAt(finite(extra.usd)!, dp)
                              : "—"}
                          </div>
                          {formatSol(finite(extra.sol)) && (
                            <div className="text-[11px] tabular-nums text-[var(--sk-text-tertiary,#94969c)]">
                              {formatSol(finite(extra.sol))}
                            </div>
                          )}
                        </dd>
                      </div>
                      {extra.hint && (
                        <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                          {extra.hint}
                        </p>
                      )}
                    </div>
                  ))}
                </dl>

                {/* The number the panel exists to reconcile — so it is the
                    largest thing in it, at the parts' own precision. */}
                <div className="mt-3 flex items-start justify-between gap-3 border-t border-[var(--sk-border,#22262f)] pt-3">
                  <span className="text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                    Total
                  </span>
                  <span className="text-right">
                    <span className="block text-[13px] font-semibold tabular-nums text-[var(--sk-text,#f7f7f7)]">
                      {totalText ?? "—"}
                    </span>
                    {solText && (
                      <span className="block text-[11px] tabular-nums text-[var(--sk-text-tertiary,#94969c)]">
                        {solText}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSelector && (
          <div className="mt-4 border-t border-[var(--sk-border,#22262f)] pt-3">
            <div
              role="radiogroup"
              aria-label="Transaction speed"
              onKeyDown={onRadioKeys}
              className="grid grid-cols-3 gap-2"
            >
              {speedOptions!.map((opt, i) => {
                const active = opt.speed === speed;
                const optFee = formatUsd(finite(opt.feeUsd));
                const optTime = formatTime(opt.confirmTime);
                return (
                  <button
                    key={opt.speed}
                    ref={(el) => {
                      optionRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active || (selectedIndex < 0 && i === 0) ? 0 : -1}
                    onClick={() => onSpeedChange!(opt.speed)}
                    className={`cursor-pointer px-2 py-2 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97] ${
                      active
                        ? "bg-[var(--sk-btn,#00543f)] text-[var(--sk-btn-text,#18e3a5)] hover:bg-[var(--sk-btn-hover,#006a53)]"
                        : "border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] text-[var(--sk-text-secondary,#cecfd2)] hover:bg-[var(--sk-border,#22262f)]"
                    }`}
                  >
                    <span className="block text-[12px] font-semibold">
                      {opt.label}
                    </span>
                    <span
                      key={`${optFee}-${optTime}`}
                      className={`sol-fee-tick mt-0.5 block text-[11px] tabular-nums ${
                        active
                          ? "text-[var(--sk-btn-text,#18e3a5)] opacity-80"
                          : "text-[var(--sk-text-tertiary,#94969c)]"
                      }`}
                    >
                      {/* Without a total we can't honestly quote tiers — the
                          time still stands on its own. */}
                      {hasEstimate && optFee ? (
                        <>
                          {optFee}
                          <span aria-hidden className="mx-1">
                            ·
                          </span>
                        </>
                      ) : null}
                      {optTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
