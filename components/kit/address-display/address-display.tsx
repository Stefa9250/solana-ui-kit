"use client";

/**
 * AddressDisplay — Solana UI Kit
 *
 * Shows a Solana address the way a dApp should: middle-truncated, with a
 * deterministic avatar, one-tap copy of the FULL address (never the shortened
 * form), an optional known name, and — importantly — a "this is a program /
 * token account, not a wallet" affordance so users don't send funds into a
 * program by mistake.
 *
 * Honesty note: `kind` is whatever you pass. This component displays that
 * label; it does not fetch the account or verify it's executable. Resolve the
 * kind server-side (getAccountInfo → executable) and pass the result in.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file. Tokens used here:
 *   --sk-bg --sk-surface --sk-card --sk-skeleton
 *   --sk-border --sk-border-strong --sk-accent
 *   --sk-text --sk-text-secondary --sk-text-tertiary --sk-text-quaternary
 *   --sk-warning
 *
 * <AddressDisplay address={pubkey} kind="program" onCopy={() => {}} />
 */

import {
  useEffect,
  useId,
  useInsertionEffect,
  useRef,
  useState,
} from "react";
import { Check, Copy, ExternalLink, ShieldAlert } from "lucide-react";

export type AddressKind = "wallet" | "program" | "token" | "unknown";
export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

export interface AddressDisplayProps {
  /** Full base58 address. Truncated for display; copied in full. */
  address: string;
  /** Known label — a .sol domain, a program name ("Jupiter"), etc. */
  name?: string;
  /**
   * What kind of account this is. Programs and token mints get a badge so a
   * user doesn't mistake them for a personal wallet. Caller-supplied — the
   * component does not verify it.
   */
  kind?: AddressKind;
  /** Characters shown on each side of the ellipsis (default 4). */
  chars?: number;
  /** Explorer links point at this cluster (default mainnet-beta). */
  cluster?: SolanaCluster;
  /** Override the explorer, e.g. (a) => `https://solana.fm/address/${a}`. */
  explorerUrl?: (address: string) => string;
  /** Show the explorer link (card variant only). */
  showExplorer?: boolean;
  /** Hide the avatar. */
  showAvatar?: boolean;
  /** Hide the copy button. */
  showCopy?: boolean;
  /** Called after a successful copy, with the full address. */
  onCopy?: (address: string) => void;
  /** Identity still resolving — shows a skeleton. */
  loading?: boolean;
  /** "inline" is a compact chip; "card" is a padded row with the name/kind. */
  variant?: "inline" | "card";
  className?: string;
}

/* ------------------------------------------------------------------ */

/** Deterministic 32-bit hash (FNV-1a). Total — never throws on any string. */
function hashAddress(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Middle-truncate. Short strings pass through untouched rather than growing
 * ("ab…cd" is longer than "abcd"), and the divider is a real ellipsis.
 */
function truncate(address: string, chars: number): string {
  const n = Math.max(1, chars);
  if (address.length <= n * 2 + 1) return address;
  return `${address.slice(0, n)}…${address.slice(-n)}`;
}

function defaultExplorerUrl(address: string, cluster: SolanaCluster): string {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://solscan.io/account/${address}${suffix}`;
}

function explorerLabel(href: string): string {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    if (host === "solscan.io") return "Solscan";
    if (host === "explorer.solana.com") return "Solana Explorer";
    if (host === "solana.fm") return "SolanaFM";
    return host;
  } catch {
    return "explorer";
  }
}

const KIND_BADGE: Record<
  Exclude<AddressKind, "wallet">,
  { label: string; warn: boolean }
> = {
  program: { label: "Program", warn: true },
  token: { label: "Token", warn: false },
  unknown: { label: "Unverified", warn: false },
};

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

const STYLE_ID = "sol-addr-styles";
// Reduced motion handled in CSS — no matchMedia hook, no per-render cost.
const KEYFRAMES = `
@keyframes sol-addr-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes sol-addr-shimmer { from { transform: translateX(-100%); } to { transform: translateX(220%); } }
.sol-addr-pop { animation: sol-addr-pop 200ms cubic-bezier(0.34,1.56,0.64,1) both; }
.sol-addr-skeleton { position: relative; overflow: hidden; }
.sol-addr-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: sol-addr-shimmer 1.6s cubic-bezier(0.4,0,0.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .sol-addr-pop { animation: none !important; }
  .sol-addr-skeleton::after { animation: none !important; display: none; }
}
`;

/**
 * Deterministic account avatar. A two-hue gradient blob is the Solana
 * ecosystem convention (Phantom, Solflare, Backpack all use one), and the
 * "no gradients" house rule is about decorative background gradients — an
 * identicon is functional identity, not chrome.
 */
