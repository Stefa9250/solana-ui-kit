"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { registry, orderedRegistry, GROUP_ORDER } from "@/lib/registry";

// Same order as the sidebar; only categories that actually have components.
const CATEGORIES = [
  "All",
  ...GROUP_ORDER.filter((c) => registry.some((e) => e.category === c)),
];

export function ComponentsShowcase() {
  const [filter, setFilter] = useState("All");
  const items =
    filter === "All"
      ? orderedRegistry
      : orderedRegistry.filter((e) => e.category === filter);

  return (
    <section id="components" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
              The kit
            </p>
            <h2 className="text-balance text-[28px] font-semibold tracking-[-0.015em] text-[#f7f7f7] sm:text-[36px]">
              Eight components. The whole post-click flow.
            </h2>
            <p className="max-w-md text-[14px] leading-relaxed text-[#94969c]">
              Grouped by the moment they cover - transactions, inputs, connection,
              feedback.
            </p>
          </div>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`shrink-0 cursor-pointer rounded-lg border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
                  filter === c
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-[#22262f] text-[#94969c] hover:border-[#373a41] hover:text-[#f7f7f7]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((entry) => (
            <Link
              key={entry.slug}
              href={`/components/${entry.slug}`}
              className="sk-lift sk-glass group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-[#22262f] p-6 transition-colors hover:border-emerald-500/40 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#94969c]">
                  {entry.category}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 text-[#61656c] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400"
                />
              </div>
              <h3 className="text-[16px] font-semibold text-[#f7f7f7] transition-colors duration-200 group-hover:text-emerald-300">
                {entry.name}
              </h3>
              <p className="line-clamp-3 text-[13px] leading-relaxed text-[#94969c]">
                {entry.description}
              </p>
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-emerald-400 to-transparent transition-all duration-500 group-hover:w-full"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
