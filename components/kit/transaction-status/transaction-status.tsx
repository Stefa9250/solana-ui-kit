"use client";

/**
 * TransactionStatus — Solana UI Kit
 *
 * Every state of a Solana transaction with human-readable errors and calm,
 * purposeful motion. Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * <TransactionStatus
 *   status="confirming"
 *   signature={signature}
 *   confirmations={12}
 *   errorMap={[{ test: /0x1771/i, text: "Price moved too much." }]}
 *   onRetry={() => resubmit()}
 *   onDismiss={() => reset()}
 * />
 *
 * Note on confirmations: `getSignatureStatuses` counts up to ~31 slots
 * (finality), but most dApps treat the "confirmed" commitment (~1–2s) as
 * success. If that's you, jump straight to status="confirmed" and skip the
 * count — or omit `confirmations` for a calm indeterminate bar.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, X } from "lucide-react";

export interface TransactionStatusErrorRule {
  test: RegExp;
  text: string;
}

/**
 * Program-agnostic defaults only. Anchor custom errors (0x1770 + N) mean
 * different things per program — pass your program's own rules via the
 * `errorMap` prop, e.g. for a Jupiter swap:
 *   { test: /0x1771/i, text: "Price moved too much. Try again or increase slippage." }
 */
const DEFAULT_ERROR_MAP: TransactionStatusErrorRule[] = [
  {
    test: /slippage/i,
    text: "Price moved too much. Try again or increase slippage.",
  },
  {
    test: /insufficientfundsforrent|insufficient funds for rent/i,
    text: "Not enough SOL would be left for rent. Add SOL and retry.",
  },
  {
    test: /insufficient.*(lamports|funds|sol)/i,
    text: "Not enough SOL to cover this transaction and its fees.",
  },
  {
    test: /blockhash.*expired|blockhash not found/i,
    text: "This transaction timed out. Tap retry to resubmit.",
  },
  {
    test: /user rejected|rejected the request|user cancelled|user declined/i,
    text: "You cancelled this in your wallet.",
  },
  {
    test: /compute budget|computational budget|out of compute|exceeded cus/i,
    text: "The transaction ran out of compute. Retry with a higher compute limit.",
  },
  {
    test: /accountnotfound|could not find account|account does not exist/i,
    text: "An account this transaction needs doesn’t exist yet.",
  },
  {
    test: /429|too many requests|rate.?limit/i,
    text: "The network endpoint is busy. Wait a moment and retry.",
  },
];

function friendlyError(
  raw: string | undefined,
  errorMap?: TransactionStatusErrorRule[],
): { text: string; raw: string } {
  if (!raw) return { text: "Something went wrong on-chain.", raw: "" };
  // RPC simulation wraps the real error — strip the prefix before matching.
  const normalized = raw.replace(/^.*transaction simulation failed:\s*/i, "");
  const rules = errorMap ? [...errorMap, ...DEFAULT_ERROR_MAP] : DEFAULT_ERROR_MAP;
  const match = rules.find((rule) => rule.test.test(normalized));
  return { text: match ? match.text : "Something went wrong on-chain.", raw };
}

export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

function defaultExplorerUrl(signature: string, cluster: SolanaCluster): string {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://solscan.io/tx/${signature}${suffix}`;
}

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

export type TransactionStatusState =
  | "idle"
  | "pending"
  | "confirming"
  | "confirmed"
  | "failed";

export interface TransactionStatusDetails {
  /** Headline of the transaction card, e.g. "Sending 2.5 SOL". */
  primary: string;
  /** Line under the headline, e.g. "to sol.domain.eth". */
  secondary?: string;
  /** Right-aligned monospace meta, e.g. a short address. */
  meta?: string;
}

export interface TransactionStatusProps {
  status: TransactionStatusState;
  /** Transaction signature — powers the explorer link and short display. */
  signature?: string;
  /** Raw RPC / wallet error. Mapped to plain language automatically. */
  error?: string;
  /**
   * Your program's error rules, matched before the built-in defaults.
   * Anchor custom errors (0x1770 + N) are program-specific — map them here.
   */
  errorMap?: TransactionStatusErrorRule[];
  /** Confirmations so far. Omit while confirming for an indeterminate bar. */
  confirmations?: number;
  /** Confirmation target (~31 slots to finality). */
  totalConfirmations?: number;
  /** Explorer links point at this cluster (default mainnet-beta). */
  cluster?: SolanaCluster;
  /** Override the explorer entirely, e.g. (sig) => `https://solana.fm/tx/${sig}`. */
  explorerUrl?: (signature: string) => string;
  /** Called from the Retry button in the failed state. */
  onRetry?: () => void;
  /** When provided, shows a dismiss button and enables autoDismissMs. */
  onDismiss?: () => void;
  /** Auto-dismiss this many ms after confirmed (requires onDismiss). */
  autoDismissMs?: number;
  /** Move focus to Retry when a transaction fails (default true). */
  autoFocusRetry?: boolean;
  /** Optional transaction summary card shown under the status row. */
  details?: TransactionStatusDetails;
  className?: string;
}

