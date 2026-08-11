import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { registry } from "@/lib/registry";
import { GITHUB_URL } from "@/lib/site";
import { LandingHeader } from "@/components/docs/landing-header";
import { LandingHero } from "@/components/docs/landing-hero";
import { ComponentsShowcase } from "@/components/docs/components-showcase";

const FIRST = registry[0]?.slug ?? "transaction-status";

export default function Home() {
  return (
    <main className="sk-scanlines relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10">
        <LandingHeader />
        <LandingHero />
        <ComponentsShowcase />

        <footer className="border-t border-[#22262f]/50 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <div className="flex flex-col gap-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                Get started
              </p>
              <h2 className="max-w-xl text-balance text-[30px] font-semibold leading-tight tracking-[-0.015em] text-[#f7f7f7] sm:text-[40px]">
                Own the code.{" "}
                <span className="sk-text-gradient">No install treadmill.</span>
              </h2>
              <p className="max-w-lg text-[15px] leading-relaxed text-[#94969c]">
                Copy a file, or pull it with the shadcn CLI. Either way it lives in
                your repo — retheme it, fork it, keep it.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/components/${FIRST}`}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-emerald-500 bg-emerald-500/10 px-6 py-3.5 font-mono text-[13px] text-emerald-300 transition-colors duration-300 hover:bg-emerald-500/20 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 active:scale-[0.98]"
                >
                  <span>browse components</span>
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                {GITHUB_URL && (
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-[#22262f] px-6 py-3.5 font-mono text-[13px] text-[#94969c] transition-colors duration-300 hover:border-[#373a41] hover:text-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                  >
                    <Star className="size-4" />
                    <span>star on GitHub</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 border-t border-[#22262f]/50 pt-8 font-mono text-[12px] text-[#94969c] sm:flex-row sm:items-center">
              <span>copy-paste · no install</span>
              <span>Built for the Solana ecosystem · MIT</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
