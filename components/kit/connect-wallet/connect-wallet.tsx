"use client";

/**
 * ConnectWallet — Solana UI Kit
 *
 * The full connect flow in one piece: a trigger button, an anchored panel
 * that morphs through wallet list → connecting → (optional) sign-in-with-
 * Solana → success, and a connected account chip the trigger becomes.
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Positioning: the panel is absolutely positioned inside the trigger's
 * wrapper (no portal), so an `overflow: hidden` ancestor will clip it —
 * keep the trigger out of clipping containers, or use ConnectWalletModal.
 *
 * Theming: every color is a CSS variable with the kit's dark-emerald default
 * inlined as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any
 * ancestor to retheme without touching this file.
 *
 * <ConnectWallet
 *   wallets={wallets}
 *   status={status}
 *   address={address}
 *   onSelectWallet={(w) => connect(w)}
 *   onSign={() => signIn()}         // omit the signing status to skip SIWS
 *   onDisconnect={() => disconnect()}
 * />
 *
 * The signing step is optional: if your dApp doesn't use sign-in-with-Solana,
 * simply never set status="signing" — go connecting → connected directly.
 */

import {
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { MoreHorizontal, MoreVertical, Wallet } from "lucide-react";

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

export type ConnectWalletFlowStatus =
  | "disconnected"
  | "connecting"
  | "signing"
  | "rejected"
  | "connected";

export interface ConnectWalletErrorRule {
  test: RegExp;
  text: string;
}

export interface ConnectWalletProps {
  wallets: WalletOption[];
  /** Wallet lifecycle, driven by your adapter calls. */
  status: ConnectWalletFlowStatus;
  /** Called when a detected wallet is picked (also powers Try again). */
  onSelectWallet?: (wallet: WalletOption) => void;
  /** Called from the sign-in-with-Solana step's Sign button. */
  onSign?: () => void;
  /** Called from the chip menu, the sign step, and the rejected Cancel. */
  onDisconnect?: () => void;
  /** Raw connection error shown (mapped) in the rejected state. */
  error?: string;
  /** Your own connect-error rules, matched before the built-in defaults. */
  errorMap?: ConnectWalletErrorRule[];
  /** Which wallet is mid-flow, when driven externally. */
  selectedWalletId?: string;
  /** Connected address (full base58 is fine — truncated for display). */
  address?: string;
  /** Badge this wallet "Connected" in the list; also drives the chip glyph. */
  connectedWalletId?: string;
  /** Terms of service link in the header. Omit both to hide the line. */
  termsUrl?: string;
  /** Privacy policy link in the header. */
  privacyUrl?: string;
  /** Control the panel externally (defaults to internal state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** Includes the error names @solana/wallet-adapter actually throws. */
const DEFAULT_CONNECT_ERROR_MAP: ConnectWalletErrorRule[] = [
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
  errorMap?: ConnectWalletErrorRule[],
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

const STYLE_ID = "sol-cw-styles";
const KEYFRAMES = `
@keyframes sol-cw-panel-in { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes sol-cw-panel-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.97) translateY(-2px); } }
@keyframes sol-cw-step-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-cw-item-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-cw-trace { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
@keyframes sol-cw-check-circle { from { stroke-dashoffset: 132; } to { stroke-dashoffset: 0; } }
@keyframes sol-cw-check-mark { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
.sol-cw-panel-enter { animation: sol-cw-panel-in 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-cw-panel-exit { animation: sol-cw-panel-out 150ms ease-in both; }
.sol-cw-step-enter { animation: sol-cw-step-in 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-cw-item-enter { animation: sol-cw-item-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-cw-trace-path { stroke-dasharray: 60 180; animation: sol-cw-trace 1.4s linear infinite; }
.sol-cw-check-circle-path { stroke-dasharray: 132; animation: sol-cw-check-circle 450ms cubic-bezier(0.65,0,0.35,1) forwards; }
.sol-cw-check-mark-path { stroke-dasharray: 24; animation: sol-cw-check-mark 260ms cubic-bezier(0.65,0,0.35,1) 380ms forwards; }
.sol-cw-row { box-shadow: inset 2px 0 0 transparent; transition: background 150ms ease, box-shadow 150ms ease, opacity 200ms ease; }
.sol-cw-row:hover:not([data-disabled="true"]) { background: var(--sk-raised, #1f242f); box-shadow: inset 2px 0 0 var(--sk-accent, #34d399); }
.sol-cw-row .sol-cw-cta { opacity: 0; transition: opacity 150ms ease; }
.sol-cw-row:hover:not([data-disabled="true"]) .sol-cw-cta { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .sol-cw-panel-enter, .sol-cw-panel-exit, .sol-cw-step-enter, .sol-cw-item-enter,
  .sol-cw-trace-path, .sol-cw-check-circle-path, .sol-cw-check-mark-path, .sol-cw-row {
    animation: none !important; transition: none !important;
  }
  .sol-cw-check-circle-path, .sol-cw-check-mark-path { stroke-dashoffset: 0; }
  .sol-cw-trace-path { stroke-dasharray: none; }
  .sol-cw-row .sol-cw-cta { opacity: 1; }
}
`;

/**
 * Wallet avatar framed by a square outline with a segment tracing its
 * perimeter — the loader follows the icon's shape (and matches the
 * block-trace language used by TransactionStatus).
 */
function SpinnerAvatar({ wallet }: { wallet?: WalletOption }) {
  return (
    <div className="relative mx-auto size-16" aria-hidden>
      {wallet?.icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- data-URI logos need no optimization
        <img
          src={wallet.icon}
          alt=""
          className="absolute inset-[10px] size-11 object-contain"
        />
      ) : (
        <div
          className="absolute inset-[10px] flex items-center justify-center text-[14px] font-bold text-[var(--sk-bg,#0c0e12)]"
          style={{ background: wallet?.color ?? "#94969c" }}
        >
          {wallet ? initials(wallet.name) : "?"}
        </div>
      )}
      <svg viewBox="0 0 64 64" width={64} height={64} className="absolute inset-0">
        <rect
          x={2}
          y={2}
          width={60}
          height={60}
          fill="none"
          stroke="var(--sk-border,#22262f)"
          strokeWidth={2.5}
        />
        <rect
          className="sol-cw-trace-path"
          x={2}
          y={2}
          width={60}
          height={60}
          fill="none"
          stroke="var(--sk-accent,#34d399)"
          strokeWidth={2.5}
        />
      </svg>
    </div>
  );
}

export function ConnectWallet({
  wallets,
  status,
  onSelectWallet,
  onSign,
  onDisconnect,
  error,
  errorMap,
  selectedWalletId,
  address,
  connectedWalletId,
  termsUrl,
  privacyUrl,
  open: openProp,
  onOpenChange,
  className,
}: ConnectWalletProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const [present, setPresent] = useState(open);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const stepHeightRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});
  const reduceMotion = useReducedMotion();

  useKitStyles(STYLE_ID, KEYFRAMES);

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenInternal(next);
    onOpenChange?.(next);
  };

  // Render-phase adjustments (https://react.dev/learn/you-might-not-need-an-effect).
  if (open && !present) {
    setPresent(true);
    setShowHint(false);
    setShowAll(false);
    setHelpOpen(false);
    if (status === "disconnected") setInternalSelectedId(null);
  }
  if (prevStatus !== status) {
    setPrevStatus(status);
    setShowHint(false);
  }

  const exiting = present && !open;

  const focusTriggerRef = useRef<() => void>(() => {});
  useEffect(() => {
    closeRef.current = () => setOpen(false);
    // The trigger node swaps between button and chip — focus whichever
    // exists when the panel actually closes, not a stale capture.
    focusTriggerRef.current = () => triggerRef.current?.focus();
  });

  // Let the exit animation play, then unmount the panel.
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setPresent(false), reduceMotion ? 0 : 160);
    return () => clearTimeout(t);
  }, [exiting, reduceMotion]);

  // Focus the first wallet row on open; return focus to the trigger on close.
  useEffect(() => {
    if (!present) return;
    const root = panelRef.current;
    const target =
      root?.querySelector<HTMLElement>("[data-cw-row]") ??
      root?.querySelector<HTMLElement>(FOCUSABLE) ??
      root;
    target?.focus();
    const focusTrigger = focusTriggerRef.current;
    return () => focusTrigger();
  }, [present]);

  // Focus the chip menu's first item when it opens.
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  // Escape and outside click close the panel (and the chip menu).
  useEffect(() => {
    if (!present && !menuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      closeRef.current();
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [present, menuOpen]);

  // "Check your wallet" hint after 3s of connecting.
  useEffect(() => {
    if (status !== "connecting") return;
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, [status]);

  // Connected: brief success beat, then the panel closes into the chip.
  useEffect(() => {
    if (status !== "connected") return;
    const t = setTimeout(() => closeRef.current(), 2000);
    return () => clearTimeout(t);
  }, [status]);

  // View morph: animate the panel's height between steps instead of cutting.
  const view = status === "disconnected" ? "list" : status;
  useEffect(() => {
    const panel = panelRef.current;
    const step = stepRef.current;
    if (!panel || !step) return;
    const next = step.offsetHeight;
    const prev = stepHeightRef.current;
    stepHeightRef.current = next;
    if (reduceMotion || prev === null || prev === next) return;
    panel.style.height = `${prev}px`;
    panel.getBoundingClientRect(); // commit the starting height
    panel.style.transition = "height 300ms cubic-bezier(0.16,1,0.3,1)";
    panel.style.height = `${next}px`;
    const t = setTimeout(() => {
      panel.style.height = "auto";
      panel.style.transition = "";
    }, 320);
    return () => clearTimeout(t);
    // helpOpen and showAll change the list view's height without changing `view`.
  }, [view, helpOpen, showAll, reduceMotion]);

  // Reset the height cache whenever the panel unmounts.
  useEffect(() => {
    if (!present) stepHeightRef.current = null;
  }, [present]);

  const effectiveSelectedId = selectedWalletId ?? internalSelectedId;
  const selectedWallet = wallets.find((w) => w.id === effectiveSelectedId);
  const connectedWallet = wallets.find((w) => w.id === connectedWalletId);
  // After a reload with autoConnect, only connectedWalletId may be set.
  const chipWallet = selectedWallet ?? connectedWallet;
  const detected = wallets.filter((w) => w.detected);
  const noneDetected = detected.length === 0;
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
  const helpView = noneDetected || helpOpen;
  const friendly = error
    ? friendlyConnectError(error, errorMap)
    : {
        text: `You declined the connection in ${selectedWallet?.name ?? "your wallet"}.`,
        raw: "",
      };
  const displayAddress = shortAddress(address);

  const liveText = !present
    ? ""
    : view === "connecting"
      ? `Connecting to ${selectedWallet?.name ?? "wallet"}${showHint ? ". Check your wallet." : ""}`
      : view === "signing"
        ? "Sign the message in your wallet to continue."
        : view === "rejected"
          ? friendly.text
          : view === "connected"
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
      setOpen(false);
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
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

  const menuKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setMenuOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      items[(index + delta + items.length) % items.length]?.focus();
    }
  };

  const renderRow = (wallet: WalletOption, index: number) => {
    const rowClasses =
      "sol-cw-item-enter sol-cw-row flex w-full cursor-pointer items-center gap-3 border border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)] px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2";
    const rowStyle = { animationDelay: `${index * 40}ms` };
    const isConnected = wallet.id === connectedWalletId;
    const icon = (
      <WalletGlyph wallet={wallet} sizeClass="size-7" textClass="text-[11px]" />
    );
    const badge = isConnected ? (
      <span className="border border-[var(--sk-success,#17b26a)] px-2 py-[2px] text-[10.5px] font-semibold text-[var(--sk-accent,#34d399)]">
        Connected
      </span>
    ) : wallet.detected ? (
      <span className="border border-[var(--sk-border-strong,#373a41)] px-2 py-[2px] text-[10.5px] font-semibold text-[var(--sk-text-secondary,#cecfd2)]">
        Detected
      </span>
    ) : (
      <span className="sol-cw-cta text-[11px] text-[var(--sk-text-tertiary,#94969c)]">
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
          data-cw-row={index === 0 ? "" : undefined}
          className={rowClasses}
          style={rowStyle}
        >
          {icon}
          <span className="flex-1 text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
            {wallet.name}
          </span>
          {badge}
        </a>
      );
    }
    return (
      <button
        key={wallet.id}
        type="button"
        data-cw-row={index === 0 ? "" : undefined}
        onClick={() => selectWallet(wallet)}
        className={rowClasses}
        style={rowStyle}
      >
        {icon}
        <span className="flex-1 text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
          {wallet.name}
        </span>
        {badge}
      </button>
    );
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <div role="status" aria-live="polite" className="sr-only">
        {liveText}
      </div>

      {status === "connected" && !present ? (
        <div className="relative">
          <button
            type="button"
            ref={triggerRef}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={address}
            className="sol-cw-step-enter flex cursor-pointer items-center gap-2 border border-[var(--sk-border,#22262f)] bg-transparent py-1.5 pl-2.5 pr-1.5 transition-colors duration-150 hover:bg-[var(--sk-surface,#161b26)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
          >
            {chipWallet ? (
              <WalletGlyph
                wallet={chipWallet}
                sizeClass="size-5"
                textClass="text-[10px]"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-5 items-center justify-center bg-[var(--sk-accent,#34d399)] text-[10px] font-bold text-[var(--sk-bg,#0c0e12)]"
              >
                {"◎"}
              </span>
            )}
            <span className="font-mono text-[12px] text-[var(--sk-text,#f7f7f7)]">
              {displayAddress || "Connected"}
            </span>
            <MoreVertical
              aria-hidden
              className="size-3.5 text-[var(--sk-text-quaternary,#61656c)]"
            />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              onKeyDown={menuKeyDown}
              className="sol-cw-panel-enter absolute right-0 top-full z-50 mt-1.5 w-40 border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDisconnect?.();
                }}
                className="w-full cursor-pointer px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--sk-text-secondary,#cecfd2)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="cursor-pointer bg-[var(--sk-btn,#00543f)] px-4 py-2 text-[13px] font-semibold text-[var(--sk-btn-text,#18e3a5)] transition-colors duration-150 hover:bg-[var(--sk-btn-hover,#006a53)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
        >
          Connect wallet
        </button>
      )}

      {present && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Connect wallet"
          tabIndex={-1}
          onKeyDown={trapFocus}
          className={`absolute right-0 top-full z-50 mt-2 w-[290px] origin-top-right overflow-hidden border border-[var(--sk-border,#22262f)] bg-[var(--sk-surface,#161b26)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] outline-none ${
            exiting ? "sol-cw-panel-exit" : "sol-cw-panel-enter"
          }`}
        >
          <div ref={stepRef} key={view} className="sol-cw-step-enter">
            {view === "list" &&
              (helpView ? (
                <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
                  <div className="flex size-11 items-center justify-center bg-[var(--sk-raised,#1f242f)]">
                    <Wallet
                      aria-hidden
                      className="size-5 text-[var(--sk-text-tertiary,#94969c)]"
                    />
                  </div>
                  <div className="text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                    {noneDetected ? "No wallet found" : "Get a wallet"}
                  </div>
                  <div className="text-[12px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                    A wallet is a browser extension that holds your keys and
                    approves transactions — install one to continue.
                  </div>
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    {wallets.map((w) => (
                      <a
                        key={w.id}
                        href={w.installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-[var(--sk-border,#22262f)] px-3 py-1.5 text-[12px] font-semibold text-[var(--sk-accent,#34d399)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                      >
                        Get {w.name}
                      </a>
                    ))}
                  </div>
                  {helpOpen && !noneDetected && (
                    <button
                      type="button"
                      onClick={() => setHelpOpen(false)}
                      className="mt-0.5 cursor-pointer text-[12px] font-semibold text-[var(--sk-text-tertiary,#94969c)] transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                    >
                      Back to wallet list
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-center text-[15px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                    Connect wallet
                  </div>
                  {(termsUrl || privacyUrl) && (
                    <p className="mx-auto mb-0 mt-1.5 text-center text-[11.5px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
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
                    <div className="mb-1.5 mt-3 text-[11.5px] text-[var(--sk-text-tertiary,#94969c)]">
                      Recommended
                    </div>
                  )}
                  <div className={`flex flex-col gap-1.5 ${anyRecommended ? "" : "mt-3"}`}>
                    {visibleWallets.map((w, i) => renderRow(w, i))}
                    {extraWallets.length > 0 && !showAll && (
                      <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="sol-cw-item-enter sol-cw-row flex w-full cursor-pointer items-center gap-3 border border-[var(--sk-border,#22262f)] bg-[var(--sk-card,#13161b)] px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                        style={{ animationDelay: `${visibleWallets.length * 40}ms` }}
                      >
                        <span
                          aria-hidden
                          className="flex size-7 shrink-0 items-center justify-center bg-[var(--sk-raised,#1f242f)]"
                        >
                          <MoreHorizontal className="size-4 text-[var(--sk-text-secondary,#cecfd2)]" />
                        </span>
                        <span className="flex-1 text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                          More wallets
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setHelpOpen(true)}
                      className="cursor-pointer text-[12px] font-semibold text-[var(--sk-accent,#34d399)] transition-colors duration-150 hover:text-[var(--sk-accent-soft,#6ee7b7)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                    >
                      I don{"’"}t have a wallet
                    </button>
                  </div>
                </div>
              ))}

            {view === "connecting" && (
              <div className="px-4 py-6 text-center">
                <SpinnerAvatar wallet={selectedWallet} />
                <div className="mt-3.5 text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                  Approve in {selectedWallet?.name ?? "your wallet"}
                </div>
                <div
                  className={`mt-1 text-[11px] text-[var(--sk-text-quaternary,#61656c)] transition-opacity duration-300 ${
                    showHint ? "opacity-100" : "opacity-0"
                  }`}
                >
                  Check your wallet{"…"}
                </div>
              </div>
            )}

            {view === "signing" && (
              <div className="px-4 py-6 text-center">
                <svg
                  width={34}
                  height={34}
                  viewBox="0 0 36 36"
                  fill="none"
                  aria-hidden
                  className="mx-auto mb-2.5"
                >
                  <rect
                    x={3}
                    y={3}
                    width={30}
                    height={30}
                    stroke="var(--sk-accent,#34d399)"
                    strokeWidth={2}
                  />
                  <rect
                    x={14}
                    y={14}
                    width={8}
                    height={8}
                    fill="var(--sk-accent-deep,#059669)"
                  />
                </svg>
                <div className="text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                  Sign the message to continue
                </div>
                <div className="mx-auto mb-3.5 mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                  The signature verifies you own this address. It costs
                  nothing.
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={onSign}
                    className="cursor-pointer bg-[var(--sk-btn,#00543f)] px-3.5 py-2 text-[13px] font-semibold text-[var(--sk-btn-text,#18e3a5)] transition-colors duration-150 hover:bg-[var(--sk-btn-hover,#006a53)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                  >
                    Sign message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDisconnect?.();
                    }}
                    className="cursor-pointer border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] px-3.5 py-2 text-[13px] font-semibold text-[var(--sk-text-secondary,#cecfd2)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {view === "rejected" && (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <WalletGlyph
                    wallet={selectedWallet}
                    sizeClass="size-8"
                    textClass="text-[12px]"
                    className="opacity-70"
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                      Connection cancelled
                    </div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
                      {friendly.text}
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 flex gap-2">
                  {selectedWallet && (
                    <button
                      type="button"
                      onClick={() => selectWallet(selectedWallet)}
                      className="cursor-pointer bg-[var(--sk-btn,#00543f)] px-3.5 py-2 text-[13px] font-semibold text-[var(--sk-btn-text,#18e3a5)] transition-colors duration-150 hover:bg-[var(--sk-btn-hover,#006a53)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                    >
                      Try again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDisconnect?.();
                    }}
                    className="cursor-pointer border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] px-3.5 py-2 text-[13px] font-semibold text-[var(--sk-text-secondary,#cecfd2)] transition-colors duration-150 hover:bg-[var(--sk-border,#22262f)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {view === "connected" && (
              <div className="px-4 py-6 text-center">
                <svg
                  width={48}
                  height={48}
                  viewBox="0 0 48 48"
                  fill="none"
                  aria-hidden
                  className="mx-auto"
                >
                  <circle
                    className="sol-cw-check-circle-path"
                    cx={24}
                    cy={24}
                    r={21}
                    stroke="var(--sk-success,#17b26a)"
                    strokeWidth={2.5}
                  />
                  <path
                    className="sol-cw-check-mark-path"
                    d="M15 24.5L21 30.5L33 17.5"
                    stroke="var(--sk-success,#17b26a)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-2.5 text-[14px] font-semibold text-[var(--sk-text,#f7f7f7)]">
                  Wallet connected
                </div>
                {displayAddress && (
                  <div
                    className="mt-0.5 font-mono text-[12px] text-[var(--sk-text-tertiary,#94969c)]"
                    title={address}
                  >
                    {displayAddress}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
