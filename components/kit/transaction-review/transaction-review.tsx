"use client";

/**
 * TransactionReview — Solana UI Kit
 *
 * The screen that decides trust: a plain-language, simulation-driven preview
 * of what a transaction will actually do BEFORE the user signs. Net balance
 * changes ("you pay X / you receive Y"), the fee, and any warnings, with a
 * three-level severity — safe / warn / block — where a blocking transaction
 * makes Reject the prominent action and demotes Sign to a deliberate
 * "Sign anyway". A missing simulation never hard-blocks; it degrades to an
 * honest "couldn't preview — proceed with caution".
 *
 * This renders a simulation you pass in; it does not run one. Feed it from
 * simulateTransaction (balance/token deltas) plus a scanner (Blowfish, the
 * wallet's own heuristics) for the warnings.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file.
 *
 * <TransactionReview
 *   origin="jup.ag"
 *   assets={[{ symbol: "SOL", amount: "2.5", usd: 430.45, direction: "out" }]}
 *   warnings={[{ severity: "warn", title: "New recipient" }]}
 *   feeUsd={0.0013}
 *   severity="warn"
 *   onSign={sign}
 *   onReject={reject}
 * />
 */

import {
  useInsertionEffect,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Info, ShieldAlert } from "lucide-react";

export type ReviewSeverity = "safe" | "warn" | "block";
export type WarningLevel = "info" | "warn" | "danger";

export interface ReviewAsset {
  symbol: string;
  /** Human-unit amount, absolute value, as a string ("2.5", "1,234.56"). */
  amount: string;
  /** USD value of this line. */
  usd?: number;
  /** out = the user pays it; in = the user receives it. */
  direction: "out" | "in";
  /** Logo URL or data URI. Falls back to a colored initial. */
  icon?: string;
  color?: string;
}

export interface ReviewWarning {
  level: WarningLevel;
  title: string;
  /** Optional expandable detail. */
  detail?: string;
}

