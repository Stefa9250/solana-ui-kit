"use client";

/**
 * TransactionReview — Solana UI Kit
 *
 * The screen that decides trust: a plain-language, simulation-driven preview
 * of what a transaction will actually do BEFORE the user signs. Net balance
 * changes ("you pay X / you receive Y"), token approvals it grants, the fee,
 * and any warnings, with a three-level severity — safe / warn / block. A
 * blocking transaction turns the card coral, makes Reject the prominent
 * action, and demotes Sign to a deliberate "Sign anyway" gated behind an
 * explicit acknowledgement. A missing simulation never hard-blocks; it
 * degrades to an honest "couldn't preview — proceed with caution".
 *
 * This renders a simulation you pass in; it does not run one. Feed it from
 * simulateTransaction (pre/post balance deltas) plus a scanner (Blowfish, the
 * wallet's own heuristics) for the warnings. See mock-simulation.ts for a
 * worked mapping — the hard part is producing correct `assets`/`approvals`/
 * `warnings`, and a naive balance-diff misses approvals, setAuthority and
 * closeAccount entirely.
 *
 * This is a content panel, not a modal — it does not own an overlay or portal.
 * Wrap it in ConnectWalletModal-style chrome (or your own dialog) if you need
 * modality; it will trap focus and lock scroll for you there.
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
 *   feeUsd={0.0013}
 *   onSign={sign}
 *   onReject={reject}
 * />
 */

import {
  useEffect,
  useRef,
  useState,
  useInsertionEffect,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Info,
  KeyRound,
  ShieldAlert,
} from "lucide-react";

export type ReviewSeverity = "safe" | "warn" | "block";
export type WarningLevel = "info" | "warn" | "danger";

export interface ReviewAsset {
  symbol: string;
  /** out = the user pays it; in = the user receives it. */
  direction: "out" | "in";
  /** Pre-formatted human-unit amount, absolute value ("2.5", "1,234.56"). */
  amount?: string;
  /** Raw base units — converted to human units with `decimals` inside. */
  rawAmount?: string | number | bigint;
  /** Decimals for `rawAmount` (SOL 9, USDC 6). */
  decimals?: number;
  /** USD value of this line. */
  usd?: number;
  icon?: string;
  color?: string;
}