function Avatar({ address, size }: { address: string; size: number }) {
  const h = hashAddress(address);
  const hueA = h % 360;
  const hueB = (hueA + 90 + ((h >> 16) % 120)) % 360;
  const angle = (h >> 8) % 360;
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, hsl(${hueA} 68% 56%), hsl(${hueB} 70% 48%))`,
      }}
    />
  );
}

export function AddressDisplay({
  address,
  name,
  kind = "wallet",
  chars = 4,
  cluster = "mainnet-beta",
  explorerUrl: explorerUrlProp,
  showExplorer = false,
  showAvatar = true,
  showCopy = true,
  onCopy,
  loading = false,
  variant = "inline",
  className,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCopyRef = useRef(onCopy);
  const liveId = useId();

  useKitStyles(STYLE_ID, KEYFRAMES);

  useEffect(() => {
    onCopyRef.current = onCopy;
  }, [onCopy]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const isCard = variant === "card";
  const short = truncate(address, chars);
  const badge = kind !== "wallet" ? KIND_BADGE[kind] : null;
  const explorerHref = explorerUrlProp
    ? explorerUrlProp(address)
    : defaultExplorerUrl(address, cluster);

  const copy = async () => {
    // Always the full address — copying the truncated form is a classic bug.
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      return; // clipboard blocked (insecure context / permissions) — no-op
    }
    setCopied(true);
    onCopyRef.current?.(address);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  const avatarSize = isCard ? 32 : 18;

  const copyButton = showCopy && (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Address copied" : "Copy address"}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[var(--sk-text-quaternary,#61656c)] transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.9]"
    >
      {copied ? (
        <Check
          aria-hidden
          className="sol-addr-pop size-3.5 text-[var(--sk-accent,#34d399)]"
        />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </button>
  );

  const kindBadge = badge && (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-px text-[10px] font-semibold ${
        badge.warn
          ? "border-[var(--sk-warning,#e8b562)] text-[var(--sk-warning,#e8b562)]"
          : "border-[var(--sk-border-strong,#373a41)] text-[var(--sk-text-tertiary,#94969c)]"
      }`}
    >
      {badge.warn && <ShieldAlert aria-hidden className="size-2.5" />}
      {badge.label}
    </span>
  );

  // A screen reader gets the full address (and name/kind), never "GK7z…4jNq".
  const srLabel = `${name ? `${name}, ` : ""}${
    kind !== "wallet" ? `${badge?.label} account, ` : ""
  }address ${address.split("").join(" ")}`;

  const liveRegion = (
    <span id={liveId} role="status" aria-live="polite" className="sr-only">
      {copied ? "Address copied to clipboard" : ""}
    </span>
  );

  /* ---- inline chip ---- */
  if (!isCard) {
    if (loading) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
          aria-busy="true"
        >
          {showAvatar && (
            <span
              className="sol-addr-skeleton block size-[18px] shrink-0 rounded-full bg-[var(--sk-skeleton,#22262f)]"
              aria-hidden
            />
          )}
          <span
            className="sol-addr-skeleton block h-3 w-20 bg-[var(--sk-skeleton,#22262f)]"
            aria-hidden
          />
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 align-middle ${className ?? ""}`}
      >
        {showAvatar && <Avatar address={address} size={avatarSize} />}
        <span className="sr-only">{srLabel}</span>
        <span
          aria-hidden
          title={address}
          className="font-mono text-[13px] text-[var(--sk-text,#f7f7f7)]"
        >
          {name ?? short}
        </span>
        {kindBadge}
        {copyButton}
        {liveRegion}
      </span>
    );
  }

  /* ---- card row ---- */
  return (
    <div
      className={`flex items-center gap-3 border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] p-3 ${className ?? ""}`}
    >
      {showAvatar &&
        (loading ? (
          <span
            className="sol-addr-skeleton block size-8 shrink-0 rounded-full bg-[var(--sk-skeleton,#22262f)]"
            aria-hidden
          />
        ) : (
          <Avatar address={address} size={avatarSize} />
        ))}

      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <span
              className="sol-addr-skeleton mb-1.5 block h-3.5 w-28 bg-[var(--sk-skeleton,#22262f)]"
              aria-hidden
            />
            <span
              className="sol-addr-skeleton block h-3 w-40 bg-[var(--sk-skeleton,#22262f)]"
              aria-hidden
            />
          </>
        ) : (
          <>
            <span className="sr-only">{srLabel}</span>
            <div aria-hidden className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                {name ?? short}
              </span>
              {kindBadge}
            </div>
            {name && (
              <div
                aria-hidden
                title={address}
                className="mt-0.5 font-mono text-[12px] text-[var(--sk-text-tertiary,#94969c)]"
              >
                {short}
              </div>
            )}
          </>
        )}
      </div>

      {!loading && (
        <div className="flex shrink-0 items-center gap-1">
          {copyButton}
          {showExplorer && (
            <a
              href={explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View on ${explorerLabel(explorerHref)}`}
              className="flex size-6 items-center justify-center text-[var(--sk-text-quaternary,#61656c)] transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
            >
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      )}
      {liveRegion}
    </div>
  );
}
