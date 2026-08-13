"use client";

/**
 * AddressDisplay - Signet
 *
 * Shows a Solana address the way a dApp should: middle-truncated, with a
 * deterministic monogram chip, one-tap copy of the FULL address (never the
 * shortened form, with a clipboard fallback and a visible failure state),
 * an optional known name, and a "this is a program / token account, not a
 * wallet" affordance so users don't send funds into a program by mistake.
 *
 * Two safety stances, both deliberate:
 *   1. `kind` defaults to "unknown", not "wallet". An unclassified address is
 *      shown as Unverified - you must explicitly declare it a wallet before it
 *      loses its badge. Trust is opt-in.
 *   2. The chip and short form are visual anchors, NOT identity checks. Two
 *      addresses can share a prefix/suffix (address-poisoning attacks grind
 *      exactly that), so the default truncation is 6+6 and the real
 *      verification path is Copy → paste the full string.
 *
 * Honesty note: `kind` is whatever you pass. The badge does not mean the
 * component checked the chain - resolve it with getAccountInfo → executable
 * and pass the result in.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file.
 *
 * <AddressDisplay address={pubkey} kind="program" onCopy={() => {}} />
 */

import {
  useEffect,
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
  /** Known label - a .sol domain, a program name ("Jupiter"), etc. */
  name?: string;
  /**
   * What kind of account this is. Defaults to "unknown" (shown Unverified);
   * declare "wallet" explicitly to drop the badge. Programs and token mints
   * get a cautionary badge. Caller-supplied - not verified by the component.
   */
  kind?: AddressKind;
  /** Characters shown on each side of the ellipsis (default 6). Low values
   *  let distinct addresses render identically - don't go below 4. */
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
  /** Called if the copy failed (blocked clipboard, insecure context). */
  onCopyError?: () => void;
  /** Identity still resolving - shows a skeleton. */
  loading?: boolean;
  /** "inline" is a compact chip; "card" is a padded row with the name/kind. */
  variant?: "inline" | "card";
  className?: string;
}

/* ------------------------------------------------------------------ */

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Trim, then confirm it's plausibly a base58 pubkey (not an EVM 0x…, empty,
 *  or whitespace-laden paste). Rendering a broken explorer link or a shield
 *  on garbage is worse than admitting the input is malformed. */
function normalizeAddress(raw: string): { address: string; valid: boolean } {
  const address = (raw ?? "").trim();
  return { address, valid: BASE58_RE.test(address) };
}

