"use client";

import Link from "next/link";
import { GITHUB_URL } from "@/lib/site";
import { HeroPreview } from "./hero-preview";

export function LandingHero() {
  return (
    <section className="relative px-5 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-40">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left - copy */}
          <div className="flex flex-col gap-7">
            <h1 className="sk-fade-up sk-d1 text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.02em] text-[#f7f7f7] sm:text-[46px] lg:text-[54px]">
              Win the seconds after they click{" "}
              <span className="text-[#f7f7f7]">Sign.</span>
            </h1>
            <p className="sk-fade-up sk-d2 max-w-lg text-[15px] leading-relaxed text-[#94969c] sm:text-[16px]">
              Copy-paste React components for the part every Solana dApp fumbles
              - transaction status, signing review, wallet connect, fees, error
              states. Dark-mode first and accessible. No package. Copy the file,
              you own the code.
            </p>
            <div className="sk-fade-up sk-d3 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/components/transaction-review"
                className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-lg border border-emerald-500 bg-emerald-500/10 px-6 py-3.5 font-mono text-[13px] text-emerald-300 transition-colors duration-500 hover:text-[#06110d] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 active:scale-[0.98]"
              >
                <span className="relative z-10">copy your first component</span>
                <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-emerald-400 transition-transform duration-500 group-hover:translate-x-0"
                />
              </Link>
              {GITHUB_URL && (
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-[#22262f] px-6 py-3.5 font-mono text-[13px] text-[#94969c] transition-colors duration-300 hover:border-[#373a41] hover:bg-[#13161b] hover:text-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 active:scale-[0.98]"
                >
                  <span>star on GitHub</span>
                  <span className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    ↗
                  </span>
                </a>
              )}
            </div>
            <div className="sk-fade-up sk-d4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-[#94969c]">
              <span>MIT</span>
              <span aria-hidden>·</span>
              <span>React + Tailwind + lucide-react</span>
              <span aria-hidden>·</span>
              <span>Nothing to install</span>
            </div>
          </div>

          {/* Right - terminal card with the live component */}
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

            <div className="absolute -right-3 -top-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 font-mono text-[11px] text-emerald-300 backdrop-blur">
              you own the code
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