export interface TransactionReviewProps {
  /** The dApp domain requesting the signature — shown for phishing awareness. */
  origin?: string;
  /** Net balance changes from the simulation. */
  assets?: ReviewAsset[];
  /** Scanner / heuristic findings, most severe first. */
  warnings?: ReviewWarning[];
  /** Network fee. */
  feeUsd?: number;
  feeSol?: number;
  /**
   * Overall verdict. "block" makes Reject the primary action and Sign a
   * deliberate "Sign anyway". Defaults to the highest warning level.
   */
  severity?: ReviewSeverity;
  /** Simulation in flight — shows skeletons. */
  simulating?: boolean;
  /** Simulation couldn't run — shows a proceed-with-caution notice. */
  simulationFailed?: boolean;
  /** Sign in flight — spinner on the sign action, both actions disabled. */
  signing?: boolean;
  onSign?: () => void;
  onReject?: () => void;
  signLabel?: string;
  rejectLabel?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */

function finite(v: number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatUsd(v: number | null): string | null {
  if (v === null || v <= 0) return null;
  if (v < 0.001) return "<$0.001";
  if (v < 0.1) return `$${v.toFixed(3)}`;
  if (v < 1) return `$${v.toFixed(2)}`;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Group an already-human-unit amount string; leaves the fraction as given. */
function groupAmount(s: string): string {
  const clean = s.replace(/,/g, "");
  const [int, frac] = clean.split(".");
  const grouped = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === undefined ? grouped : `${grouped}.${frac}`;
}

function highestLevel(warnings: ReviewWarning[]): ReviewSeverity {
  if (warnings.some((w) => w.level === "danger")) return "block";
  if (warnings.some((w) => w.level === "warn")) return "warn";
  return "safe";
}

/* ------------------------------------------------------------------ */

function useKitStyles(id: string, css: string) {
  useInsertionEffect(() => {
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

const STYLE_ID = "sol-txr-styles";
const KEYFRAMES = `
@keyframes sol-txr-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-txr-spin { to { transform: rotate(360deg); } }
@keyframes sol-txr-shimmer { from { transform: translateX(-100%); } to { transform: translateX(220%); } }
.sol-txr-in { animation: sol-txr-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-txr-spin { animation: sol-txr-spin 900ms linear infinite; }
.sol-txr-skeleton { position: relative; overflow: hidden; }
.sol-txr-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: sol-txr-shimmer 1.6s cubic-bezier(0.4,0,0.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .sol-txr-in, .sol-txr-spin { animation: none !important; }
  .sol-txr-skeleton::after { animation: none !important; display: none; }
}
`;

const WARNING_STYLE: Record<
  WarningLevel,
  { color: string; icon: typeof Info }
> = {
  info: { color: "var(--sk-text-tertiary,#94969c)", icon: Info },
  warn: { color: "var(--sk-warning,#e8b562)", icon: AlertTriangle },
  danger: { color: "var(--sk-danger,#f97066)", icon: ShieldAlert },
};

function AssetGlyph({ asset, size = 22 }: { asset: ReviewAsset; size?: number }) {
  if (asset.icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data-URI logos need no optimization
      <img
        src={asset.icon}
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
        background: asset.color ?? "#94969c",
      }}
    >
      {asset.symbol.slice(0, 1)}
    </span>
  );
}

function AssetRow({ asset }: { asset: ReviewAsset }) {
  const out = asset.direction === "out";
  const Arrow = out ? ArrowUpRight : ArrowDownLeft;
  const usd = formatUsd(finite(asset.usd));
  return (
    <div className="flex items-center gap-3 py-1.5">
      <AssetGlyph asset={asset} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
          <Arrow
            aria-hidden
            className={`size-3.5 ${
              out
                ? "text-[var(--sk-text-tertiary,#94969c)]"
                : "text-[var(--sk-success,#17b26a)]"
            }`}
          />
          <span className="tabular-nums">
            {out ? "−" : "+"}
            {groupAmount(asset.amount)} {asset.symbol}
          </span>
        </div>
      </div>
      {usd && (
        <div className="shrink-0 text-right text-[13px] tabular-nums text-[var(--sk-text-tertiary,#94969c)]">
          {usd}
        </div>
      )}
    </div>
  );
}

export function TransactionReview({
  origin,
  assets = [],
  warnings = [],
  feeUsd,
  feeSol,
  severity,
  simulating = false,
  simulationFailed = false,
  signing = false,
  onSign,
  onReject,
  signLabel = "Sign",
  rejectLabel = "Reject",
  className,
}: TransactionReviewProps) {
  useKitStyles(STYLE_ID, KEYFRAMES);
  const [openDetail, setOpenDetail] = useState<number | null>(null);

  const verdict = severity ?? highestLevel(warnings);
  const blocked = verdict === "block";

  const outAssets = assets.filter((a) => a.direction === "out");
  const inAssets = assets.filter((a) => a.direction === "in");
  const feeUsdText = formatUsd(finite(feeUsd));
  const feeSolText =
    finite(feeSol) !== null ? `${groupAmount(String(feeSol))} SOL` : null;

  const borderColor = blocked
    ? "var(--sk-danger,#f97066)"
    : verdict === "warn"
      ? "var(--sk-warning-border,#8a6c2f)"
      : "var(--sk-border,#22262f)";

  const skeleton = (w: string) => (
    <span
      className={`sol-txr-skeleton block h-4 ${w} bg-[var(--sk-skeleton,#22262f)]`}
      aria-hidden
    />
  );

  const section = (label: string, children: ReactNode) => (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--sk-text-quaternary,#61656c)]">
        {label}
      </div>
      {children}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review transaction"
      className={className}
    >
      <div
        style={{ borderColor }}
        className="flex flex-col gap-4 border bg-[var(--sk-surface,#161b26)] p-5 transition-colors duration-200 ease-out"
      >
        {/* Header — who is asking. */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold text-[var(--sk-text,#f7f7f7)]">
              Review transaction
            </div>
            {origin && (
              <div className="mt-0.5 text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                Requested by{" "}
                <span className="font-mono text-[var(--sk-text-secondary,#cecfd2)]">
                  {origin}
                </span>
              </div>
            )}
          </div>
          {blocked && (
            <span className="inline-flex items-center gap-1 border border-[var(--sk-danger,#f97066)] px-2 py-0.5 text-[11px] font-semibold text-[var(--sk-danger,#f97066)]">
              <ShieldAlert aria-hidden className="size-3" />
              High risk
            </span>
          )}
        </div>

        {/* Warnings — most severe first, danger can't be missed. */}
        {!simulating && warnings.length > 0 && (
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => {
              const s = WARNING_STYLE[w.level];
              const Icon = s.icon;
              const isOpen = openDetail === i;
              return (
                <div
                  key={`${w.title}-${i}`}
                  className="sol-txr-in border-l-2 bg-[var(--sk-card,#13161b)] px-3 py-2"
                  style={{ borderColor: s.color }}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0"
                      style={{ color: s.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[13px] font-semibold"
                        style={{ color: s.color }}
                      >
                        {w.title}
                      </div>
                      {w.detail && (
                        <>
                          <button
                            type="button"
                            onClick={() => setOpenDetail(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="mt-0.5 cursor-pointer text-[12px] text-[var(--sk-text-quaternary,#61656c)] underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                          >
                            {isOpen ? "Hide details" : "Details"}
                          </button>
                          {isOpen && (
                            <p className="mt-1 text-[12px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                              {w.detail}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Net balance changes — the core of the review. */}
        <div className="flex flex-col gap-3">
          {simulating ? (
            <div className="flex flex-col gap-3">
              {section("Estimated changes", null)}
              <div className="flex items-center gap-3">
                <span
                  className="sol-txr-skeleton block size-[22px] shrink-0 rounded-full bg-[var(--sk-skeleton,#22262f)]"
                  aria-hidden
                />
                {skeleton("w-40")}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="sol-txr-skeleton block size-[22px] shrink-0 rounded-full bg-[var(--sk-skeleton,#22262f)]"
                  aria-hidden
                />
                {skeleton("w-32")}
              </div>
            </div>
          ) : simulationFailed ? (
            <div className="border-l-2 border-[var(--sk-warning,#e8b562)] bg-[var(--sk-card,#13161b)] px-3 py-2.5">
              <div className="flex items-start gap-2 text-[13px] text-[var(--sk-warning,#e8b562)]">
                <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Couldn’t preview this transaction. Only sign if you trust{" "}
                  {origin ?? "this app"} and know what it does.
                </span>
              </div>
            </div>
          ) : assets.length === 0 ? (
            <p className="text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
              No balance changes detected. This transaction updates on-chain
              state without moving your tokens.
            </p>
          ) : (
            <>
              {outAssets.length > 0 &&
                section(
                  "You pay",
                  <div className="flex flex-col divide-y divide-[var(--sk-border,#22262f)]">
                    {outAssets.map((a, i) => (
                      <AssetRow key={`out-${a.symbol}-${i}`} asset={a} />
                    ))}
                  </div>,
                )}
              {inAssets.length > 0 &&
                section(
                  "You receive",
                  <div className="flex flex-col divide-y divide-[var(--sk-border,#22262f)]">
                    {inAssets.map((a, i) => (
                      <AssetRow key={`in-${a.symbol}-${i}`} asset={a} />
                    ))}
                  </div>,
                )}
            </>
          )}
        </div>

        {/* Fee line. */}
        <div className="flex items-center justify-between border-t border-[var(--sk-border,#22262f)] pt-3 text-[13px]">
          <span className="text-[var(--sk-text-tertiary,#94969c)]">Network fee</span>
          {simulating ? (
            skeleton("w-16")
          ) : feeUsdText ? (
            <span className="tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
              ≈ {feeUsdText}
              {feeSolText && (
                <span className="ml-1.5 text-[var(--sk-text-quaternary,#61656c)]">
                  {feeSolText}
                </span>
              )}
            </span>
          ) : (
            <span className="text-[var(--sk-text-tertiary,#94969c)]">
              typically under $0.01
            </span>
          )}
        </div>

        {/* Actions. On a blocking verdict, Reject is primary and Sign is the
            deliberate, cautionary choice — safe by default. */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onReject}
            disabled={signing}
            className={`flex-1 cursor-pointer px-4 py-2.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
              blocked
                ? "bg-[var(--sk-btn,#00543f)] text-[var(--sk-btn-text,#18e3a5)] hover:bg-[var(--sk-btn-hover,#006a53)]"
                : "border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] text-[var(--sk-text-secondary,#cecfd2)] hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text,#f7f7f7)]"
            }`}
          >
            {rejectLabel}
          </button>
          <button
            type="button"
            onClick={onSign}
            disabled={signing}
            aria-busy={signing || undefined}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
              blocked
                ? "border border-[var(--sk-danger,#f97066)] bg-transparent text-[var(--sk-danger,#f97066)] hover:bg-[var(--sk-danger-bg,rgba(240,68,56,0.12))]"
                : "bg-[var(--sk-btn,#00543f)] text-[var(--sk-btn-text,#18e3a5)] hover:bg-[var(--sk-btn-hover,#006a53)]"
            }`}
          >
            {signing && (
              <span
                aria-hidden
                className="sol-txr-spin size-3.5 rounded-full border-2 border-current border-t-transparent"
              />
            )}
            {signing ? "Signing…" : blocked ? "Sign anyway" : signLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
