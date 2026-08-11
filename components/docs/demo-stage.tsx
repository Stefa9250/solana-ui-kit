"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { CopyButton } from "./copy-button";

/**
 * A complete light mapping of the kit's --sk-* tokens. Dark is the default
 * (each component inlines dark hex fallbacks), so we only override for light.
 */
const LIGHT_THEME: CSSProperties = {
  "--sk-bg": "#f3f5f8",
  "--sk-surface": "#ffffff",
  "--sk-card": "#f8f9fb",
  "--sk-raised": "#eceff3",
  "--sk-skeleton": "#e4e7ec",
  "--sk-fill": "#c7ccd4",
  "--sk-border": "#e3e6ea",
  "--sk-border-strong": "#cdd3db",
  "--sk-btn": "#059669",
  "--sk-btn-text": "#ffffff",
  "--sk-btn-hover": "#047857",
  "--sk-accent": "#059669",
  "--sk-accent-deep": "#047857",
  "--sk-accent-soft": "#10b981",
  "--sk-success": "#16a34a",
  "--sk-danger": "#dc2626",
  "--sk-danger-bg": "rgba(220,38,38,0.08)",
  "--sk-warning": "#b45309",
  "--sk-warning-bg": "rgba(180,83,9,0.10)",
  "--sk-warning-border": "#d6a94a",
  "--sk-text": "#0f1319",
  "--sk-text-secondary": "#3b4149",
  "--sk-text-tertiary": "#606a76",
  "--sk-text-quaternary": "#95a0ac",
} as CSSProperties;

function IconToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex size-7 cursor-pointer items-center justify-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
        active ? "bg-[#13161b] text-[#f7f7f7]" : "text-[#61656c] hover:text-[#cecfd2]"
      }`}
    >
      {children}
    </button>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.05em] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
        active ? "text-[#f7f7f7]" : "text-[#61656c] hover:text-[#cecfd2]"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The preview "stage": a toolbar above a framed, themeable canvas.
 * Preview view carries light/dark + desktop/mobile toggles; when a `code`
 * string is passed, a Code tab shows the snippet that reflects the demo's
 * current scenario (live sync). `contentClassName` carries each demo's own
 * layout; `padded` toggles the default inner padding for full-bleed demos.
 */
export function DemoStage({
  children,
  contentClassName = "",
  padded = true,
  code,
  portal = false,
}: {
  children: ReactNode;
  contentClassName?: string;
  padded?: boolean;
  code?: string;
  /** Set when the demo renders into a portal (e.g. a modal on document.body),
   *  so the light theme is applied to <body> too, not just the framed canvas. */
  portal?: boolean;
}) {
  const [light, setLight] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const showCode = code !== undefined && view === "code";

  // Portaled demos escape the stage's DOM subtree; mirror the light tokens onto
  // <body> so the portaled surface themes with the toggle.
  useEffect(() => {
    if (!portal || !light) return;
    const body = document.body;
    const entries = Object.entries(LIGHT_THEME) as [string, string][];
    entries.forEach(([k, v]) => body.style.setProperty(k, v));
    return () => entries.forEach(([k]) => body.style.removeProperty(k));
  }, [portal, light]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 border border-b-0 border-[#22262f] bg-[#0f1319] px-2 py-1.5">
        {code !== undefined ? (
          <div className="flex items-center">
            <Tab active={view === "preview"} onClick={() => setView("preview")}>
              Preview
            </Tab>
            <Tab active={view === "code"} onClick={() => setView("code")}>
              Code
            </Tab>
          </div>
        ) : (
          <span className="pl-1 font-mono text-[10px] uppercase tracking-[0.05em] text-[#61656c]">
            Preview
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {showCode ? (
            <CopyButton text={code} label="Copy" />
          ) : (
            <>
              <IconToggle
                active={light}
                onClick={() => setLight((v) => !v)}
                title={light ? "Switch to dark" : "Switch to light"}
              >
                {light ? (
                  <Sun aria-hidden className="size-3.5" />
                ) : (
                  <Moon aria-hidden className="size-3.5" />
                )}
              </IconToggle>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-[#22262f]" />
              <IconToggle active={!mobile} onClick={() => setMobile(false)} title="Desktop width">
                <Monitor aria-hidden className="size-3.5" />
              </IconToggle>
              <IconToggle active={mobile} onClick={() => setMobile(true)} title="Mobile width">
                <Smartphone aria-hidden className="size-3.5" />
              </IconToggle>
            </>
          )}
        </div>
      </div>

      {showCode ? (
        <pre className="max-h-[420px] overflow-auto border border-[#22262f] bg-[#0a0c10] p-4 font-mono text-[12.5px] leading-relaxed text-[#cecfd2]">
          <code>{code}</code>
        </pre>
      ) : (
        <div
          className={`border border-[var(--sk-border,#22262f)] ${padded ? "p-6" : ""}`}
          style={{ background: "var(--sk-bg,#0c0e12)", ...(light ? LIGHT_THEME : {}) }}
        >
          <div className={`mx-auto w-full ${mobile ? "max-w-[390px]" : ""}`}>
            <div className={contentClassName}>{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
