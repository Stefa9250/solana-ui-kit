"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { GITHUB_URL } from "@/lib/site";
import { registry } from "@/lib/registry";
import { OPEN_SEARCH_EVENT } from "./command-palette";

const FIRST = registry[0]?.slug ?? "transaction-status";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-[#22262f]/70 bg-[#0c0e12]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/" className="font-mono text-[13px] tracking-tight text-[#f7f7f7]">
          solana
          <span className="sk-text-gradient font-semibold">kit</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="#components"
            className="hidden rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#94969c] transition-colors duration-200 hover:bg-[#13161b] hover:text-[#f7f7f7] sm:block"
          >
            Components
          </a>
          <Link
            href={`/components/${FIRST}`}
            className="hidden rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#94969c] transition-colors duration-200 hover:bg-[#13161b] hover:text-[#f7f7f7] sm:block"
          >
            Docs
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
            aria-label="Search components"
            className="flex size-9 items-center justify-center rounded-lg text-[#94969c] transition-colors duration-200 hover:bg-[#13161b] hover:text-[#f7f7f7]"
          >
            <Search className="size-4" />
          </button>
          {GITHUB_URL && (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[#22262f] bg-[#13161b] px-3 py-2 font-mono text-[12px] text-[#cecfd2] transition-colors duration-200 hover:border-[#373a41] hover:text-[#f7f7f7]"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
