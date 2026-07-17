"use client";

/**
 * WalletConnect — Solana UI Kit
 *
 * The full connect flow in one piece: a trigger button, an anchored panel
 * that morphs through wallet list → connecting → (optional) sign-in-with-
 * Solana → success, and a connected account chip the trigger becomes.
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * <WalletConnect
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
  /** Brand color behind the wallet initials. */
  color?: string;
  /**
   * Recommended wallets show in the main list; the rest sit behind a
   * "More wallets" row. Omit on every wallet to show a single flat list.
   */
  recommended?: boolean;
}

export type WalletConnectFlowStatus =
  | "disconnected"
  | "connecting"
  | "signing"
  | "rejected"
  | "connected";

export interface WalletConnectProps {
  wallets: WalletOption[];
  /** Wallet lifecycle, driven by your adapter calls. */
  status: WalletConnectFlowStatus;
  /** Called when a detected wallet is picked (also powers Try again). */
  onSelectWallet?: (wallet: WalletOption) => void;
  /** Called from the sign-in-with-Solana step's Sign button. */
  onSign?: () => void;
  /** Called from the chip menu, the sign step, and the rejected Cancel. */
  onDisconnect?: () => void;
  /** Raw connection error shown (mapped) in the rejected state. */
  error?: string;
  /** Which wallet is mid-flow, when driven externally. */
  selectedWalletId?: string;
  /** Connected address — shown in the success beat and the chip. */
  address?: string;
  /** Badge this wallet "Connected" in the list (e.g. multi-wallet apps). */
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

function friendlyConnectError(raw?: string): { text: string; raw: string } {
  if (!raw) return { text: "Something went wrong connecting. Try again.", raw: "" };
  if (/not responding|unresponsive/i.test(raw))
    return {
      text: "Wallet isn’t responding. Make sure the extension is unlocked.",
      raw,
    };
  if (/timeout|timed out/i.test(raw))
    return {
      text: "This is taking longer than usual. Check your wallet extension.",
      raw,
    };
  if (/user rejected|declined|cancelled/i.test(raw))
    return { text: "You declined the connection request.", raw };
  return { text: "Something went wrong connecting. Try again.", raw };
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
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

const FOCUSABLE =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/* Scoped keyframes — inlined so the component works with zero Tailwind config. */
const KEYFRAMES = `
@keyframes sol-wc-panel-in { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes sol-wc-panel-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.97) translateY(-2px); } }
@keyframes sol-wc-step-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-wc-item-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-wc-spin { to { transform: rotate(360deg); } }
@keyframes sol-wc-check-circle { from { stroke-dashoffset: 132; } to { stroke-dashoffset: 0; } }
@keyframes sol-wc-check-mark { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
.sol-wc-panel-enter { animation: sol-wc-panel-in 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-wc-panel-exit { animation: sol-wc-panel-out 150ms ease-in both; }
.sol-wc-step-enter { animation: sol-wc-step-in 250ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-wc-item-enter { animation: sol-wc-item-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-wc-spin { animation: sol-wc-spin 1.2s linear infinite; }
.sol-wc-check-circle-path { stroke-dasharray: 132; animation: sol-wc-check-circle 450ms cubic-bezier(0.65,0,0.35,1) forwards; }
.sol-wc-check-mark-path { stroke-dasharray: 24; animation: sol-wc-check-mark 260ms cubic-bezier(0.65,0,0.35,1) 380ms forwards; }
.sol-wc-row { border-left: 2px solid #22262f; transition: background 150ms ease, border-color 150ms ease, opacity 200ms ease; }
.sol-wc-row:hover:not([data-disabled="true"]) { background: #1a2030; border-left-color: #10b981; }
.sol-wc-row .sol-wc-cta { opacity: 0; transition: opacity 150ms ease; }
.sol-wc-row:hover:not([data-disabled="true"]) .sol-wc-cta { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .sol-wc-row .sol-wc-cta { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .sol-wc-panel-enter, .sol-wc-panel-exit, .sol-wc-step-enter, .sol-wc-item-enter,
  .sol-wc-spin, .sol-wc-check-circle-path, .sol-wc-check-mark-path, .sol-wc-row {
    animation: none !important; transition: none !important;
  }
  .sol-wc-check-circle-path, .sol-wc-check-mark-path { stroke-dashoffset: 0; }
  .sol-wc-row .sol-wc-cta { opacity: 1; }
}
`;

/** Wallet avatar with an arc spinner orbiting it. */
function SpinnerAvatar({ wallet }: { wallet?: WalletOption }) {
  return (
    <div className="relative mx-auto size-16" aria-hidden>
      <div
        className="absolute inset-[10px] flex items-center justify-center text-[14px] font-bold text-[#0c0e12]"
        style={{ background: wallet?.color ?? "#94969c" }}
      >
        {wallet ? initials(wallet.name) : "?"}
      </div>
      <svg
        viewBox="0 0 64 64"
        width={64}
        height={64}
        className="sol-wc-spin absolute inset-0"
      >
        <circle
          cx={32}
          cy={32}
          r={29}
          fill="none"
          stroke="#34d399"
          strokeWidth={2.5}
          strokeDasharray="60 122"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function WalletConnect({
  wallets,
  status,
  onSelectWallet,
  onSign,
  onDisconnect,
  error,
  selectedWalletId,
  address,
  connectedWalletId,
  termsUrl,
  privacyUrl,
  open: openProp,
  onOpenChange,
  className,
}: WalletConnectProps) {
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
  const closeRef = useRef<() => void>(() => {});
  const reduceMotion = useReducedMotion();

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
      root?.querySelector<HTMLElement>("[data-wc-row]") ??
      root?.querySelector<HTMLElement>(FOCUSABLE) ??
      root;
    target?.focus();
    const focusTrigger = focusTriggerRef.current;
    return () => focusTrigger();
  }, [present]);

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
    const t = setTimeout(() => closeRef.current(), 1400);
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
    ? friendlyConnectError(error)
    : {
        text: `You declined the connection in ${selectedWallet?.name ?? "your wallet"}.`,
        raw: "",
      };
  const shortAddress = address ?? "";

  const liveText = !present
    ? ""
    : view === "connecting"
      ? `Connecting to ${selectedWallet?.name ?? "wallet"}${showHint ? ". Check your wallet." : ""}`
      : view === "signing"
        ? "Sign the message in your wallet to continue."
        : view === "rejected"
          ? friendly.text
          : view === "connected"
            ? `Wallet connected${address ? `: ${address}` : ""}`
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

  const renderRow = (wallet: WalletOption, index: number) => {
    const rowClasses =
      "sol-wc-item-enter sol-wc-row flex w-full cursor-pointer items-center gap-3 border border-[#22262f] bg-[#13161b] px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2";
    const rowStyle = { animationDelay: `${index * 40}ms` };
    const isConnected = wallet.id === connectedWalletId;
    const icon = (
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center text-[11px] font-bold text-[#0c0e12]"
        style={{ background: wallet.color ?? "#94969c" }}
      >
        {initials(wallet.name)}
      </span>
    );
    const badge = isConnected ? (
      <span className="border border-emerald-500 px-2 py-[2px] text-[10.5px] font-semibold text-emerald-400">
        Connected
      </span>
    ) : wallet.detected ? (
      <span className="border border-[#373a41] px-2 py-[2px] text-[10.5px] font-semibold text-[#cecfd2]">
        Detected
      </span>
    ) : (
      <span className="sol-wc-cta text-[11px] text-[#94969c]">Install {"↗"}</span>
    );
    if (!wallet.detected) {
      return (
        <a
          key={wallet.id}
          href={wallet.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-wc-row={index === 0 ? "" : undefined}
          className={rowClasses}
          style={rowStyle}
        >
          {icon}
          <span className="flex-1 text-[13px] font-semibold text-[#f7f7f7]">
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
        data-wc-row={index === 0 ? "" : undefined}
        onClick={() => selectWallet(wallet)}
        className={rowClasses}
        style={rowStyle}
      >
        {icon}
        <span className="flex-1 text-[13px] font-semibold text-[#f7f7f7]">
          {wallet.name}
        </span>
        {badge}
      </button>
    );
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <style>{KEYFRAMES}</style>
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
            className="sol-wc-step-enter flex cursor-pointer items-center gap-2 border border-[#22262f] bg-transparent py-1.5 pl-2.5 pr-1.5 transition-colors duration-150 hover:bg-[#161b26] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
          >
            <span
              aria-hidden
              className="flex size-5 items-center justify-center text-[10px] font-bold text-[#0c0e12]"
              style={{ background: selectedWallet?.color ?? "#34d399" }}
            >
              {selectedWallet ? initials(selectedWallet.name) : "◎"}
            </span>
            <span className="font-mono text-[12px] text-[#f7f7f7]">
              {shortAddress || "Connected"}
            </span>
            <MoreVertical aria-hidden className="size-3.5 text-[#61656c]" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="sol-wc-panel-enter absolute right-0 top-full z-50 mt-1.5 w-40 border border-[#22262f] bg-[#161b26] shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDisconnect?.();
                }}
                className="w-full cursor-pointer px-3 py-2.5 text-left text-[13px] font-semibold text-[#cecfd2] transition-colors duration-150 hover:bg-[#22262f] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
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
          className="cursor-pointer bg-[#00543f] px-4 py-2 text-[13px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
        >
          Connect wallet
        </button>
      )}

      {present && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Connect wallet"
          tabIndex={-1}
          onKeyDown={trapFocus}
          className={`absolute right-0 top-full z-50 mt-2 w-[290px] origin-top-right overflow-hidden border border-[#22262f] bg-[#161b26] shadow-[0_20px_40px_rgba(0,0,0,0.4)] outline-none ${
            exiting ? "sol-wc-panel-exit" : "sol-wc-panel-enter"
          }`}
        >
          <div ref={stepRef} key={view} className="sol-wc-step-enter">
            {view === "list" &&
              (helpView ? (
                <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
                  <div className="flex size-11 items-center justify-center bg-[#1f242f]">
                    <Wallet aria-hidden className="size-5 text-[#94969c]" />
                  </div>
                  <div className="text-[14px] font-semibold text-[#f7f7f7]">
                    {noneDetected ? "No wallet found" : "Get a wallet"}
                  </div>
                  <div className="text-[12px] leading-relaxed text-[#94969c]">
                    A wallet holds your keys and approves transactions —
                    install one to continue.
                  </div>
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    {wallets.map((w) => (
                      <a
                        key={w.id}
                        href={w.installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-[#22262f] px-3 py-1.5 text-[12px] font-semibold text-emerald-400 transition-colors duration-150 hover:bg-[#22262f] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                      >
                        Get {w.name}
                      </a>
                    ))}
                  </div>
                  {helpOpen && !noneDetected && (
                    <button
                      type="button"
                      onClick={() => setHelpOpen(false)}
                      className="mt-0.5 cursor-pointer text-[12px] font-semibold text-[#94969c] transition-colors duration-150 hover:text-[#cecfd2] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                    >
                      Back to wallet list
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-center text-[15px] font-semibold text-[#f7f7f7]">
                    Connect wallet
                  </div>
                  {(termsUrl || privacyUrl) && (
                    <p className="mx-auto mb-0 mt-1.5 text-center text-[11.5px] leading-relaxed text-[#94969c]">
                      By connecting your wallet, you agree to our{" "}
                      {termsUrl && (
                        <a
                          href={termsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-emerald-400 transition-colors duration-150 hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
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
                          className="font-semibold text-emerald-400 transition-colors duration-150 hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                        >
                          Privacy Policy
                        </a>
                      )}
                      .
                    </p>
                  )}
                  {anyRecommended && (
                    <div className="mb-1.5 mt-3 text-[11.5px] text-[#94969c]">
                      Recommended
                    </div>
                  )}
                  <div className={`flex flex-col gap-1.5 ${anyRecommended ? "" : "mt-3"}`}>
                    {visibleWallets.map((w, i) => renderRow(w, i))}
                    {extraWallets.length > 0 && !showAll && (
                      <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="sol-wc-item-enter sol-wc-row flex w-full cursor-pointer items-center gap-3 border border-[#22262f] bg-[#13161b] px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                        style={{ animationDelay: `${visibleWallets.length * 40}ms` }}
                      >
                        <span
                          aria-hidden
                          className="flex size-7 shrink-0 items-center justify-center bg-[#1f242f]"
                        >
                          <MoreHorizontal className="size-4 text-[#cecfd2]" />
                        </span>
                        <span className="flex-1 text-[13px] font-semibold text-[#f7f7f7]">
                          More wallets
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setHelpOpen(true)}
                      className="cursor-pointer text-[12px] font-semibold text-emerald-400 transition-colors duration-150 hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                    >
                      I don{"’"}t have a wallet
                    </button>
                  </div>
                </div>
              ))}

            {view === "connecting" && (
              <div className="px-4 py-6 text-center">
                <SpinnerAvatar wallet={selectedWallet} />
                <div className="mt-3.5 text-[13px] font-semibold text-[#f7f7f7]">
                  Approve in {selectedWallet?.name ?? "your wallet"}
                </div>
                <div
                  className={`mt-1 text-[11px] text-[#61656c] transition-opacity duration-300 ${
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
                  <rect x={3} y={3} width={30} height={30} stroke="#34d399" strokeWidth={2} />
                  <rect x={14} y={14} width={8} height={8} fill="#059669" />
                </svg>
                <div className="text-[14px] font-semibold text-[#f7f7f7]">
                  Sign the message to continue
                </div>
                <div className="mx-auto mb-3.5 mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-[#94969c]">
                  The signature verifies you own this address. It costs
                  nothing.
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={onSign}
                    className="cursor-pointer bg-[#00543f] px-3.5 py-2 text-[13px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                  >
                    Sign message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDisconnect?.();
                    }}
                    className="cursor-pointer border border-[#22262f] px-3.5 py-2 text-[13px] font-semibold text-[#cecfd2] transition-colors duration-150 hover:bg-[#22262f] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {view === "rejected" && (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center text-[12px] font-bold text-[#0c0e12] opacity-70"
                    style={{ background: selectedWallet?.color ?? "#94969c" }}
                  >
                    {selectedWallet ? initials(selectedWallet.name) : "?"}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#f7f7f7]">
                      Connection cancelled
                    </div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-[#94969c]">
                      {friendly.text}
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const wallet = selectedWallet ?? detected[0];
                      if (wallet) selectWallet(wallet);
                    }}
                    className="cursor-pointer bg-[#00543f] px-3.5 py-2 text-[13px] font-semibold text-[#18e3a5] transition-colors duration-150 hover:bg-[#006a53] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDisconnect?.();
                    }}
                    className="cursor-pointer border border-[#22262f] px-3.5 py-2 text-[13px] font-semibold text-[#cecfd2] transition-colors duration-150 hover:bg-[#22262f] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {view === "connected" && (
              <div className="px-4 py-6 text-center">
                <svg
                  width={52}
                  height={52}
                  viewBox="0 0 48 48"
                  fill="none"
                  aria-hidden
                  className="mx-auto"
                >
                  <circle
                    className="sol-wc-check-circle-path"
                    cx={24}
                    cy={24}
                    r={21}
                    stroke="#17b26a"
                    strokeWidth={2.5}
                  />
                  <path
                    className="sol-wc-check-mark-path"
                    d="M15 24.5L21 30.5L33 17.5"
                    stroke="#17b26a"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-2.5 text-[14px] font-semibold text-[#f7f7f7]">
                  Wallet connected
                </div>
                {address && (
                  <div className="mt-0.5 font-mono text-[12px] text-[#94969c]">
                    {address}
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
