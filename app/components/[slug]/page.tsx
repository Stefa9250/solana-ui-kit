import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getEntry, registry, orderedRegistry } from "@/lib/registry";
import { guidance } from "@/lib/guidance";
import { SITE_URL, SITE_URL_IS_PLACEHOLDER } from "@/lib/site";
import { CopyButton } from "@/components/docs/copy-button";
import { DemoHost } from "@/components/docs/demo-host";
import { InstallTabs } from "@/components/docs/install-tabs";
import { OnThisPage, type RailItem } from "@/components/docs/on-this-page";

export const dynamicParams = false;

export function generateStaticParams() {
  return registry.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return {};
  const title = `${entry.name} · Signet`;
  return {
    title: entry.name, // the root template appends "· Signet"
    description: entry.description,
    openGraph: { title, description: entry.description },
    twitter: { title, description: entry.description },
  };
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  let source: string | null = null;
  try {
    source = await fs.readFile(path.join(process.cwd(), entry.path), "utf-8");
  } catch {
    source = null; // Component not implemented yet - show a placeholder.
  }

  const g = guidance[slug] ?? {};

  const railItems: RailItem[] = [
    { id: "demo", label: "Demo" },
    ...(g.whenToUse ? [{ id: "guidelines", label: "When to use" }] : []),
    ...(entry.usage ? [{ id: "usage", label: "Usage" }] : []),
    { id: "props", label: "Props" },
    ...(g.anatomy ? [{ id: "anatomy", label: "Anatomy" }] : []),
    ...(g.accessibility ? [{ id: "accessibility", label: "Accessibility" }] : []),
    { id: "source", label: "Source" },
  ];

  // Pager follows the sidebar's grouped order, not the raw registry order.
  const index = orderedRegistry.findIndex((e) => e.slug === slug);
  const prev = index > 0 ? orderedRegistry[index - 1] : null;
  const next =
    index < orderedRegistry.length - 1 ? orderedRegistry[index + 1] : null;

  return (
    <main className="mx-auto flex w-full max-w-[1060px] gap-10 px-6 py-12 sm:px-10 sm:py-14">
      <article className="flex min-w-0 flex-1 flex-col gap-12">
        <header className="flex flex-col gap-3">
          <div className="font-mono text-[11px] tracking-[0.03em] text-[#61656c]">
            <Link
              href="/"
              className="transition-colors duration-150 hover:text-[#cecfd2] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              Components
            </Link>
            <span className="px-1.5">/</span>
            <span className="text-[#cecfd2]">{entry.name}</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[#f7f7f7]">
            {entry.name}
          </h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-[#94969c]">
            {entry.description}
          </p>
        </header>

        <section
          id="demo"
          className="flex scroll-mt-24 flex-col gap-4"
          aria-label="Live demo"
        >
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
            Demo
          </h2>
          <DemoHost slug={entry.slug} />
          {entry.note && (
            <p className="border-l-2 border-emerald-600 bg-[#13161b] px-4 py-3 text-[13px] leading-relaxed text-[#94969c]">
              {entry.note}
            </p>
          )}
        </section>

        {g.whenToUse && (
          <section
            id="guidelines"
            className="flex scroll-mt-24 flex-col gap-4"
            aria-label="When to use"
          >
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
              When to use
            </h2>
            <ul className="flex flex-col gap-2.5">
              {g.whenToUse.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-[14px] leading-relaxed text-[#cecfd2]"
                >
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entry.usage && (
          <section
            id="usage"
            className="flex scroll-mt-24 flex-col gap-4"
            aria-label="Usage"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
                Usage
              </h2>
              <CopyButton text={entry.usage} label="Copy" />
            </div>
            <pre className="overflow-x-auto border border-[#22262f] bg-[#0a0c10] p-4 font-mono text-[12.5px] leading-relaxed text-[#cecfd2]">
              <code>{entry.usage}</code>
            </pre>
          </section>
        )}

        <section
          id="props"
          className="flex scroll-mt-24 flex-col gap-4"
          aria-label="Props"
        >
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
            Props
          </h2>
          <div className="overflow-x-auto border border-[#22262f]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#22262f] bg-[#13161b]">
                  <th className="px-4 py-2.5 font-semibold text-[#cecfd2]">Prop</th>
                  <th className="px-4 py-2.5 font-semibold text-[#cecfd2]">Type</th>
                  <th className="px-4 py-2.5 font-semibold text-[#cecfd2]">Default</th>
                  <th className="px-4 py-2.5 font-semibold text-[#cecfd2]">Description</th>
                </tr>
              </thead>
              <tbody>
                {entry.props.map((prop) => (
                  <tr
                    key={prop.name}
                    className="border-b border-[#22262f] last:border-b-0 align-top"
                  >
                    <td className="px-4 py-3 font-mono text-emerald-300 whitespace-nowrap">
                      {prop.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#94969c]">
                      {prop.type}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#61656c] whitespace-nowrap">
                      {prop.default ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-[#94969c] leading-relaxed min-w-[200px]">
                      {prop.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {g.anatomy && (
          <section
            id="anatomy"
            className="flex scroll-mt-24 flex-col gap-4"
            aria-label="Anatomy"
          >
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
              Anatomy
            </h2>
            <dl className="divide-y divide-[#22262f] border border-[#22262f]">
              {g.anatomy.map((part) => (
                <div
                  key={part.name}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-5"
                >
                  <dt className="shrink-0 font-mono text-[12.5px] text-emerald-300 sm:w-40">
                    {part.name}
                  </dt>
                  <dd className="text-[13px] leading-relaxed text-[#94969c]">
                    {part.note}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {g.accessibility && (
          <section
            id="accessibility"
            className="flex scroll-mt-24 flex-col gap-4"
            aria-label="Accessibility"
          >
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
              Accessibility
            </h2>
            <ul className="flex flex-col gap-2.5">
              {g.accessibility.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-[13.5px] leading-relaxed text-[#94969c]"
                >
                  <span
                    aria-hidden
                    className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#373a41]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          id="source"
          className="flex scroll-mt-24 flex-col gap-4"
          aria-label="Source code"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#61656c]">
              Source
            </h2>
            {source && <CopyButton text={source} label="Copy source" />}
          </div>
          {source ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-[#94969c]">
                    Install with the shadcn CLI:
                  </p>
                  <a
                    href={`https://v0.dev/chat/api/open?url=${encodeURIComponent(
                      `${SITE_URL}/r/${entry.slug}.json`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-mono text-[12px] text-[#94969c] transition-colors duration-150 hover:text-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                  >
                    Open in v0 {"↗"}
                  </a>
                </div>
                <InstallTabs url={`${SITE_URL}/r/${entry.slug}.json`} />
                {SITE_URL_IS_PLACEHOLDER && (
                  <p className="text-[12px] leading-relaxed text-[#94969c]">
                    Set{" "}
                    <code className="font-mono text-[11px] text-[#cecfd2]">
                      NEXT_PUBLIC_SITE_URL
                    </code>{" "}
                    to your deployment origin for a working install command - the
                    URL above is a local placeholder.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-[#94969c]">
                  Or copy the file into{" "}
                  <code className="font-mono text-[12px] text-[#cecfd2]">
                    {entry.path.replace("components/kit/", "components/")}
                  </code>{" "}
                  yourself. Requires Tailwind and{" "}
                  <code className="font-mono text-[12px] text-[#cecfd2]">lucide-react</code>.
                </p>
                <pre className="max-h-[480px] overflow-auto border border-[#22262f] bg-[#0a0c10] p-4 font-mono text-[12.5px] leading-relaxed text-[#cecfd2]">
                  <code>{source}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#333741] px-6 py-10 text-center text-[14px] text-[#61656c]">
              Source coming soon.
            </div>
          )}
        </section>

        <nav
          aria-label="Component pagination"
          className="grid grid-cols-2 gap-3 border-t border-[#22262f] pt-8"
        >
          {prev ? (
            <Link
              href={`/components/${prev.slug}`}
              className="group flex flex-col gap-1 border border-[#22262f] bg-[#0f1319] px-4 py-3 transition-colors duration-150 hover:border-[#373a41] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              <span className="font-mono text-[11px] text-[#61656c]">← Previous</span>
              <span className="text-[13px] font-semibold text-[#cecfd2] group-hover:text-[#f7f7f7]">
                {prev.name}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/components/${next.slug}`}
              className="group flex flex-col items-end gap-1 border border-[#22262f] bg-[#0f1319] px-4 py-3 text-right transition-colors duration-150 hover:border-[#373a41] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              <span className="font-mono text-[11px] text-[#61656c]">Next →</span>
              <span className="text-[13px] font-semibold text-[#cecfd2] group-hover:text-[#f7f7f7]">
                {next.name}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <OnThisPage items={railItems} />
    </main>
  );
}