/* Scoped keyframes — inlined so the component works with zero Tailwind config. */
const KEYFRAMES = `
@keyframes sol-txs-fade-slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-txs-trace { from { stroke-dashoffset: 128; } to { stroke-dashoffset: 0; } }
@keyframes sol-txs-core-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes sol-txs-check-circle { from { stroke-dashoffset: 132; } to { stroke-dashoffset: 0; } }
@keyframes sol-txs-check-mark { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
@keyframes sol-txs-bounce-scale { 0% { transform: scale(0.85); } 55% { transform: scale(1.06); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
@keyframes sol-txs-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-3px); } 40% { transform: translateX(2px); } 60% { transform: translateX(-2px); } 80% { transform: translateX(1px); } }
@keyframes sol-txs-flash-green { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.62; } }
@keyframes sol-txs-sweep { from { transform: translateX(-100%); } to { transform: translateX(400%); } }
.sol-txs-panel-enter { animation: sol-txs-fade-slide-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-txs-trace-path { stroke-dasharray: 32 96; animation: sol-txs-trace 2.4s linear infinite; }
.sol-txs-trace-core { transform-origin: center; transform-box: fill-box; animation: sol-txs-core-breathe 2.4s ease-in-out infinite; }
.sol-txs-check-circle-path { stroke-dasharray: 132; animation: sol-txs-check-circle 500ms cubic-bezier(0.65,0,0.35,1) forwards; }
.sol-txs-check-mark-path { stroke-dasharray: 24; animation: sol-txs-check-mark 260ms cubic-bezier(0.65,0,0.35,1) 420ms forwards; }
.sol-txs-success-bounce { animation: sol-txs-bounce-scale 480ms cubic-bezier(0.34,1.56,0.64,1) 400ms both; }
.sol-txs-shake { animation: sol-txs-shake 420ms cubic-bezier(0.36,0.07,0.19,0.97) both; }
.sol-txs-flash { animation: sol-txs-flash-green 700ms ease-in-out both; }
.sol-txs-sweep { animation: sol-txs-sweep 1.6s ease-in-out infinite; }
.sol-txs-stripes { background-image: linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent); background-size: 28px 28px; }
@media (prefers-reduced-motion: reduce) {
  .sol-txs-panel-enter, .sol-txs-trace-path, .sol-txs-trace-core, .sol-txs-check-circle-path,
  .sol-txs-check-mark-path, .sol-txs-success-bounce, .sol-txs-shake, .sol-txs-flash, .sol-txs-sweep {
    animation: none !important;
  }
  .sol-txs-check-circle-path, .sol-txs-check-mark-path { stroke-dashoffset: 0; }
  .sol-txs-trace-path { stroke-dasharray: none; }
}
`;

/** Pending glyph: a block outline being traced while the core breathes. */
function BlockTrace() {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center" aria-hidden>
      <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
        <rect x={2} y={2} width={32} height={32} stroke="#22262f" strokeWidth={2} />
        <rect
          className="sol-txs-trace-path"
          x={2}
          y={2}
          width={32}
          height={32}
          stroke="#34d399"
          strokeWidth={2}
        />
        <rect
          className="sol-txs-trace-core"
          x={14}
          y={14}
          width={8}
          height={8}
          fill="#059669"
        />
      </svg>
    </div>
  );
}

function SolanaMark() {
  return (
    <div className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-black">
      <svg width={16} height={16} viewBox="0 0 397 311" fill="none" aria-hidden>
        <defs>
          <linearGradient
            id="sol-txs-gradient"
            x1="360.879"
            y1="351.455"
            x2="141.213"
            y2="-69.294"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset={0} stopColor="#00FFA3" />
            <stop offset={1} stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
        <path
          d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
          fill="url(#sol-txs-gradient)"
        />
        <path
          d="M64.6 3.8C67.1 1.4 70.4 0 73.9 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
          fill="url(#sol-txs-gradient)"
        />
        <path
          d="M332.3 120.4c-2.4-2.4-5.7-3.8-9.2-3.8H5.7c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
          fill="url(#sol-txs-gradient)"
        />
      </svg>
    </div>
  );
}

