"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { registry } from "@/lib/registry";
import { HeroPreview } from "./hero-preview";

const FIRST = registry[0]?.slug ?? "transaction-status";
const PHRASES = [
  "for Solana dApps",
  "for transaction status",
  "for wallet connection",
  "for signing trust",
];

/** Typewriter that cycles PHRASES. */
function useTypewriter() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = PHRASES[index];
    const done = text === target;
    const delay = deleting ? 40 : done ? 2200 : 70;
    const t = setTimeout(() => {
      if (!deleting && !done) {
        setText(target.slice(0, text.length + 1));
      } else if (!deleting && done) {
        setDeleting(true);
      } else if (deleting && text.length > 0) {
        setText(target.slice(0, text.length - 1));
      } else {
        setDeleting(false);
        setIndex((i) => (i + 1) % PHRASES.length);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, index]);

  return text;
}

export function LandingHero() {
  const typed = useTypewriter();

  return (
    <section className="relative px-5 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-40">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left — copy */}
          <div className="flex flex-col gap-7">
            <p className="sk-fade-up font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
              Solana UI Kit · the moments after the click
            </p>
            <h1 className="sk-fade-up sk-d1 text-[38px] font-semibold leading-[1.05] tracking-[-0.02em] text-[#f7f7f7] sm:text-[46px] lg:text-[54px]">
              <span className="block">The missing UX layer</span>
              {/* Every phrase is stacked invisibly in one grid cell, so the
                  line always reserves the tallest phrase's height at the current
                  width — the page never reflows as the text types in and out. */}
              <span className="grid">
                <span className="sr-only">for Solana dApps</span>
                {PHRASES.map((phrase) => (
                  <span
                    key={phrase}
                    aria-hidden
                    className="invisible col-start-1 row-start-1"
                  >
                    {phrase}
                  </span>
                ))}
                <span aria-hidden className="col-start-1 row-start-1">
                  <span className="sk-text-gradient">{typed}</span>
                  <span className="sk-caret" />
                </span>
              </span>
            </h1>
            <p className="sk-fade-up sk-d2 max-w-lg text-[15px] leading-relaxed text-[#94969c] sm:text-[16px]">
              Copy-paste React components for the seconds most dApps get wrong —
              transaction status, wallet connection, fee clarity, signing trust.
              Dark-mode first, accessible, animated. No package, no build step.
              Copy the file, own the code.
            </p>
            <div className="sk-fade-up sk-d3 flex flex-col gap-3 sm:flex-row">
              <a
                href="#components"
                className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-lg border border-emerald-500 bg-emerald-500/10 px-6 py-3.5 font-mono text-[13px] text-emerald-300 transition-colors duration-500 hover:text-[#06110d] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 active:scale-[0.98]"
              >
                <span className="relative z-10">explore components</span>
                <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-emerald-400 transition-transform duration-500 group-hover:translate-x-0"
                />
              </a>
              <Link
                href={`/components/${FIRST}`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-[#22262f] px-6 py-3.5 font-mono text-[13px] text-[#94969c] transition-colors duration-300 hover:border-[#373a41] hover:bg-[#13161b] hover:text-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 active:scale-[0.98]"
              >
                <span>read the docs</span>
                <span className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  →
                </span>
              </Link>
            </div>
            <div className="sk-fade-up sk-d4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-[#61656c]">
              <span>React + Tailwind + lucide-react</span>
              <span aria-hidden>·</span>
              <span>MIT</span>
            </div>
          </div>

          {/* Right — terminal card with the live component */}
          <div className="sk-scale-in sk-d3 relative">
            <div className="sk-glass sk-lift relative rounded-xl border border-[#22262f] p-4 pt-9">
              <div className="absolute left-4 top-3.5 flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-[#f97066]/70" />
                <span aria-hidden className="size-2.5 rounded-full bg-[#e8b562]/70" />
                <span aria-hidden className="size-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-[#0c0e12]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#61656c]">
                transaction-status.tsx
              </div>
              <div className="rounded-lg border border-[#22262f] bg-[#161b26] p-5">
                <HeroPreview />
              </div>
            </div>

            <div className="sk-float absolute -right-3 -top-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 font-mono text-[11px] text-emerald-300 backdrop-blur">
              v0.1.0
            </div>
            <div
              className="sk-float absolute -bottom-3 -left-3 rounded-lg border border-[#22262f] bg-[#13161b] px-3 py-1.5 font-mono text-[11px] text-[#94969c] backdrop-blur"
              style={{ animationDelay: "1s" }}
            >
              MIT licensed
            </div>

            <div
              aria-hidden
              className="absolute -z-10 left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.06] blur-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
