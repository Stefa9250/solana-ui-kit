"use client";

/**
 * StateScreen - Solana UI Kit
 *
 * The screens nobody designs: RPC down, rate-limited, wrong network, no
 * tokens, no transactions, wallet not connected. One calm centered layout -
 * icon, title, a line of plain-language explanation, a way forward, and (for
 * errors) an expandable technical detail - with four restrained tones.
 * Even the error tone is a muted coral, never an alarm-red full-bleed.
 *
 * Congestion is deliberately NOT a preset here: the kit models a busy network
 * as an inline banner (see FeeExplainer's `congested`), not a full-screen
 * dead-end. Reach for this component when there's genuinely nothing else to
 * show or a hard stop to recover from.
 *
 * Ships presets (STATE_PRESETS) with the copy already written; pass handlers.
 *
 * Self-contained: copy this file into your project.
 * Dependencies: React, Tailwind CSS, lucide-react.
 *
 * Theming: every color is a CSS variable with the kit's dark default inlined
 * as fallback (e.g. var(--sk-surface,#161b26)). Define --sk-* on any ancestor
 * to retheme without touching this file.
 *
 * <StateScreen
 *   {...STATE_PRESETS.rpcDown}
 *   action={{ label: "Try again", onClick: refetch, busyLabel: "Retrying…" }}
 *   secondaryAction={{ label: "Network status", href: "https://status.solana.com" }}
 *   busy={retrying}
 *   errorDetail={err?.message}
 * />
 */

import {
  createElement,
  isValidElement,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Coins,
  Inbox,
  Network,
  RefreshCw,
  ServerCrash,
  Timer,
  Wallet,
} from "lucide-react";

export type StateTone = "neutral" | "brand" | "warning" | "error";

export interface StateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  /** Label while `busy` - defaults to the normal label (never "Retrying…"). */
  busyLabel?: string;
  /** Force same-tab / new-tab. Defaults to new tab for external URLs only. */
  newTab?: boolean;
}

export interface StateScreenProps {
  /** A lucide icon component, or any node for full control. */
  icon?: ComponentType<{ className?: string }> | ReactNode;
  title: string;
  description?: string;
  tone?: StateTone;
  /** Primary way forward. Rendered as a button, or a link if `href` is set. */
  action?: StateAction;
  /** Quieter secondary option. */
  secondaryAction?: StateAction;
  /** Spinner on the primary action; disables it while in flight. */
  busy?: boolean;
  /** Error tone only: raw error behind a collapsible "technical details". */
  errorDetail?: string;
  /** Heading level for the title (default 2). Set to fit your page hierarchy. */
  headingLevel?: 1 | 2 | 3 | 4;
  /** Move focus to the primary action on mount - for post-error screens. */
  autoFocusAction?: boolean;
  /** Tighter vertical padding for use inside a card rather than a page. */
  compact?: boolean;
  className?: string;
}