export function TransactionStatus({
  status,
  signature,
  error,
  errorMap,
  confirmations,
  totalConfirmations = 31,
  cluster = "mainnet-beta",
  explorerUrl: explorerUrlProp,
  onRetry,
  onDismiss,
  autoDismissMs,
  autoFocusRetry = true,
  details,
  className,
}: TransactionStatusProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [displayPct, setDisplayPct] = useState(0);
  const [prevStatus, setPrevStatus] = useState(status);
  const displayPctRef = useRef(0);
  const retryRef = useRef<HTMLButtonElement>(null);
  const onDismissRef = useRef(onDismiss);
  const reduceMotion = useReducedMotion();

  // Reset the collapsible + progress when a new attempt starts
  // (render-phase adjustment — https://react.dev/learn/you-might-not-need-an-effect).
  if (prevStatus !== status) {
    setPrevStatus(status);
    setDetailsOpen(false);
    if (status === "pending" || status === "idle") {
      setDisplayPct(0);
    } else if (status === "confirmed") {
      setDisplayPct(100);
    }
  }

  // Mirror displayPct into a ref for the animation loop (refs can't be
  // written during render; this effect must run before the loop below).
  useEffect(() => {
    displayPctRef.current = displayPct;
  }, [displayPct]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Focus lands on Retry when a transaction fails. Refs are attached by the
  // time effects run, and rAF would never fire in a backgrounded tab.
  useEffect(() => {
    if (status === "failed" && autoFocusRetry) retryRef.current?.focus();
  }, [status, autoFocusRetry]);

  // Optional auto-dismiss once confirmed.
  useEffect(() => {
    if (status !== "confirmed" || !autoDismissMs) return;
    const t = setTimeout(() => onDismissRef.current?.(), autoDismissMs);
    return () => clearTimeout(t);
  }, [status, autoDismissMs]);

  // Frame-rate independent exponential catch-up toward the confirmation target:
  // the fill is always closing the gap, never stalling or restarting.
  useEffect(() => {
    if (status !== "confirming" || confirmations === undefined || reduceMotion)
      return;
    const target = Math.min(100, (confirmations / totalConfirmations) * 100);
    const TAU = 120; // ms time-constant of the catch-up curve
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const factor = 1 - Math.exp(-dt / TAU);
      let next =
        displayPctRef.current + (target - displayPctRef.current) * factor;
      if (Math.abs(target - next) < 0.03) next = target;
      if (next !== displayPctRef.current) {
        displayPctRef.current = next;
        setDisplayPct(next);
      }
      if (next !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, confirmations, totalConfirmations, reduceMotion]);

  const explorerHref = signature
    ? explorerUrlProp
      ? explorerUrlProp(signature)
      : defaultExplorerUrl(signature, cluster)
    : undefined;
  const shortSig = signature
    ? `${signature.slice(0, 4)}…${signature.slice(-4)}`
    : "";
  const friendly = friendlyError(error, errorMap);
  const pct = Math.round(
    Math.min(100, ((confirmations ?? 0) / totalConfirmations) * 100),
  );
  const atTarget =
    confirmations !== undefined && confirmations >= totalConfirmations;

  // Milestone announcements only — announcing every confirmation update
  // would flood screen readers.
  const liveAnnouncement =
    status === "pending"
      ? "Transaction sent, awaiting confirmation."
      : status === "confirming"
        ? confirmations !== undefined && pct >= 50
          ? "More than halfway confirmed."
          : "Confirming transaction."
        : status === "confirmed"
          ? "Transaction confirmed."
          : status === "failed"
            ? `Transaction failed. ${friendly.text}`
            : "";

  if (status === "idle") return null;

  const explorerLink = explorerHref && (
    <a
      href={explorerHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-400 transition-colors duration-150 hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
    >
      View on Solscan {"↗"}
    </a>
  );

  const detailsCard = details && (
    <div className="relative mt-[18px] flex items-center justify-between gap-3 overflow-hidden border border-[#22262f] bg-[#1f242f] px-3.5 py-3">
      {status === "confirming" &&
        (confirmations === undefined ? (
          <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div className="sol-txs-stripes sol-txs-sweep absolute inset-y-0 w-1/4 bg-[#333741] opacity-50" />
          </div>
        ) : (
          <div
            aria-hidden
            className={`sol-txs-stripes absolute bottom-0 left-0 top-0 z-0 opacity-50 transition-colors duration-200 ${
              atTarget ? "sol-txs-flash bg-[#17b26a]" : "bg-[#333741]"
            }`}
            style={{
              width: `${(reduceMotion ? pct : displayPct).toFixed(2)}%`,
              willChange: "width",
            }}
          />
        ))}
      <div className="relative z-10 flex items-center gap-2.5">
        <SolanaMark />
        <div>
          <div className="text-[14px] font-semibold text-[#f7f7f7]">
            {details.primary}
          </div>
          {details.secondary && (
            <div className="mt-px text-[12px] text-[#94969c]">
              {details.secondary}
            </div>
          )}
        </div>
      </div>
      {details.meta && (
        <div
          className={`relative z-10 shrink-0 text-right font-mono text-[12px] ${
            status === "confirming" ? "text-[#94969c]" : "text-[#61656c]"
          }`}
        >
          {details.meta}
        </div>
      )}
    </div>
  );

  return (
    <div className={`relative ${className ?? ""}`}>
      <style>{KEYFRAMES}</style>
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-0 top-0 z-10 flex size-7 cursor-pointer items-center justify-center text-[#61656c] transition-colors duration-150 hover:bg-[#22262f] hover:text-[#cecfd2] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}

      <div
        key={status}
        className={`sol-txs-panel-enter ${status === "failed" ? "sol-txs-shake" : ""}`}
      >
        {status === "pending" && (
          <div className="flex items-center gap-4">
            <BlockTrace />
            <div>
              <div className="text-[15px] font-semibold text-[#f7f7f7]">
                Sending transaction
              </div>
              <div className="mt-0.5 text-[13px] text-[#94969c]">
                Waiting for the network to pick it up{"…"}
              </div>
              {explorerLink && <div className="mt-2">{explorerLink}</div>}
            </div>
          </div>
        )}

        {status === "confirming" && (
          <div className="flex items-center gap-4 py-1">
            <BlockTrace />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-[#f7f7f7]">
                Confirming
              </div>
              <div className="mt-0.5 text-[13px] text-[#94969c]">
                {confirmations === undefined
                  ? "Waiting for confirmations…"
                  : `${confirmations} of ${totalConfirmations} confirmations`}
              </div>
              <div className="relative mt-2 h-[3px] w-full max-w-[220px] overflow-hidden bg-[#22262f]">
                {confirmations === undefined ? (
                  <div
                    aria-hidden
                    className="sol-txs-sweep absolute inset-y-0 w-1/4 bg-emerald-600/60"
                  />
                ) : (
                  <div
                    aria-hidden
                    className={`absolute inset-y-0 left-0 transition-colors duration-200 ${
                      atTarget ? "bg-[#17b26a]" : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${(reduceMotion ? pct : displayPct).toFixed(2)}%`,
                    }}
                  />
                )}
              </div>
              {explorerLink && <div className="mt-2.5">{explorerLink}</div>}
            </div>
          </div>
        )}

        {status === "confirmed" && (
          <div className="flex items-center gap-4 py-1">
            <div className="sol-txs-success-bounce shrink-0">
              <svg width={48} height={48} viewBox="0 0 48 48" fill="none" aria-hidden>
                <circle
                  className="sol-txs-check-circle-path"
                  cx={24}
                  cy={24}
                  r={21}
                  stroke="#17b26a"
                  strokeWidth={2.5}
                />
                <path
                  className="sol-txs-check-mark-path"
                  d="M15 24.5L21 30.5L33 17.5"
                  stroke="#17b26a"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[#f7f7f7]">
                Transaction confirmed
              </div>
              {shortSig && (
                <div className="mt-0.5 text-[13px] text-[#94969c]">{shortSig}</div>
              )}
              {explorerLink && <div className="mt-2">{explorerLink}</div>}
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f04438]/[0.12]">
                <AlertCircle aria-hidden className="size-5 text-[#f97066]" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[#f7f7f7]">
                  Transaction failed
                </div>
                <div className="mt-0.5 text-[13px] text-[#94969c]">
                  {friendly.text}
                </div>
              </div>
            </div>

            {friendly.raw && (
              <div>
                <button
                  type="button"
                  onClick={() => setDetailsOpen((open) => !open)}
                  aria-expanded={detailsOpen}
                  className="cursor-pointer text-[12px] text-[#61656c] underline underline-offset-2 transition-colors duration-150 hover:text-[#cecfd2] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                >
                  {detailsOpen ? "Hide technical details" : "Show technical details"}
                </button>
                {detailsOpen && (
                  <pre className="mt-2 overflow-x-auto border border-[#22262f] bg-[#0c0e12] px-3 py-2.5 font-mono text-[12px] text-[#94969c]">
                    {friendly.raw}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3.5">
              <button
                type="button"
                ref={retryRef}
                onClick={onRetry}
                className="cursor-pointer bg-[#00543f] px-4 py-2 text-[13px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] active:brightness-90 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
              >
                Retry
              </button>
              {explorerLink}
            </div>
          </div>
        )}

        {detailsCard}
      </div>
    </div>
  );
}
