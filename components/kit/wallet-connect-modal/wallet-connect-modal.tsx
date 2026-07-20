"use client";

/**
 * WalletConnectModal — Solana UI Kit
 *
 * Wallet selection, connecting, rejected, and connected states in one
 * accessible modal. Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Renders into document.body via a portal and locks body scroll while open.
 *
 * Theming: every color is a CSS variable with the kit's dark-emerald default
 * inlined as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any
 * ancestor to retheme without touching this file.
 *
 * <WalletConnectModal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   wallets={wallets}
 *   onSelectWallet={(w) => connect(w)}
 *   status={status}
 *   error={error}
 *   termsUrl="/terms"
 *   privacyUrl="/privacy"
 * />
 */

import {
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Wallet, X } from "lucide-react";

export interface WalletOption {
  id: string;
  name: string;
  /** Detected wallets connect on click; undetected ones link to installUrl. */
  detected: boolean;
  installUrl: string;
  /** Logo URL or data URI (wallet.adapter.icon). Falls back to initials. */
  icon?: string;
  /** Brand color behind the wallet-initials fallback. */
  color?: string;
  /**
   * Recommended wallets show in the main list; the rest sit behind a
   * "More wallets" row. Omit on every wallet to show a single flat list.
   */
  recommended?: boolean;
}

export type WalletConnectStatus =
  | "list"
  | "connecting"
  | "rejected"
  | "connected";

export interface WalletConnectErrorRule {
  test: RegExp;
  text: string;
}

export interface WalletConnectModalProps {
  open: boolean;
  /** Escape, backdrop click, close button, and connected auto-dismiss. */
  onClose: () => void;
  wallets: WalletOption[];
  /** Called when a detected wallet is picked (also powers Try again). */
  onSelectWallet?: (wallet: WalletOption) => void;
  status?: WalletConnectStatus;
  /** Raw connection error shown (mapped) in the rejected state. */
  error?: string;
  /** Your own connect-error rules, matched before the built-in defaults. */
  errorMap?: WalletConnectErrorRule[];
  /** Which wallet is connecting/rejected/connected, when driven externally. */
  selectedWalletId?: string;
  /** Connected address (full base58 is fine — truncated for display). */
  address?: string;
  /** Badge this wallet "Connected" in the list (e.g. when switching wallets). */
  connectedWalletId?: string;
  /** Terms of service link in the header. Omit both to hide the line. */
  termsUrl?: string;
  /** Privacy policy link in the header. */
  privacyUrl?: string;
}

/** Includes the error names @solana/wallet-adapter actually throws. */
const DEFAULT_CONNECT_ERROR_MAP: WalletConnectErrorRule[] = [
  {
    test: /walletnotready|not ready/i,
    text: "Wallet isn’t ready. Make sure the extension is enabled.",
  },
  {
    test: /not responding|unresponsive/i,
    text: "Wallet isn’t responding. Make sure the extension is unlocked.",
  },
  {
    test: /timeout|timed out/i,
    text: "This is taking longer than usual. Check your wallet extension.",
  },
  {
    test: /walletsigninerror|sign.?in failed/i,
    text: "Sign-in failed. Try again.",
  },
  {
    test: /user rejected|declined|cancelled|walletconnectionerror.*rejected/i,
    text: "You declined the connection request.",
  },
];

