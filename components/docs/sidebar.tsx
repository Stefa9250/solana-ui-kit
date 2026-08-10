"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { registry, type RegistryEntry } from "@/lib/registry";
import { GITHUB_URL } from "@/lib/site";

/** Group order for the sidebar; anything uncategorized falls into "Components". */
const GROUP_ORDER = ["Transactions", "Inputs", "Connection", "Feedback"];

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
                className={`flex items-center gap-2.5 border-l-2 px-2 py-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:-outline-offset-2 ${
                  active
                    ? "border-emerald-400 bg-[#13161b] font-semibold text-[#f7f7f7]"
                    : "border-transparent text-[#94969c] hover:bg-[#13161b] hover:text-[#f7f7f7]"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-[5px] shrink-0 rounded-full transition-colors duration-150 ${
                    active ? "bg-emerald-400" : "bg-[#373a41]"
                  }`}
                />
                {entry.name}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 px-2 outline-none focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
    >
      <span className="flex size-[26px] items-center justify-center bg-[#00543f] text-[15px] font-bold text-[#18e3a5] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25)]">
        ◇
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-[#f7f7f7]">
          Solana UI Kit
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#61656c]">
          {registry.length} components
        </span>
      </span>
    </Link>
  );
}

function Footer() {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-[#22262f] px-2 pt-3.5 text-[12px] text-[#61656c]">
      {GITHUB_URL ? (
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#94969c] transition-colors duration-150 hover:text-[#f7f7f7]"
        >
          GitHub {"↗"}
        </a>
      ) : (
        <span />
      )}
      <span>MIT</span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: a top bar with a disclosure holding the same grouped nav. */}
      <div className="border-b border-[#22262f] bg-[#090b0f] md:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <Brand />
            <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-[#94969c] group-open:hidden">
              Menu +
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.05em] text-[#94969c] group-open:inline">
              Close −
            </span>
          </summary>
          <div className="flex flex-col gap-5 border-t border-[#22262f] px-4 pb-5 pt-4">
            <NavList pathname={pathname} />
            <Footer />
          </div>
        </details>
      </div>

      {/* Desktop: fixed left sidebar. */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-[#22262f] bg-[#090b0f] px-4 pb-5 pt-6 md:flex">
        <Brand />
        <NavList pathname={pathname} />
        <Footer />
      </aside>
    </>
  );
}
