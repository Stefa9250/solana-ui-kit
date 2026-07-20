import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntry, registry } from "@/lib/registry";
import { CopyButton } from "@/components/docs/copy-button";
import { DemoHost } from "@/components/docs/demo-host";

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

  return (
    <main className="flex-1 flex justify-center px-6 py-16 sm:py-20">
      <div className="w-full max-w-[820px] flex flex-col gap-12">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#61656c] transition-colors duration-150 hover:text-[#cecfd2] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            All components
          </Link>
        </div>

        <header className="flex flex-col gap-3">
          <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-emerald-400">
            Solana UI Kit
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[#f7f7f7]">
            {entry.name}
          </h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-[#94969c]">
            {entry.description}
          </p>
        </header>

        <section className="flex flex-col gap-4" aria-label="Live demo">
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
          <section className="flex flex-col gap-4" aria-label="Usage">
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

        <section className="flex flex-col gap-4" aria-label="Props">
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

        <section className="flex flex-col gap-4" aria-label="Source code">
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
      </div>
    </main>
  );
}
