"use client";

/**
 * FeeExplainer — Solana UI Kit
 *
 * Translates Solana fees into plain language: cost in the user's currency and
 * time in seconds. Lamports and micro-lamports never reach the screen. USD is
 * primary everywhere, SOL is the secondary reference.
 *
 * A missing estimate is never a blocker — the component falls back to an
 * honest "typically under $0.01" rather than stopping the user.
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
 *   --sk-warning --sk-warning-border
 *
 * <FeeExplainer
 *   feeUsd={0.0021}
 *   feeSol={0.000012}
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
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { Info } from "lucide-react";

export type FeeSpeed = "normal" | "fast" | "turbo";

/** Seconds. A tuple renders as a range — never invent precision we lack. */
export type ConfirmTime = number | [number, number];

export interface FeeSpeedOption {
  speed: FeeSpeed;
  label: string;
  feeUsd: number;
  confirmTime: ConfirmTime;
}

export interface FeeExplainerProps {
  /** Total cost in USD. Omit (with feeSol) for the unavailable fallback. */
  feeUsd?: number;
  /** Same total in SOL — shown as the secondary reference. */
  feeSol?: number;
  confirmTime?: ConfirmTime;
  /** Breakdown; when both parts are present the info affordance expands. */
  baseFeeUsd?: number;
  baseFeeSol?: number;
  priorityFeeUsd?: number;
  priorityFeeSol?: number;
  /** With onSpeedChange and speedOptions, renders the speed selector. */
  speed?: FeeSpeed;
  onSpeedChange?: (speed: FeeSpeed) => void;
  speedOptions?: FeeSpeedOption[];
  /** Network is busy — raises a calm notice, never an alarm. */
  congested?: boolean;
  /** Estimating — shimmers the fee line. */
  loading?: boolean;
  /** Row label. Defaults to "Network fee". */
  label?: string;
  /** Control the breakdown externally (defaults to internal state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Formatting — users see money and seconds, never lamports.
 * ------------------------------------------------------------------ */

/** Tiny values collapse to a threshold rather than "$0.0004". */
function formatUsd(v: number): string {
  if (!Number.isFinite(v) || v < 0) return "$0.00";
  if (v === 0) return "$0.00";
  if (v < 0.001) return "<$0.001";
  if (v < 1) return `$${v.toFixed(3)}`;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Trimmed, never exponential — 0.000005 not 5e-6. */
function formatSol(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "0 SOL";
  const s = v.toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
  return `${s} SOL`;
}

function formatTime(t: ConfirmTime): string {
  if (Array.isArray(t)) {
    const [lo, hi] = t;
    return lo === hi ? `~${lo}s` : `${lo}–${hi}s`;
  }
  return `~${t}s`;
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

const STYLE_ID = "sol-fee-styles";
const KEYFRAMES = `
@keyframes sol-fee-tick { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-fee-note { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-fee-shimmer { from { transform: translateX(-100%); } to { transform: translateX(220%); } }
.sol-fee-tick { animation: sol-fee-tick 150ms cubic-bezier(0.32,0.72,0,1) both; }
.sol-fee-note { animation: sol-fee-note 200ms cubic-bezier(0.32,0.72,0,1) both; }
.sol-fee-skeleton { position: relative; overflow: hidden; }
.sol-fee-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: sol-fee-shimmer 1.6s cubic-bezier(0.4,0,0.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .sol-fee-tick, .sol-fee-note { animation: none !important; }
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
  congested = false,
  loading = false,
  label = "Network fee",
  open: openProp,
  onOpenChange,
  className,
}: FeeExplainerProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenInternal(next);
    onOpenChange?.(next);
  };
  const [announcement, setAnnouncement] = useState("");
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const detailsId = `${baseId}-details`;

  const reduceMotion = useReducedMotion();
  useKitStyles(STYLE_ID, KEYFRAMES);

  const hasEstimate = feeUsd !== undefined && Number.isFinite(feeUsd);
  const hasBreakdown =
    baseFeeUsd !== undefined && priorityFeeUsd !== undefined && hasEstimate;
  const showSelector =
    !!speedOptions && speedOptions.length > 0 && !!onSpeedChange && !!speed;

  const feeText = hasEstimate ? formatUsd(feeUsd!) : null;
  const timeText = confirmTime !== undefined ? formatTime(confirmTime) : null;
  const solText = feeSol !== undefined ? formatSol(feeSol) : null;
  // Keys the value nodes so a changed estimate replays the tick.
  const feeKey = `${feeText}-${timeText}`;

  /* --- announce a settled estimate, not every intermediate poll --- */
  useEffect(() => {
    if (loading || !hasEstimate) return;
    const t = setTimeout(() => {
      setAnnouncement(
        `Network fee about ${feeText}${timeText ? `, confirms in ${timeText}` : ""}${
          congested ? ". Network is busy, fees are higher than usual." : ""
        }`,
      );
    }, 600);
    return () => clearTimeout(t);
  }, [feeText, timeText, congested, loading, hasEstimate]);

  /* --- speed selector: a real radio group --- */
  const selectedIndex = speedOptions?.findIndex((o) => o.speed === speed) ?? -1;

  const onRadioKeys = (e: KeyboardEvent) => {
    if (!speedOptions || !onSpeedChange) return;
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back) return;
    e.preventDefault();
    const len = speedOptions.length;
    const from = selectedIndex < 0 ? 0 : selectedIndex;
    const next = (from + (forward ? 1 : -1) + len) % len;
    onSpeedChange(speedOptions[next].speed);
    optionRefs.current[next]?.focus();
  };

  const borderColor = congested
    ? "var(--sk-warning-border,#8a6c2f)"
    : "var(--sk-border,#22262f)";

  return (
    <div className={className}>
      <div
        style={{ borderColor }}
        className="border bg-[var(--sk-surface,#161b26)] p-4 transition-colors duration-200 ease-out"
      >
        {/* One calm line: what it costs, how long it takes. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
            {label}
          </span>

          <div className="flex items-center gap-2">
            {loading ? (
              <span
                className="sol-fee-skeleton block h-3 w-28 bg-[var(--sk-skeleton,#22262f)]"
                aria-hidden
              />
            ) : hasEstimate ? (
              <span
                key={feeKey}
                className={`text-[13px] tabular-nums text-[var(--sk-text,#f7f7f7)] ${
                  reduceMotion ? "" : "sol-fee-tick"
                }`}
              >
                <span className="font-semibold">{feeText}</span>
                {timeText && (
                  <>
                    <span
                      aria-hidden
                      className="mx-1.5 text-[var(--sk-text-quaternary,#61656c)]"
                    >
                      ·
                    </span>
                    <span className="text-[var(--sk-text-tertiary,#94969c)]">
                      confirms in {timeText}
                    </span>
                  </>
                )}
              </span>
            ) : (
              // Never block on a missing estimate.
              <span className="text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
                Fee estimate unavailable{" "}
                <span className="text-[var(--sk-text-quaternary,#61656c)]">
                  — typically under $0.01
                </span>
              </span>
            )}

            {hasBreakdown && !loading && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls={detailsId}
                aria-label={open ? "Hide fee breakdown" : "Show fee breakdown"}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[var(--sk-text-quaternary,#61656c)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97]"
              >
                <Info aria-hidden className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Congestion — eases in and back out, same treatment as the token
            input's insufficient-balance correction. Never alarm-red. */}
        <div
          aria-hidden={!congested}
          className={`grid transition-all duration-200 ease-out ${
            congested
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="text-[12px] leading-relaxed text-[var(--sk-warning,#e8b562)]">
              Network is busy — fees are higher than usual.
            </p>
          </div>
        </div>

        {/* Breakdown — same smooth height+fade collapsible as the kit.
            Not rendered at all without a breakdown to show, so there's no
            dead panel behind a trigger that doesn't exist. */}
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
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                    Base fee
                  </dt>
                  <dd className="text-right">
                    <div className="text-[12px] tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
                      {baseFeeUsd !== undefined ? formatUsd(baseFeeUsd) : "—"}
                    </div>
                    {baseFeeSol !== undefined && (
                      <div className="text-[11px] tabular-nums text-[var(--sk-text-quaternary,#61656c)]">
                        {formatSol(baseFeeSol)}
                      </div>
                    )}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                    Priority fee
                  </dt>
                  <dd className="text-right">
                    <div className="text-[12px] tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
                      {priorityFeeUsd !== undefined
                        ? formatUsd(priorityFeeUsd)
                        : "—"}
                    </div>
                    {priorityFeeSol !== undefined && (
                      <div className="text-[11px] tabular-nums text-[var(--sk-text-quaternary,#61656c)]">
                        {formatSol(priorityFeeSol)}
                      </div>
                    )}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-[12px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                A small tip that gets your transaction processed faster during
                busy periods.
              </p>

              {solText && (
                <p className="mt-2 text-[11px] tabular-nums text-[var(--sk-text-quaternary,#61656c)]">
                  Total {solText}
                </p>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Speed selector */}
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
                      key={`${opt.feeUsd}-${
                        Array.isArray(opt.confirmTime)
                          ? opt.confirmTime.join("-")
                          : opt.confirmTime
                      }`}
                      className={`mt-0.5 block text-[11px] tabular-nums ${
                        active
                          ? "text-[var(--sk-btn-text,#18e3a5)] opacity-80"
                          : "text-[var(--sk-text-quaternary,#61656c)]"
                      } ${reduceMotion ? "" : "sol-fee-tick"}`}
                    >
                      {formatUsd(opt.feeUsd)} · {formatTime(opt.confirmTime)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {loading ? "" : announcement}
      </div>
    </div>
  );
}
