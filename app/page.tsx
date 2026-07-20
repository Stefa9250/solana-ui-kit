import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { registry } from "@/lib/registry";
import { GITHUB_URL } from "@/lib/site";
import { HeroPreview } from "@/components/docs/hero-preview";

export default function Home() {
  return (
    <main className="flex-1 flex justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-[720px] flex flex-col gap-16">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-emerald-400">
              Solana UI Kit
            </div>
            {GITHUB_URL && (
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-[#94969c] transition-colors duration-150 hover:text-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
              >
                GitHub {"↗"}
              </a>
            )}
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold leading-[1.1] tracking-[-0.01em] text-[#f7f7f7]">
            The missing UX layer
            <br />
            for Solana dApps.
          </h1>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-[#94969c]">
            Copy-paste React components for the moments most dApps get wrong:
            what happens after the user clicks. Transaction status, wallet
            connection — accessible, animated, dark-mode first. No package to
            install, no build step. Copy the file, own the code.
          </p>
          <div className="flex items-center gap-3 text-[13px] text-[#61656c]">
            <span>React + Tailwind + lucide-react</span>
            <span aria-hidden>·</span>
            <span>MIT licensed</span>
            <span aria-hidden>·</span>
            <span>Copy-paste, no install</span>
          </div>
        </header>

        <HeroPreview />

        <section className="flex flex-col gap-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
            Components
          </h2>
          <ul className="flex flex-col border-t border-[#22262f]">
            {registry.map((entry) => (
              <li key={entry.slug} className="border-b border-[#22262f]">
                <Link
                  href={`/components/${entry.slug}`}
                  className="group flex items-start justify-between gap-6 py-5 outline-none focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[15px] font-semibold text-[#f7f7f7] group-hover:text-emerald-300 transition-colors duration-150">
                      {entry.name}
                    </span>
                    <span className="max-w-[480px] text-[13px] leading-relaxed text-[#94969c]">
                      {entry.description}
                    </span>
                  </div>
                  <ArrowUpRight
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-[#61656c] transition-all duration-150 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex items-center justify-between border-t border-[#22262f] pt-6 text-[13px] text-[#61656c]">
          <span>Built for the Solana ecosystem.</span>
          <div className="flex items-center gap-4">
            {GITHUB_URL && (
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-150 hover:text-[#cecfd2]"
              >
                GitHub
              </a>
            )}
            <span>MIT</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
