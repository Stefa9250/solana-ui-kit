import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { registry } from "@/lib/registry";
import { GITHUB_URL, SITE_URL } from "@/lib/site";
import { CopyButton } from "@/components/docs/copy-button";
import { LandingHeader } from "@/components/docs/landing-header";
import { LandingHero } from "@/components/docs/landing-hero";
import { ComponentsShowcase } from "@/components/docs/components-showcase";
import { XIcon, TelegramIcon } from "@/components/docs/social-icons";

const FIRST = registry[0]?.slug ?? "transaction-status";
const INSTALL_CMD = `npx shadcn@latest add ${SITE_URL}/r/transaction-review.json`;

// Real component behaviours, surfaced as proof of rigor (see lib/registry notes).
const PROOF = [
  {
    title: "MAX reserves rent",
    body: "MAX leaves enough SOL for rent and fees instead of emptying the wallet.",
  },
  {
    title: "Amounts stay exact",
    body: "Token values keep full precision - no bits lost above 2^53, ever.",
  },
  {
    title: "Poisoning is flagged",
    body: "Look-alike addresses from address-poisoning scams get flagged, not trusted.",
  },
  {
    title: "Safe by default",
    body: "A high-risk transaction makes Reject prominent and gates “Sign anyway” behind a check.",
  },
];

export default function Home() {
  return (
    <main className="sk-scanlines relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10">
        <LandingHeader />
        <LandingHero />

        {/* The wedge: what wallet kits leave you to build. */}
        <section className="px-5 sm:px-8">
          <div className="mx-auto max-w-6xl border-y border-[#22262f]/60 py-8">
            <p className="max-w-3xl text-[15px] leading-relaxed text-[#cecfd2] sm:text-[16px]">
              <span className="font-medium text-[#f7f7f7]">
                Wallet kits get you connected.
              </span>{" "}
              Then you&apos;re on your own - building transaction status, signing
              previews, fee explainers, and error states from scratch. This is
              that layer.
            </p>
          </div>
        </section>

        <ComponentsShowcase />

        {/* Proof of rigor - the defaults are the selling point. */}
        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                Built at the edges
              </p>
              <h2 className="text-[26px] font-semibold tracking-[-0.015em] text-[#f7f7f7] sm:text-[32px]">
                The defaults are the point.
              </h2>
              <p className="max-w-lg text-[14px] leading-relaxed text-[#94969c]">
                The small stuff that protects the users.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PROOF.map((p) => (
                <div
                  key={p.title}
                  className="flex flex-col gap-2 border-l-2 border-emerald-500/40 pl-4"
                >
                  <div className="text-[14px] font-semibold text-[#f7f7f7]">
                    {p.title}
                  </div>
                  <div className="text-[13px] leading-relaxed text-[#94969c]">
                    {p.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-[#22262f]/50 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <div className="flex flex-col gap-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                Get started
              </p>
              <h2 className="max-w-xl text-balance text-[30px] font-semibold leading-tight tracking-[-0.015em] text-[#f7f7f7] sm:text-[40px]">
                Own the code.{" "}
                <span className="text-[#f7f7f7]">No install treadmill.</span>
              </h2>
              <p className="max-w-lg text-[15px] leading-relaxed text-[#94969c]">
                Copy a file, or pull it with the shadcn CLI. Either way it lands in
                your repo and it&apos;s yours to retheme or fork.
              </p>

              <div className="flex max-w-xl items-center gap-3 rounded-lg border border-[#22262f] bg-[#0a0c10] px-4 py-3">
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <code className="whitespace-nowrap font-mono text-[12.5px] text-[#cecfd2]">
                    {INSTALL_CMD}
                  </code>
                </div>
                <span className="shrink-0">
                  <CopyButton text={INSTALL_CMD} label="Copy" />
                </span>
              </div>

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

              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-[#94969c]">
                <span>Got feedback or hit a rough edge? Find me on</span>
                <a
                  href="https://x.com/pixelpapi92"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#cecfd2] underline-offset-4 transition-colors hover:text-[#f7f7f7] hover:underline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                >
                  <XIcon className="size-3.5" />
                  @pixelpapi92
                </a>
                <span aria-hidden className="text-[#373a41]">
                  ·
                </span>
                <a
                  href="https://t.me/pixelpapi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#cecfd2] underline-offset-4 transition-colors hover:text-[#f7f7f7] hover:underline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                >
                  <TelegramIcon className="size-3.5" />
                  Telegram
                </a>
              </p>
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