/** Deterministic 32-bit hash (FNV-1a). Total - never throws on any string. */
function hashAddress(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Middle-truncate. Short strings pass through untouched; real ellipsis. */
function truncate(address: string, chars: number): string {
  const n = Math.max(4, Math.floor(chars) || 4);
  if (address.length <= n * 2 + 1) return address;
  return `${address.slice(0, n)}…${address.slice(-n)}`;
}

function monogram(name: string | undefined, address: string): string {
  const src = name?.trim() || address;
  return src.slice(0, 2).toUpperCase();
}

function defaultExplorerUrl(address: string, cluster: SolanaCluster): string {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://solscan.io/account/${encodeURIComponent(address)}${suffix}`;
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
  // Both program and mint are cautionary - sending funds to either is a
  // footgun - so both are amber; only the label distinguishes them.
  program: { label: "Program", warn: true },
  token: { label: "Token mint", warn: true },
  unknown: { label: "Unverified", warn: false },
};

/** Copies text with a fallback for insecure contexts / denied permission. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the execCommand path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Kept tiny and on-screen rather than opacity:0 - iOS can suppress
    // selection on fully transparent nodes. 16px font avoids focus-zoom.
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.fontSize = "16px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    // iOS Safari/WKWebView won't select a readonly textarea via .select();
    // make it briefly editable, select its contents as a Range, then set the
    // selection range explicitly. Desktop/Android take the plain .select() path.
    if (/ip(ad|hone|od)/i.test(navigator.userAgent)) {
      ta.contentEditable = "true";
      ta.readOnly = false;
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      ta.setSelectionRange(0, text.length);
    } else {
      ta.select();
    }
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
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

const STYLE_ID = "sol-addr-styles";
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
 * Monogram chip - a flat solid-color glyph with a letterform, matching the
 * kit's WalletGlyph / TokenGlyph idiom. It's a visual anchor, not an identity
 * checksum: derive one hue from the hash and keep it flat (no gradient).
 */
function Glyph({
  name,
  address,
  kind,
  size,
}: {
  name?: string;
  address: string;
  kind: AddressKind;
  size: number;
}) {
  // Programs and mints are not people - show the caution glyph, not a chip.
  if (kind === "program" || kind === "token") {
    return (
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--sk-warning-bg,rgba(232,181,98,0.14))] text-[var(--sk-warning,#e8b562)]"
        style={{ width: size, height: size }}
      >
        <ShieldAlert style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }
  const hue = hashAddress(address) % 360;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-[var(--sk-bg,#0c0e12)]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hue} 52% 56%)`,
      }}
    >
      {monogram(name, address)}
    </span>
  );
}

export function AddressDisplay({
  address: rawAddress,
  name,
  kind = "unknown",
  chars = 6,
  cluster = "mainnet-beta",
  explorerUrl: explorerUrlProp,
  showExplorer = false,
  showAvatar = true,
  showCopy = true,
  onCopy,
  onCopyError,
  loading = false,
  variant = "inline",
  className,
}: AddressDisplayProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [prevAddress, setPrevAddress] = useState(rawAddress);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCopyRef = useRef(onCopy);
  const onCopyErrorRef = useRef(onCopyError);

  useKitStyles(STYLE_ID, KEYFRAMES);

  // A copy confirmation must never outlive the value it referred to
  // (render-phase reset - https://react.dev/learn/you-might-not-need-an-effect).
  if (rawAddress !== prevAddress) {
    setPrevAddress(rawAddress);
    if (status !== "idle") setStatus("idle");
  }

  useEffect(() => {
    onCopyRef.current = onCopy;
    onCopyErrorRef.current = onCopyError;
  });

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const { address, valid } = normalizeAddress(rawAddress);
  const isCard = variant === "card";
  const short = truncate(address, chars);
  const badge = kind !== "wallet" ? KIND_BADGE[kind] : null;

  const copy = async () => {
    const ok = await copyText(address);
    if (ok) {
      setStatus("copied");
      onCopyRef.current?.(address);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("error");
      onCopyErrorRef.current?.();
    }
  };

  const avatarSize = isCard ? 32 : 18;

  const copyButton = showCopy && valid && (
    <button
      type="button"
      onClick={copy}
      aria-label={
        status === "copied"
          ? "Address copied"
          : status === "error"
            ? "Copy failed - select the address manually"
            : "Copy full address"
      }
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:text-[var(--sk-text,#f7f7f7)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97]"
    >
      {status === "copied" ? (
        <Check
          aria-hidden
          className="sol-addr-pop size-3.5 text-[var(--sk-accent,#34d399)]"
        />
      ) : status === "error" ? (
        <ShieldAlert aria-hidden className="size-3.5 text-[var(--sk-warning,#e8b562)]" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </button>
  );

  const kindBadge = badge && (
    <span
      title={
        badge.warn
          ? "Caller-asserted account type - not verified on-chain"
          : undefined
      }
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px] font-semibold ${
        badge.warn
          ? "border-[var(--sk-warning,#e8b562)] text-[var(--sk-warning,#e8b562)]"
          : "border-[var(--sk-border-strong,#373a41)] text-[var(--sk-text-tertiary,#94969c)]"
      }`}
    >
      {badge.warn && <ShieldAlert aria-hidden className="size-3" />}
      {badge.label}
    </span>
  );

  // Screen readers get name, kind, and the full address as one token - then
  // Copy is the exact-verification path. (Reading 44 chars one-by-one can't
  // convey base58 case anyway, so it isn't offered as a false guarantee.)
  const srLabel = valid
    ? `${name ? `${name}, ` : ""}${
        kind !== "wallet" ? `${badge?.label} account, ` : ""
      }address ${address}`
    : `Invalid address: ${address || "(empty)"}`;

  const liveRegion = (
    <span role="status" aria-live="polite" className="sr-only">
      {status === "copied"
        ? "Address copied to clipboard"
        : status === "error"
          ? "Couldn’t copy. Select the address manually."
          : ""}
    </span>
  );

  // When copy fails (insecure context, denied permission, old webview) the
  // guidance is "select the address manually" - so give touch users the full
  // base58 as actually-selectable text, since only the truncated form shows.
  const copyFallback = status === "error" && valid && (
    <span
      className="w-full basis-full break-all font-mono text-[11px] leading-snug text-[var(--sk-text-secondary,#cecfd2)]"
      style={{ userSelect: "all", WebkitUserSelect: "all" }}
    >
      {address}
    </span>
  );

  const invalidChip = (
    <span
      className="inline-flex items-center gap-1.5 border border-[var(--sk-warning,#e8b562)] px-2 py-1 text-[13px] text-[var(--sk-warning,#e8b562)]"
      role="img"
      aria-label={srLabel}
    >
      <ShieldAlert aria-hidden className="size-3.5" />
      <span aria-hidden>Invalid address</span>
    </span>
  );

  /* ---- inline chip ---- */
  if (!isCard) {
    if (loading) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
          role="status"
          aria-busy="true"
          aria-label="Loading address"
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
    if (!valid) {
      return (
        <span className={`inline-flex align-middle ${className ?? ""}`}>
          {invalidChip}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex flex-wrap items-center gap-1.5 align-middle ${className ?? ""}`}
      >
        {showAvatar && (
          <Glyph name={name} address={address} kind={kind} size={avatarSize} />
        )}
        <span className="sr-only">{srLabel}</span>
        <span
          aria-hidden
          title={address}
          className="font-mono text-[13px] text-[var(--sk-text,#f7f7f7)]"
        >
          {/* Name is verifiable at a glance - the short address rides along so
              a spoofed .sol can't hide behind a name with no address shown. */}
          {name ? (
            <>
              <span className="font-sans font-semibold">{name}</span>
              <span className="mx-1 text-[var(--sk-text-quaternary,#61656c)]">
                ·
              </span>
              {short}
            </>
          ) : (
            short
          )}
        </span>
        {kindBadge}
        {copyButton}
        {copyFallback}
        {liveRegion}
      </span>
    );
  }

  /* ---- card row ---- */
  const explorerHref = valid
    ? (() => {
        try {
          return explorerUrlProp
            ? explorerUrlProp(address)
            : defaultExplorerUrl(address, cluster);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div
      className={`flex items-center gap-3 border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] p-3 ${className ?? ""}`}
      role={loading ? "status" : undefined}
      aria-busy={loading || undefined}
      aria-label={loading ? "Loading address" : undefined}
    >
      {showAvatar &&
        (loading ? (
          <span
            className="sol-addr-skeleton block size-8 shrink-0 rounded-full bg-[var(--sk-skeleton,#22262f)]"
            aria-hidden
          />
        ) : valid ? (
          <Glyph name={name} address={address} kind={kind} size={avatarSize} />
        ) : (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--sk-warning-bg,rgba(232,181,98,0.14))] text-[var(--sk-warning,#e8b562)]"
          >
            <ShieldAlert className="size-4" />
          </span>
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
        ) : !valid ? (
          <>
            <span className="sr-only">{srLabel}</span>
            <div aria-hidden className="text-[14px] font-semibold text-[var(--sk-warning,#e8b562)]">
              Invalid address
            </div>
            <div
              aria-hidden
              className="mt-0.5 truncate font-mono text-[12px] text-[var(--sk-text-tertiary,#94969c)]"
            >
              {address || "(empty)"}
            </div>
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
            {copyFallback && <div className="mt-1">{copyFallback}</div>}
          </>
        )}
      </div>

      {!loading && valid && (
        <div className="flex shrink-0 items-center gap-1">
          {copyButton}
          {showExplorer && explorerHref && (
            <a
              href={explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View on ${explorerLabel(explorerHref)}`}
              className="flex size-6 items-center justify-center text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:text-[var(--sk-text,#f7f7f7)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
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