export interface ReviewApproval {
  symbol: string;
  /** Cap in human units. Omit (or "unlimited") for an unlimited allowance. */
  amount?: string;
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
  /** Mark the origin as verified. Unverified/omitted shows a caution chip. */
  originVerified?: boolean;
  /** Net balance changes from the simulation. */
  assets?: ReviewAsset[];
  /** Token approvals the transaction grants — unlimited ones are flagged. */
  approvals?: ReviewApproval[];
  /** Scanner / heuristic findings, most severe first. */
  warnings?: ReviewWarning[];
  /** Network fee. Rounds UP, never below what the runtime debits. */
  feeUsd?: number;
  feeSol?: number;
  /** Quiet attribution — "Simulated by Blowfish" — so users can calibrate. */
  simulatedBy?: string;
  /**
   * Overall verdict. An explicit value can only RAISE the level implied by
   * the warnings, never lower it. Block flips Reject to primary and gates Sign.
   */
  severity?: ReviewSeverity;
  /** Require an "I understand" acknowledgement before Sign on a block verdict. */
  requireAckOnBlock?: boolean;
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

const SEVERITY_ORDER: Record<ReviewSeverity, number> = { safe: 0, warn: 1, block: 2 };

function highestLevel(warnings: ReviewWarning[]): ReviewSeverity {
  if (warnings.some((w) => w.level === "danger")) return "block";
  if (warnings.some((w) => w.level === "warn")) return "warn";
  return "safe";
}

function finite(v: number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function ceilTo(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.ceil(v * f - 1e-9) / f;
}

/** Costs round up — matches FeeExplainer so the two surfaces never disagree. */
function formatUsd(v: number | null): string | null {
  if (v === null || v <= 0) return null;
  if (v < 0.001) return "<$0.001";
  if (v < 0.1) return `$${ceilTo(v, 3).toFixed(3)}`;
  if (v < 1) return `$${ceilTo(v, 2).toFixed(2)}`;
  return ceilTo(v, 2).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Group an already-human-unit amount; strips a leading sign (we add our own). */
function groupAmount(s: string): string {
  const clean = s.replace(/,/g, "").replace(/^[+-]/, "");
  const [int, frac] = clean.split(".");
  const grouped = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === undefined ? grouped : `${grouped}.${frac}`;
}

function fromBaseUnits(raw: string | number | bigint, decimals: number): string {
  let v: bigint;
  try {
    v = typeof raw === "bigint" ? raw : BigInt(String(raw).split(".")[0] || "0");
  } catch {
    return "0";
  }
  if (v < BigInt(0)) v = -v;
  if (decimals <= 0) return v.toString();
  const s = v.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}

/** Never exponential — 0.000005 not 5e-6 — matching FeeExplainer's formatSol. */
function formatSol(v: number | null): string | null {
  if (v === null || v <= 0) return null;
  const s = v.toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
  return `${s} SOL`;
}

function assetDisplay(a: ReviewAsset): string {
  if (a.rawAmount !== undefined) {
    return groupAmount(fromBaseUnits(a.rawAmount, a.decimals ?? 0));
  }
  return groupAmount(a.amount ?? "0");
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
// prefers-reduced-motion handled in CSS. Note: styles inject client-side via an
// insertion effect, so the entrance/skeleton animate only after hydration.
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
  { color: string; label: string; icon: typeof Info }
> = {
  info: { color: "var(--sk-text-tertiary,#94969c)", label: "Note", icon: Info },
  warn: { color: "var(--sk-warning,#e8b562)", label: "Warning", icon: AlertTriangle },
  danger: { color: "var(--sk-danger,#f97066)", label: "Danger", icon: ShieldAlert },
};

function Glyph({
  symbol,
  icon,
  color,
  size = 22,
}: {
  symbol: string;
  icon?: string;
  color?: string;
  size?: number;
}) {
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data-URI logos need no optimization
      <img
        src={icon}
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
      style={{ width: size, height: size, fontSize: size * 0.42, background: color ?? "#94969c" }}
    >
      {symbol.slice(0, 1)}
    </span>
  );
}

function AssetRow({ asset }: { asset: ReviewAsset }) {
  const out = asset.direction === "out";
  const usd = formatUsd(finite(asset.usd));
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Glyph symbol={asset.symbol} icon={asset.icon} color={asset.color} />
      <div className="min-w-0 flex-1 text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
        <span className="tabular-nums">
          {out ? "−" : "+"}
          {assetDisplay(asset)} {asset.symbol}
        </span>
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
  originVerified = false,
  assets = [],
  approvals = [],
  warnings = [],
  feeUsd,
  feeSol,
  simulatedBy,
  severity,
  requireAckOnBlock = true,
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
  const [openDetails, setOpenDetails] = useState<Set<number>>(new Set());
  const [ack, setAck] = useState(false);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const onRejectRef = useRef(onReject);

  useEffect(() => {
    onRejectRef.current = onReject;
  });

  // An explicit severity can only RAISE the level the warnings imply — never
  // hide a danger. Unlimited approvals floor it to at least "warn".
  const implied = highestLevel(warnings);
  const hasUnlimited = approvals.some(
    (a) => !a.amount || /unlimited/i.test(a.amount),
  );
  const floor: ReviewSeverity = hasUnlimited
    ? SEVERITY_ORDER[implied] >= 1
      ? implied
      : "warn"
    : implied;
  const verdict: ReviewSeverity =
    SEVERITY_ORDER[severity ?? "safe"] >= SEVERITY_ORDER[floor]
      ? (severity ?? "safe")
      : floor;
  const blocked = verdict === "block";
  const needsAck = blocked && requireAckOnBlock;

  // Land focus on the safe action for a blocking verdict.
  useEffect(() => {
    if (blocked && !simulating) rejectRef.current?.focus();
  }, [blocked, simulating]);

  const outAssets = assets.filter((a) => a.direction === "out");
  const inAssets = assets.filter((a) => a.direction === "in");
  const feeUsdText = formatUsd(finite(feeUsd));
  const feeSolText = formatSol(finite(feeSol));

  const outUsd = outAssets.reduce((s, a) => s + (finite(a.usd) ?? 0), 0);
  const inUsd = inAssets.reduce((s, a) => s + (finite(a.usd) ?? 0), 0);
  const netUsd = inUsd - outUsd;

  const borderColor = blocked
    ? "var(--sk-danger,#f97066)"
    : verdict === "warn" || simulationFailed
      ? "var(--sk-warning-border,#8a6c2f)"
      : "var(--sk-border,#22262f)";

  // Screen-reader announcement of the whole verdict, once settled.
  const announcement = simulating
    ? "Simulating transaction."
    : simulationFailed
      ? "Couldn’t preview this transaction. Proceed with caution."
      : [
          blocked ? "High risk transaction." : "",
          origin ? `Requested by ${origin}.` : "",
          outAssets.length
            ? `You pay ${outAssets.map((a) => `${assetDisplay(a)} ${a.symbol}`).join(", ")}.`
            : "",
          inAssets.length
            ? `You receive ${inAssets.map((a) => `${assetDisplay(a)} ${a.symbol}`).join(", ")}.`
            : "",
          hasUnlimited ? "Grants an unlimited token approval." : "",
        ]
          .filter(Boolean)
          .join(" ");

  const escToReject = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !signing) onRejectRef.current?.();
  };

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

  const toggleDetail = (i: number) =>
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div
      role="group"
      aria-label="Review transaction"
      onKeyDown={escToReject}
      className={className}
    >
      <div
        style={{ borderColor }}
        className="sol-txr-in flex flex-col gap-4 border bg-[var(--sk-surface,#161b26)] p-5 transition-colors duration-200 ease-out"
      >
        {/* Header — WHO is asking is the headline of an anti-phishing screen. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
              Review transaction
            </div>
            {origin && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-[15px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                  {origin}
                </span>
                {originVerified ? (
                  <span className="text-[11px] font-semibold text-[var(--sk-accent,#34d399)]">
                    Verified
                  </span>
                ) : (
                  <span className="border border-[var(--sk-border-strong,#373a41)] px-1.5 py-px text-[10px] font-semibold text-[var(--sk-text-tertiary,#94969c)]">
                    Unverified
                  </span>
                )}
              </div>
            )}
          </div>
          {blocked && (
            <span className="inline-flex shrink-0 items-center gap-1 border border-[var(--sk-danger,#f97066)] px-2 py-0.5 text-[11px] font-semibold text-[var(--sk-danger,#f97066)]">
              <ShieldAlert aria-hidden className="size-3" />
              High risk
            </span>
          )}
        </div>

        {/* Warnings — most severe first, with a text level label (not hue alone). */}
        {!simulating && warnings.length > 0 && (
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => {
              const s = WARNING_STYLE[w.level];
              const Icon = s.icon;
              const isOpen = openDetails.has(i);
              const detailId = `sol-txr-warn-${i}`;
              return (
                <div
                  key={`${w.title}-${i}`}
                  className="border-l-2 bg-[var(--sk-card,#13161b)] px-3 py-2"
                  style={{ borderColor: s.color }}
                >
                  <div className="flex items-start gap-2">
                    <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" style={{ color: s.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.04em]"
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold" style={{ color: s.color }}>
                        {w.title}
                      </div>
                      {w.detail && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleDetail(i)}
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            className="mt-0.5 cursor-pointer text-[12px] text-[var(--sk-text-tertiary,#94969c)] underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                          >
                            {isOpen ? "Hide details" : "Details"}
                          </button>
                          {isOpen && (
                            <p id={detailId} className="mt-1 text-[12px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
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

        {/* Approvals — spending permissions, NOT balance deltas. Unlimited is coral. */}
        {!simulating && approvals.length > 0 &&
          section(
            "Approvals",
            <div className="flex flex-col divide-y divide-[var(--sk-border,#22262f)]">
              {approvals.map((a, i) => {
                const unlimited = !a.amount || /unlimited/i.test(a.amount);
                return (
                  <div key={`${a.symbol}-${i}`} className="flex items-center gap-3 py-1.5">
                    <span
                      aria-hidden
                      className="flex size-[22px] shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: unlimited
                          ? "var(--sk-danger-bg,rgba(240,68,56,0.12))"
                          : "var(--sk-raised,#1f242f)",
                        color: unlimited
                          ? "var(--sk-danger,#f97066)"
                          : "var(--sk-text-tertiary,#94969c)",
                      }}
                    >
                      <KeyRound className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1 text-[14px] font-semibold">
                      <span
                        style={{
                          color: unlimited
                            ? "var(--sk-danger,#f97066)"
                            : "var(--sk-text,#f7f7f7)",
                        }}
                      >
                        {unlimited
                          ? `Approve unlimited ${a.symbol}`
                          : `Approve up to ${groupAmount(a.amount!)} ${a.symbol}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>,
          )}

        {/* Net balance changes. */}
        <div className="flex flex-col gap-3">
          {simulating ? (
            <div className="flex flex-col gap-3">
              {section("Estimated changes", null)}
              {[0, 1].map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="sol-txr-skeleton block size-[22px] shrink-0 rounded-full bg-[var(--sk-skeleton,#22262f)]" aria-hidden />
                  {skeleton(k === 0 ? "w-40" : "w-32")}
                </div>
              ))}
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
          ) : assets.length === 0 && approvals.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
              No token balance changes detected. This transaction can still
              change on-chain permissions or account authorities — only
              continue if you trust the source.
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
              {/* Net summary — so users don't diff two columns by eye. */}
              {outUsd > 0 && inUsd > 0 && (
                <div className="text-right text-[12px] tabular-nums text-[var(--sk-text-tertiary,#94969c)]">
                  Net{" "}
                  <span className="font-semibold text-[var(--sk-text-secondary,#cecfd2)]">
                    {netUsd >= 0 ? "+" : "−"}
                    {formatUsd(Math.abs(netUsd))?.replace("$", "$") ?? "$0.00"}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fee — same round-up / no-exponential contract as FeeExplainer. */}
        <div className="flex items-center justify-between border-t border-[var(--sk-border,#22262f)] pt-3 text-[13px]">
          <span className="text-[var(--sk-text-tertiary,#94969c)]">Network fee</span>
          {simulating ? (
            skeleton("w-16")
          ) : feeUsdText || feeSolText ? (
            <span className="tabular-nums text-[var(--sk-text-secondary,#cecfd2)]">
              {feeUsdText ? `≈ ${feeUsdText}` : feeSolText}
              {feeUsdText && feeSolText && (
                <span className="ml-1.5 text-[var(--sk-text-quaternary,#61656c)]">{feeSolText}</span>
              )}
            </span>
          ) : (
            <span className="text-[var(--sk-text-tertiary,#94969c)]">typically under $0.01</span>
          )}
        </div>

        {simulatedBy && !simulating && (
          <div className="-mt-2 text-[11px] text-[var(--sk-text-quaternary,#61656c)]">
            Simulated by {simulatedBy}
          </div>
        )}

        {/* Block acknowledgement gate. */}
        {needsAck && (
          <label className="flex cursor-pointer items-start gap-2 border border-[var(--sk-danger,#f97066)]/40 bg-[var(--sk-danger-bg,rgba(240,68,56,0.12))] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--sk-text-secondary,#cecfd2)]">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-[var(--sk-danger,#f97066)]"
            />
            <span>
              I understand this transaction is high-risk and I want to sign it
              anyway.
            </span>
          </label>
        )}

        {/* Actions. On block, Reject is primary and Sign is the deliberate,
            gated, cautionary choice — safe by default. */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            ref={rejectRef}
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
            disabled={signing || (needsAck && !ack)}
            aria-busy={signing || undefined}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
              blocked
                ? "border border-[var(--sk-danger,#f97066)] bg-transparent text-[var(--sk-danger,#f97066)] hover:bg-[var(--sk-danger-bg,rgba(240,68,56,0.12))]"
                : "bg-[var(--sk-btn,#00543f)] text-[var(--sk-btn-text,#18e3a5)] hover:bg-[var(--sk-btn-hover,#006a53)]"
            }`}
          >
            {signing && (
              <span aria-hidden className="sol-txr-spin size-3.5 rounded-full border-2 border-current border-t-transparent" />
            )}
            {signing ? "Signing…" : blocked ? "Sign anyway" : signLabel}
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
