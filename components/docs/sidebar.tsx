"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Search, Star } from "lucide-react";
import { registry, GROUP_ORDER, type RegistryEntry } from "@/lib/registry";
import { GITHUB_URL } from "@/lib/site";
import { formatStars } from "@/lib/github";
import { OPEN_SEARCH_EVENT } from "./command-palette";
import { Logo } from "./logo";

function buildGroups() {
  const known = new Set(GROUP_ORDER);
  const groups = GROUP_ORDER.map((cat) => ({
    cat,
    items: registry.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);
  const rest = registry.filter((e) => !known.has(e.category));
  if (rest.length) groups.push({ cat: "Components", items: rest });
  return groups;
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-5">
      {buildGroups().map((group) => (
        <div key={group.cat} className="flex flex-col gap-0.5">
          <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.07em] text-[#61656c]">
            {group.cat}
          </div>
          {group.items.map((entry: RegistryEntry) => {
            const active = pathname === `/components/${entry.slug}`;
            return (
              <Link
                key={entry.slug}
                href={`/components/${entry.slug}`}
                aria-current={active ? "page" : undefined}
                className={`block border-l-2 px-3 py-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:-outline-offset-2 ${
                  active
                    ? "border-emerald-400 bg-[#13161b] font-semibold text-[#f7f7f7]"
                    : "border-transparent text-[#94969c] hover:bg-[#13161b] hover:text-[#f7f7f7]"
                }`}
              >
                {entry.name}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      className="flex items-center gap-2.5 border border-[#22262f] bg-[#13161b] px-2.5 py-2 text-[12.5px] text-[#61656c] transition-colors duration-150 hover:border-[#373a41] hover:text-[#94969c] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
    >
      <Search aria-hidden className="size-3.5" />
      <span>Search…</span>
      <kbd className="ml-auto border border-[#373a41] px-1.5 py-0.5 font-mono text-[10px] text-[#61656c]">
        {"⌘K"}
      </kbd>
    </button>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 px-2 text-[14px] font-semibold tracking-[-0.01em] text-[#f7f7f7] outline-none focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
    >
      <Logo className="h-[18px] w-auto" />
      Signet
    </Link>
  );
}

function Footer({ stars }: { stars?: number | null }) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-[#22262f] px-2 pt-3.5 text-[12px] text-[#61656c]">
      {GITHUB_URL ? (
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[#94969c] transition-colors duration-150 hover:text-[#f7f7f7]"
        >
          <Star aria-hidden className="size-3.5" />
          {typeof stars === "number" ? (
            <span className="tabular-nums">{formatStars(stars)}</span>
          ) : (
            <span>GitHub</span>
          )}
        </a>
      ) : (
        <span />
      )}
      <span>MIT</span>
    </div>
  );
}

export function Sidebar({ stars }: { stars?: number | null }) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Collapse the mobile disclosure after navigating to a component.
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  return (
    <>
      {/* Mobile: a top bar with a disclosure holding the same grouped nav. */}
      <div className="border-b border-[#22262f] bg-[#090b0f] md:hidden">
        <details ref={detailsRef} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <Brand />
            <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-[#94969c] group-open:hidden">
              Menu +
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.05em] text-[#94969c] group-open:inline">
              Close −
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-[#22262f] px-4 pb-5 pt-4">
            <SearchTrigger />
            <NavList pathname={pathname} />
            <Footer stars={stars} />
          </div>
        </details>
      </div>

      {/* Desktop: fixed left sidebar. */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-[#22262f] bg-[#090b0f] px-4 pb-5 pt-6 md:flex">
        <Brand />
        <SearchTrigger />
        <NavList pathname={pathname} />
        <Footer stars={stars} />
      </aside>
    </>
  );
}
