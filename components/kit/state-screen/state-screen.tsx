"use client";

/**
 * StateScreen — Solana UI Kit
 *
 * The screens nobody designs: RPC down, no tokens yet, network congested,
 * wallet not connected. One calm, centered layout — icon, title, a line of
 * plain-language explanation, and a way forward — with three tones (neutral,
 * warning, error) that stay restrained. Even the error tone is a muted coral,
 * never an alarm-red full-bleed.
 *
 * Ships with presets for the common Solana cases (see STATE_PRESETS) so you
 * don't rewrite the copy each time; pass your own handlers in.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file. Tokens used here:
 *   --sk-surface --sk-raised --sk-border --sk-border-strong
 *   --sk-btn --sk-btn-text --sk-btn-hover --sk-accent
 *   --sk-text --sk-text-secondary --sk-text-tertiary
 *   --sk-warning --sk-danger
 *
 * <StateScreen
 *   {...STATE_PRESETS.rpcDown}
 *   action={{ label: "Try again", onClick: refetch }}
 *   busy={retrying}
 * />
 */

import {
  createElement,
  isValidElement,
  useInsertionEffect,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  CloudOff,
  Coins,
  Gauge,
  Inbox,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type StateTone = "neutral" | "warning" | "error";

export interface StateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface StateScreenProps {
  /** A lucide icon component, or any node for full control. */
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  tone?: StateTone;
  /** Primary way forward. Rendered as a button, or a link if `href` is set. */
  action?: StateAction;
  /** Quieter secondary option. */
  secondaryAction?: StateAction;
  /** Spinner on the primary action, and it announces "Retrying". */
  busy?: boolean;
  /** Tighten the vertical padding for use inside a card rather than a page. */
  compact?: boolean;
  className?: string;
}

const TONE: Record<
  StateTone,
  { iconBg: string; iconColor: string; role: "status" | "alert" }
> = {
  neutral: {
    iconBg: "var(--sk-raised,#1f242f)",
    iconColor: "var(--sk-text-tertiary,#94969c)",
    role: "status",
  },
  warning: {
    iconBg: "var(--sk-warning-bg,rgba(232,181,98,0.12))",
    iconColor: "var(--sk-warning,#e8b562)",
    role: "status",
  },
  error: {
    iconBg: "var(--sk-danger-bg,rgba(240,68,56,0.12))",
    iconColor: "var(--sk-danger,#f97066)",
    role: "alert",
  },
};

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

const STYLE_ID = "sol-state-styles";
const KEYFRAMES = `
@keyframes sol-state-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sol-state-spin { to { transform: rotate(360deg); } }
.sol-state-in { animation: sol-state-in 320ms cubic-bezier(0.16,1,0.3,1) both; }
.sol-state-spin { animation: sol-state-spin 900ms linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .sol-state-in { animation: none !important; }
  .sol-state-spin { animation: none !important; }
}
`;

/**
 * Accepts either a component (a lucide icon is a forwardRef *object*, not a
 * function, so a plain typeof check misses it) or an already-rendered node.
 */
function renderIcon(icon: StateScreenProps["icon"]): ReactNode {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  return createElement(icon as ComponentType<{ className?: string }>, {
    "aria-hidden": true,
    className: "size-6",
  } as { className?: string });
}

function ActionButton({
  action,
  primary,
  busy,
}: {
  action: StateAction;
  primary: boolean;
  busy?: boolean;
}) {
  const cls = primary
    ? "bg-[var(--sk-btn,#00543f)] text-[var(--sk-btn-text,#18e3a5)] hover:bg-[var(--sk-btn-hover,#006a53)]"
    : "border border-[var(--sk-border-strong,#373a41)] bg-[var(--sk-card,#13161b)] text-[var(--sk-text-secondary,#cecfd2)] hover:bg-[var(--sk-border,#22262f)] hover:text-[var(--sk-text,#f7f7f7)]";
  const shared =
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.98]";

  const inner = (
    <>
      {busy && primary && (
        <RefreshCw aria-hidden className="sol-state-spin size-3.5" />
      )}
      {busy && primary ? "Retrying…" : action.label}
    </>
  );

  if (action.href && !busy) {
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${shared} ${cls} cursor-pointer`}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={busy}
      aria-busy={busy || undefined}
      className={`${shared} ${cls} cursor-pointer disabled:pointer-events-none disabled:opacity-70`}
    >
      {inner}
    </button>
  );
}

export function StateScreen({
  icon,
  title,
  description,
  tone = "neutral",
  action,
  secondaryAction,
  busy = false,
  compact = false,
  className,
}: StateScreenProps) {
  useKitStyles(STYLE_ID, KEYFRAMES);
  const t = TONE[tone];
  const iconNode = renderIcon(icon);

  return (
    <div
      role={t.role}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`sol-state-in flex flex-col items-center text-center ${
        compact ? "px-6 py-8" : "px-6 py-16"
      } ${className ?? ""}`}
    >
      {iconNode && (
        <span
          className="mb-4 flex size-12 items-center justify-center rounded-full"
          style={{ background: t.iconBg, color: t.iconColor }}
        >
          {iconNode}
        </span>
      )}

      <h3 className="text-[16px] font-semibold text-[var(--sk-text,#f7f7f7)]">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-[340px] text-[13px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action && <ActionButton action={action} primary busy={busy} />}
          {secondaryAction && (
            <ActionButton action={secondaryAction} primary={false} />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Presets — the common Solana states, with copy already written. Spread one
 * and add your own handlers:  <StateScreen {...STATE_PRESETS.noTokens} />
 * ------------------------------------------------------------------ */

export const STATE_PRESETS = {
  rpcDown: {
    icon: CloudOff,
    tone: "error" as StateTone,
    title: "Can’t reach the network",
    description:
      "We couldn’t connect to the Solana RPC. Check your connection, or try a different endpoint.",
  },
  congested: {
    icon: Gauge,
    tone: "warning" as StateTone,
    title: "The network is congested",
    description:
      "Solana is busy right now. Transactions may take longer and cost more — a higher priority fee helps them land.",
  },
  noTokens: {
    icon: Coins,
    tone: "neutral" as StateTone,
    title: "No tokens yet",
    description:
      "When this wallet holds SPL tokens, they’ll show up here.",
  },
  noTransactions: {
    icon: Inbox,
    tone: "neutral" as StateTone,
    title: "No transactions yet",
    description: "This wallet’s activity will appear here once it starts moving.",
  },
  notConnected: {
    icon: Wallet,
    tone: "neutral" as StateTone,
    title: "Connect your wallet",
    description: "Connect a wallet to see your balances and activity.",
  },
} satisfies Record<string, Partial<StateScreenProps> & { title: string }>;