function friendlyConnectError(
  raw: string | undefined,
  errorMap?: WalletConnectErrorRule[],
): { text: string; raw: string } {
  if (!raw) return { text: "Something went wrong connecting. Try again.", raw: "" };
  const rules = errorMap
    ? [...errorMap, ...DEFAULT_CONNECT_ERROR_MAP]
    : DEFAULT_CONNECT_ERROR_MAP;
  const match = rules.find((rule) => rule.test.test(raw));
  return {
    text: match ? match.text : "Something went wrong connecting. Try again.",
    raw,
  };
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

/** Full base58 in, short display out. Pre-truncated strings pass through. */
function shortAddress(address?: string): string {
  if (!address) return "";
  return address.length > 12
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : address;
}

/** Wallet logo when provided (wallet.adapter.icon), initials otherwise. */
function WalletGlyph({
  wallet,
  sizeClass,
  textClass,
  className = "",
}: {
  wallet?: WalletOption;
  sizeClass: string;
  textClass: string;
  className?: string;
}) {
  if (wallet?.icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data-URI logos need no optimization
      <img
        src={wallet.icon}
        alt=""
        aria-hidden
        className={`${sizeClass} shrink-0 object-contain ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex ${sizeClass} shrink-0 items-center justify-center font-bold text-[var(--sk-bg,#0c0e12)] ${textClass} ${className}`}
      style={{ background: wallet?.color ?? "#94969c" }}
    >
      {wallet ? initials(wallet.name) : "?"}
    </span>
  );
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

/** SSR-safe "am I on the client" — portals can't render on the server. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Inject the kit stylesheet once per document, no matter how many instances mount. */
function useKitStyles(id: string, css: string) {
  useInsertionEffect(() => {
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

const FOCUSABLE =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const STYLE_ID = "sol-wcm-styles";
const KEYFRAMES = `
@keyframes sol-wcm-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sol-wcm-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes sol-wcm-modal-in { from { opacity: 0; transform: scale(0.96) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes sol-wcm-modal-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.97) translateY(2px); } }
@keyframes sol-wcm-item-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-wcm-breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
@keyframes sol-wcm-check-circle { from { stroke-dashoffset: 132; } to { stroke-dashoffset: 0; } }
@keyframes sol-wcm-check-mark { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
.sol-wcm-backdrop-enter { animation: sol-wcm-backdrop-in 200ms ease-out both; }
.sol-wcm-backdrop-exit { animation: sol-wcm-backdrop-out 150ms ease-in both; }
.sol-wcm-modal-enter { animation: sol-wcm-modal-in 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-wcm-modal-exit { animation: sol-wcm-modal-out 150ms ease-in both; }
.sol-wcm-item-enter { animation: sol-wcm-item-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-wcm-breathe { animation: sol-wcm-breathe 1.8s ease-in-out infinite; }
.sol-wcm-check-circle-path { stroke-dasharray: 132; animation: sol-wcm-check-circle 420ms cubic-bezier(0.65,0,0.35,1) forwards; }
.sol-wcm-check-mark-path { stroke-dasharray: 24; animation: sol-wcm-check-mark 240ms cubic-bezier(0.65,0,0.35,1) 360ms forwards; }
.sol-wcm-wallet-row { box-shadow: inset 2px 0 0 transparent; transition: background 150ms ease, box-shadow 150ms ease, opacity 200ms ease; }
.sol-wcm-wallet-row:hover:not([data-disabled="true"]) { background: var(--sk-raised, #1f242f); box-shadow: inset 2px 0 0 var(--sk-accent, #34d399); }
.sol-wcm-wallet-row .sol-wcm-install { opacity: 0; transition: opacity 150ms ease; }
.sol-wcm-wallet-row:hover .sol-wcm-install { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .sol-wcm-backdrop-enter, .sol-wcm-backdrop-exit, .sol-wcm-modal-enter, .sol-wcm-modal-exit,
  .sol-wcm-item-enter, .sol-wcm-breathe, .sol-wcm-check-circle-path, .sol-wcm-check-mark-path, .sol-wcm-wallet-row {
    animation: none !important; transition: none !important;
  }
  .sol-wcm-check-circle-path, .sol-wcm-check-mark-path { stroke-dashoffset: 0; }
  .sol-wcm-wallet-row .sol-wcm-install { opacity: 1; }
}
`;

export function WalletConnectModal({
  open,
  onClose,
  wallets,
  onSelectWallet,
  status = "list",
  error,
  errorMap,
  selectedWalletId,
  address,
  connectedWalletId,
  termsUrl,
  privacyUrl,
}: WalletConnectModalProps) {
  const [present, setPresent] = useState(open);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const reduceMotion = useReducedMotion();
  const mounted = useMounted();

  useKitStyles(STYLE_ID, KEYFRAMES);

  // Render-phase adjustments (https://react.dev/learn/you-might-not-need-an-effect):
  // mount the layer when open flips true, and reset per-attempt state.
  if (open && !present) {
    setPresent(true);
    setInternalSelectedId(null);
    setShowHint(false);
    setDetailsOpen(false);
    setShowAll(false);
    setHelpOpen(false);
  }
  if (prevStatus !== status) {
    setPrevStatus(status);
    setShowHint(false);
    setDetailsOpen(false);
  }

  const exiting = present && !open;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Let the exit animation play, then unmount.
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setPresent(false), reduceMotion ? 0 : 160);
    return () => clearTimeout(t);
  }, [exiting, reduceMotion]);

  // Lock body scroll while the modal is present.
  useEffect(() => {
    if (!present) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [present]);

  // Focus the first wallet row on open; return focus to the trigger on close.
  useEffect(() => {
    if (!present) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const root = modalRef.current;
    const target =
      root?.querySelector<HTMLElement>("[data-wcm-row]") ??
      root?.querySelector<HTMLElement>(FOCUSABLE) ??
      root;
    target?.focus();
    return () => prevFocusRef.current?.focus();
  }, [present]);

  // "Check your wallet" hint after 3s of connecting.
  useEffect(() => {
    if (status !== "connecting") return;
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, [status]);

  // Connected: brief success, then auto-dismiss.
  useEffect(() => {
    if (status !== "connected") return;
    const t = setTimeout(() => onCloseRef.current(), 2000);
    return () => clearTimeout(t);
  }, [status]);

  if (!present || !mounted) return null;

  const effectiveSelectedId = selectedWalletId ?? internalSelectedId;
  const selectedWallet = wallets.find((w) => w.id === effectiveSelectedId);
  const anyRecommended = wallets.some((w) => w.recommended);
  const byPriority = (a: WalletOption, b: WalletOption) => {
    const rank = (w: WalletOption) =>
      w.id === connectedWalletId ? 0 : w.detected ? 1 : 2;
    return rank(a) - rank(b);
  };
  const mainWallets = (anyRecommended ? wallets.filter((w) => w.recommended) : wallets)
    .slice()
    .sort(byPriority);
  const extraWallets = anyRecommended
    ? wallets.filter((w) => !w.recommended).slice().sort(byPriority)
    : [];
  const visibleWallets = showAll ? [...mainWallets, ...extraWallets] : mainWallets;
  const noneDetected = wallets.every((w) => !w.detected);
  const helpView = noneDetected || helpOpen;
  const friendly = error
    ? friendlyConnectError(error, errorMap)
    : {
        text: `You declined the connection in ${selectedWallet?.name ?? "your wallet"}.`,
        raw: "",
      };
  const displayAddress = shortAddress(address);

  const liveText =
    status === "connecting"
      ? `Connecting to ${selectedWallet?.name ?? "wallet"}${showHint ? ". Check your wallet." : ""}`
      : status === "rejected"
        ? friendly.text
        : status === "connected"
          ? `Wallet connected${displayAddress ? `: ${displayAddress}` : ""}`
          : helpView
            ? "Get a wallet to continue."
            : "Choose a wallet to connect.";

  const selectWallet = (wallet: WalletOption) => {
    setInternalSelectedId(wallet.id);
    onSelectWallet?.(wallet);
  };

  const trapFocus = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = Array.from(
      modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const renderRow = (wallet: WalletOption, index: number) => {
    const isConnecting = status === "connecting";
    const isSelected = isConnecting && wallet.id === effectiveSelectedId;
    const isDimmed = isConnecting && !isSelected;
    const isConnected = wallet.id === connectedWalletId;
    const rowClasses = `sol-wcm-item-enter sol-wcm-wallet-row flex w-full items-center gap-3.5 border px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 ${
      isSelected
        ? "border-[var(--sk-accent,#34d399)]/50 bg-[var(--sk-accent,#34d399)]/[0.08]"
        : "border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)]"
    } ${isDimmed ? "opacity-40" : "cursor-pointer"}`;
    const rowStyle = { animationDelay: `${index * 40}ms` };
    const icon = (
      <WalletGlyph
        wallet={wallet}
        sizeClass="size-9"
        textClass="text-[13px]"
        className={isSelected ? "sol-wcm-breathe" : ""}
      />
    );
    const name = (
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
          {wallet.name}
        </div>
        {isSelected && showHint && (
          <div className="mt-0.5 text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
            Check your wallet{"…"}
          </div>
        )}
      </div>
    );
    const badge = isConnecting ? null : isConnected ? (
      <span className="border border-[var(--sk-success,#17b26a)] px-2.5 py-[3px] text-[11px] font-semibold text-[var(--sk-accent,#34d399)]">
        Connected
      </span>
    ) : wallet.detected ? (
      <span className="border border-[var(--sk-border-strong,#373a41)] px-2.5 py-[3px] text-[11px] font-semibold text-[var(--sk-text-secondary,#cecfd2)]">
        Detected
      </span>
    ) : (
      <span className="sol-wcm-install text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
        Install {"↗"}
      </span>
    );

    if (!wallet.detected) {
      return (
        <a
          key={wallet.id}
          href={wallet.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-wcm-row={index === 0 ? "" : undefined}
          className={rowClasses}
          style={rowStyle}
        >
          {icon}
          {name}
          {badge}
        </a>
      );
    }
    return (
      <button
        key={wallet.id}
        type="button"
        data-wcm-row={index === 0 ? "" : undefined}
        data-disabled={isDimmed ? "true" : "false"}
        disabled={isDimmed}
        onClick={() => !isConnecting && selectWallet(wallet)}
        className={rowClasses}
        style={rowStyle}
      >
        {icon}
        {name}
        {badge}
      </button>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      onKeyDown={trapFocus}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-[4px] ${
          exiting ? "sol-wcm-backdrop-exit" : "sol-wcm-backdrop-enter"
        }`}
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative m-6 max-h-[min(85vh,640px)] w-full max-w-[400px] overflow-y-auto border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] p-[22px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] outline-none ${
          exiting ? "sol-wcm-modal-exit" : "sol-wcm-modal-enter"
        }`}
      >
        <div role="status" aria-live="polite" className="sr-only">
          {liveText}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 flex size-7 cursor-pointer items-center justify-center text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
        >
          <X aria-hidden className="size-4" />
        </button>

        {(status === "list" || status === "connecting") &&
          (helpView ? (
            <div className="sol-wcm-item-enter flex flex-col items-center gap-3.5 px-1 py-3 text-center">
              <div className="flex size-12 items-center justify-center bg-[var(--sk-raised,#1f242f)]">
                <Wallet
                  aria-hidden
                  className="size-[22px] text-[var(--sk-text-tertiary,#94969c)]"
                />
              </div>
              <div className="text-[15px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                {noneDetected ? "No wallet found" : "Get a wallet"}
              </div>
              <div className="max-w-[360px] text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
                A wallet is a browser extension that holds your keys and
                approves transactions — install one to continue.
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-2.5">
                {wallets.map((w) => (
                  <a
                    key={w.id}
                    href={w.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[var(--sk-border,#22262f)] px-3.5 py-2 text-[13px] font-semibold text-[var(--sk-accent,#34d399)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                  >
                    Get {w.name}
                  </a>
                ))}
              </div>
              {helpOpen && !noneDetected && (
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="mt-1 cursor-pointer text-[13px] font-semibold text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                >
                  Back to wallet list
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="text-center text-[17px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                Connect wallet
              </div>
              {(termsUrl || privacyUrl) && (
                <p className="mx-auto mb-0 mt-2 max-w-[300px] text-center text-[13px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                  By connecting your wallet, you agree to our{" "}
                  {termsUrl && (
                    <a
                      href={termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--sk-accent,#34d399)] transition-colors duration-150 hover:text-[var(--sk-accent-soft,#6ee7b7)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                    >
                      Terms of Service
                    </a>
                  )}
                  {termsUrl && privacyUrl && " and our "}
                  {privacyUrl && (
                    <a
                      href={privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--sk-accent,#34d399)] transition-colors duration-150 hover:text-[var(--sk-accent-soft,#6ee7b7)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                    >
                      Privacy Policy
                    </a>
                  )}
                  .
                </p>
              )}
              {anyRecommended && (
                <div className="mb-2 mt-4 text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
                  Recommended
                </div>
              )}
              <div className={`flex flex-col gap-2.5 ${anyRecommended ? "" : "mt-4"}`}>
                {visibleWallets.map((w, i) => renderRow(w, i))}
                {extraWallets.length > 0 && !showAll && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    disabled={status === "connecting"}
                    className={`sol-wcm-item-enter sol-wcm-wallet-row flex w-full items-center gap-3.5 border border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)] px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 ${
                      status === "connecting" ? "opacity-40" : "cursor-pointer"
                    }`}
                    style={{ animationDelay: `${visibleWallets.length * 40}ms` }}
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center bg-[var(--sk-raised,#1f242f)]"
                    >
                      <MoreHorizontal className="size-5 text-[var(--sk-text-secondary,#cecfd2)]" />
                    </span>
                    <span className="flex-1 text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                      More wallets
                    </span>
                  </button>
                )}
              </div>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  disabled={status === "connecting"}
                  className={`text-[13.5px] font-semibold text-[var(--sk-accent,#34d399)] transition-colors duration-150 hover:text-[var(--sk-accent-soft,#6ee7b7)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 ${
                    status === "connecting" ? "opacity-40" : "cursor-pointer"
                  }`}
                >
                  I don{"’"}t have a wallet
                </button>
              </div>
            </div>
          ))}

        {status === "rejected" && (
          <div className="sol-wcm-item-enter flex flex-col gap-4 py-1">
            <div className="flex items-center gap-3.5">
              <WalletGlyph
                wallet={selectedWallet}
                sizeClass="size-9"
                textClass="text-[13px]"
                className="opacity-70"
              />
              <div>
                <div className="text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                  Connection cancelled
                </div>
                <div className="mt-0.5 text-[13px] text-[var(--sk-text-tertiary,#94969c)]">
                  {friendly.text}
                </div>
              </div>
            </div>
            <div className="flex gap-2.5">
              {selectedWallet && (
                <button
                  type="button"
                  onClick={() => selectWallet(selectedWallet)}
                  className="cursor-pointer bg-[var(--sk-btn,#00543f)] px-[18px] py-[9px] text-[13px] font-semibold text-[var(--sk-btn-text,#18e3a5)] transition-colors duration-150 hover:bg-[var(--sk-btn-hover,#006a53)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] px-[18px] py-[9px] text-[13px] font-semibold text-[var(--sk-text-secondary,#cecfd2)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
              >
                Cancel
              </button>
            </div>
            {friendly.raw && (
              <>
                <button
                  type="button"
                  onClick={() => setDetailsOpen((v) => !v)}
                  aria-expanded={detailsOpen}
                  className="self-start cursor-pointer text-[12px] text-[var(--sk-text-quaternary,#61656c)] underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                >
                  {detailsOpen ? "Hide technical details" : "Show technical details"}
                </button>
                {detailsOpen && (
                  <pre className="m-0 whitespace-pre-wrap break-words border border-[var(--sk-border,#22262f)] bg-[var(--sk-bg,#0c0e12)] px-3 py-2.5 font-mono text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                    {friendly.raw}
                  </pre>
                )}
              </>
            )}
          </div>
        )}

        {status === "connected" && (
          <div className="sol-wcm-item-enter flex items-center gap-3.5 py-2">
            <div className="relative shrink-0">
              <WalletGlyph
                wallet={selectedWallet}
                sizeClass="size-10"
                textClass="text-[14px]"
              />
              <svg
                width={20}
                height={20}
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="absolute -bottom-1 -right-1 rounded-full bg-[var(--sk-surface,#161b26)]"
              >
                <circle
                  className="sol-wcm-check-circle-path"
                  cx={10}
                  cy={10}
                  r={9}
                  stroke="var(--sk-success,#17b26a)"
                  strokeWidth={2}
                />
                <path
                  className="sol-wcm-check-mark-path"
                  d="M6 10.2L8.7 13L14 7.5"
                  stroke="var(--sk-success,#17b26a)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                Wallet connected
              </div>
              {displayAddress && (
                <div
                  className="mt-0.5 font-mono text-[13px] text-[var(--sk-text-tertiary,#94969c)]"
                  title={address}
                >
                  {displayAddress}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
