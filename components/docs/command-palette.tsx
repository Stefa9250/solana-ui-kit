"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { registry } from "@/lib/registry";

/** Fired by the sidebar search trigger to open the palette. */
export const OPEN_SEARCH_EVENT = "sk-open-search";

type Result = { slug: string; name: string; category: string; description: string };

/** SSR-safe "am I on the client" — the portal can't render on the server. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function CommandPalette() {
  const router = useRouter();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Global ⌘K / Ctrl+K toggle, and the sidebar trigger event. Opening resets
  // the query and selection so the palette is always fresh. Re-binds on `open`
  // so the toggle always sees the current state.
  useEffect(() => {
    const openFresh = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else openFresh();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, openFresh);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, openFresh);
    };
  }, [open]);

  // Focus the input and lock body scroll while open; restore focus to whatever
  // opened the palette (the trigger) on close.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const items = registry.map((e) => ({
      slug: e.slug,
      name: e.name,
      category: e.category,
      description: e.description,
    }));
    if (!q) return items;
    return items.filter((e) =>
      `${e.name} ${e.category} ${e.description}`.toLowerCase().includes(q),
    );
  }, [query]);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/components/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Trap focus within the panel (input + result rows).
      const focusables = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>("input, button") ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  // Scroll the active row into view (DOM only).
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search components"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="sol-cmdk-backdrop absolute inset-0 bg-black/60 backdrop-blur-[3px]"
      />
      <div
        ref={panelRef}
        className="sol-cmdk-panel relative w-full max-w-[560px] overflow-hidden border border-[#22262f] bg-[#0f1319] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3 border-b border-[#22262f] px-4">
          <Search aria-hidden className="size-4 shrink-0 text-[#61656c]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search components…"
            className="w-full bg-transparent py-3.5 text-[14px] text-[#f7f7f7] outline-none placeholder:text-[#61656c]"
            aria-label="Search components"
          />
          <kbd className="hidden shrink-0 border border-[#373a41] px-1.5 py-0.5 font-mono text-[10px] text-[#61656c] sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] text-[#61656c]">
              No components match “{query}”.
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.slug}
                type="button"
                data-idx={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(r.slug)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors duration-100 ${
                  i === active ? "bg-[#13161b]" : "bg-transparent"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-8 w-0.5 shrink-0 ${
                    i === active ? "bg-emerald-400" : "bg-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#f7f7f7]">
                    {r.name}
                  </span>
                  <span className="block truncate text-[12px] text-[#94969c]">
                    {r.description}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.05em] text-[#61656c]">
                  {r.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