const TONE: Record<StateTone, { iconBg: string; iconColor: string }> = {
  neutral: {
    iconBg: "var(--sk-raised,#1f242f)",
    iconColor: "var(--sk-text-tertiary,#94969c)",
  },
  brand: {
    iconBg: "var(--sk-btn,#00543f)",
    iconColor: "var(--sk-btn-text,#18e3a5)",
  },
  warning: {
    iconBg: "var(--sk-warning-bg,rgba(232,181,98,0.14))",
    iconColor: "var(--sk-warning,#e8b562)",
  },
  error: {
    iconBg: "var(--sk-danger-bg,rgba(240,68,56,0.12))",
    iconColor: "var(--sk-danger,#f97066)",
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
 * The wrapper carries aria-hidden, so a raw element is SR-silent too.
 */
function renderIcon(icon: StateScreenProps["icon"]): ReactNode {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  return createElement(icon as ComponentType<{ className?: string }>, {
    className: "size-6",
  });
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

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
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2 active:scale-[0.97]";

  const pending = !!busy && primary;
  const label = pending ? (action.busyLabel ?? action.label) : action.label;
  const external = !!action.href && isExternal(action.href);
  const newTab = action.newTab ?? external;

  const inner = (
    <>
      {pending && <RefreshCw aria-hidden className="sol-state-spin size-3.5" />}
      {label}
      {/* External-link affordance, matching the rest of the kit. */}
      {action.href && external && !pending && (
        <span aria-hidden className="text-[0.9em]">
          {"↗"}
        </span>
      )}
    </>
  );

  // A link stays a link even while pending - it never silently becomes a
  // disabled button. onClick fires alongside navigation for tracking.
  if (action.href) {
    return (
      <a
        href={action.href}
        onClick={(e) => {
          if (pending) {
            e.preventDefault();
            return;
          }
          action.onClick?.();
        }}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        aria-disabled={pending || undefined}
        className={`${shared} ${cls} ${pending ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${shared} ${cls} cursor-pointer disabled:pointer-events-none disabled:opacity-70`}
    >
      {inner}
    </button>
  );
}

/** Only interactive if it can actually do something. */
function usableAction(a: StateAction | undefined): a is StateAction {
  return !!a && (!!a.onClick || !!a.href);
}

export function StateScreen({
  icon,
  title,
  description,
  tone = "neutral",
  action,
  secondaryAction,
  busy = false,
  errorDetail,
  headingLevel = 2,
  autoFocusAction = false,
  compact = false,
  className,
}: StateScreenProps) {
  useKitStyles(STYLE_ID, KEYFRAMES);
  const [detailOpen, setDetailOpen] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  const t = TONE[tone];
  const iconNode = renderIcon(icon);
  const primary = usableAction(action) ? action : undefined;
  const secondary = usableAction(secondaryAction) ? secondaryAction : undefined;

  // A separate polite region (matching every sibling), announced on change of
  // title/tone. Errors stay polite - the full-screen visual carries urgency.
  const announcement = [tone === "error" ? "Error." : "", title, description]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (autoFocusAction) {
      actionRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    }
  }, [autoFocusAction]);

  const heading = createElement(
    `h${headingLevel}`,
    {
      className:
        "text-[15px] font-semibold text-[var(--sk-text,#f7f7f7)]",
    },
    title,
  );

  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "px-6 py-8" : "px-6 py-16"
      } ${className ?? ""}`}
    >
      {/* Keyed so switching states actually replays the entrance animation. */}
      <div
        key={`${title}|${tone}`}
        className="sol-state-in flex flex-col items-center"
      >
        {iconNode && (
          <span
            aria-hidden
            className="mb-4 flex size-12 items-center justify-center rounded-full"
            style={{ background: t.iconBg, color: t.iconColor }}
          >
            {iconNode}
          </span>
        )}

        {title && heading}

        {description && (
          <p className="mt-1.5 max-w-[340px] text-[13px] leading-relaxed text-[var(--sk-text-tertiary,#94969c)]">
            {description}
          </p>
        )}

        {tone === "error" && errorDetail && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setDetailOpen((v) => !v)}
              aria-expanded={detailOpen}
              className="cursor-pointer text-[12px] text-[var(--sk-text-quaternary,#61656c)] underline underline-offset-2 transition-colors duration-150 hover:text-[var(--sk-text-secondary,#cecfd2)] focus-visible:outline-2 focus-visible:outline-[var(--sk-accent,#34d399)] focus-visible:outline-offset-2"
            >
              {detailOpen ? "Hide technical details" : "Show technical details"}
            </button>
            {detailOpen && (
              <pre className="mt-2 max-w-[380px] overflow-x-auto border border-[var(--sk-border,#22262f)] bg-[var(--sk-bg,#0c0e12)] px-3 py-2.5 text-left font-mono text-[12px] text-[var(--sk-text-tertiary,#94969c)]">
                {errorDetail}
              </pre>
            )}
          </div>
        )}

        {(primary || secondary) && (
          <div
            ref={actionRef}
            className="mt-5 flex flex-wrap items-center justify-center gap-2.5"
          >
            {primary && <ActionButton action={primary} primary busy={busy} />}
            {secondary && (
              <ActionButton action={secondary} primary={false} />
            )}
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Presets - the common Solana states, with copy written for end users (not
 * developer advice). Spread one and add your handlers:
 *   <StateScreen {...STATE_PRESETS.noTokens} action={{ label: "Receive", onClick }} />
 * ------------------------------------------------------------------ */

export const STATE_PRESETS = {
  rpcDown: {
    icon: ServerCrash,
    tone: "error" as StateTone,
    title: "Can’t reach Solana",
    description:
      "We couldn’t load data from the network. This is usually temporary - try again in a moment.",
  },
  rateLimited: {
    icon: Timer,
    tone: "warning" as StateTone,
    title: "Slowing down",
    description:
      "The network is briefly limiting requests. This clears on its own - retrying shortly.",
  },
  wrongNetwork: {
    icon: Network,
    tone: "error" as StateTone,
    title: "Wrong network",
    description:
      "Your wallet is on a different cluster than this app. Switch networks to continue.",
  },
  noTokens: {
    icon: Coins,
    tone: "neutral" as StateTone,
    title: "No tokens yet",
    description: "When this wallet holds SPL tokens, they’ll show up here.",
  },
  noTransactions: {
    icon: Inbox,
    tone: "neutral" as StateTone,
    title: "No transactions yet",
    description: "This wallet’s activity will appear here once it starts moving.",
  },
  notConnected: {
    icon: Wallet,
    // Inviting, not an error - this is the conversion moment.
    tone: "brand" as StateTone,
    title: "Connect your wallet",
    description: "Connect a wallet to see your balances and activity.",
  },
} satisfies Record<string, Partial<StateScreenProps> & { title: string }>;
