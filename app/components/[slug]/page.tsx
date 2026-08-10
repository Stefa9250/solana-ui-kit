import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry, registry } from "@/lib/registry";
import { CopyButton } from "@/components/docs/copy-button";
import { DemoHost } from "@/components/docs/demo-host";
import { OnThisPage, type RailItem } from "@/components/docs/on-this-page";

export function generateStaticParams() {
  return registry.map((entry) => ({ slug: entry.slug }));
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
    source = null; // Component not implemented yet — show a placeholder.
  }

  const railItems: RailItem[] = [
    { id: "demo", label: "Demo" },
    ...(entry.usage ? [{ id: "usage", label: "Usage" }] : []),
    { id: "props", label: "Props" },
    { id: "source", label: "Source" },
  ];

  const index = registry.findIndex((e) => e.slug === slug);
  const prev = index > 0 ? registry[index - 1] : null;
  const next = index < registry.length - 1 ? registry[index + 1] : null;

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
                      {prop.default ?? "—"}
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
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-[#94969c]">
                Copy into{" "}
                <code className="font-mono text-[12px] text-[#cecfd2]">
                  {entry.path.replace("components/kit/", "components/")}
                </code>{" "}
                in your project. Requires Tailwind and{" "}
                <code className="font-mono text-[12px] text-[#cecfd2]">lucide-react</code>.
              </p>
              <pre className="max-h-[480px] overflow-auto border border-[#22262f] bg-[#0a0c10] p-4 font-mono text-[12.5px] leading-relaxed text-[#cecfd2]">
                <code>{source}</code>
              </pre>
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
