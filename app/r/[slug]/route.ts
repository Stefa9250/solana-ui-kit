import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getEntry, registry } from "@/lib/registry";
import { guidance } from "@/lib/guidance";

/**
 * Component distribution endpoints:
 *   /r/<slug>.json  - a shadcn-compatible registry item, so
 *                     `npx shadcn@latest add <origin>/r/<slug>.json` works.
 *   /r/<slug>.md    - a plain-markdown doc (title, when-to-use, props, source)
 *                     for LLMs / agents and copy-paste-first developers.
 *   /r/<slug>       - same as .json.
 */

export function generateStaticParams() {
  return registry.flatMap((e) => [
    { slug: `${e.slug}.json` },
    { slug: `${e.slug}.md` },
  ]);
}

async function readSource(relPath: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(process.cwd(), relPath), "utf-8");
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const isMd = raw.endsWith(".md");
  const slug = raw.replace(/\.(json|md)$/, "");
  const entry = getEntry(slug);
  if (!entry) {
    return NextResponse.json({ error: "Component not found" }, { status: 404 });
  }

  const source = await readSource(entry.path);
  if (source === null) {
    // The component is registered but its file couldn't be read - a server
    // problem, not a missing route.
    return NextResponse.json(
      { error: "Component source could not be read" },
      { status: 500 },
    );
  }

  const target = entry.path.replace("components/kit/", "components/");

  if (isMd) {
    const g = guidance[slug] ?? {};
    const lines: string[] = [
      `# ${entry.name}`,
      "",
      entry.description,
      "",
    ];
    if (g.whenToUse?.length) {
      lines.push("## When to use", "");
      g.whenToUse.forEach((t) => lines.push(`- ${t}`));
      lines.push("");
    }
    if (entry.usage) {
      lines.push("## Usage", "", "```tsx", entry.usage, "```", "");
    }
    lines.push("## Props", "");
    entry.props.forEach((p) => {
      lines.push(
        `- \`${p.name}\`: \`${p.type}\`${p.default ? ` (default \`${p.default}\`)` : ""} - ${p.description}`,
      );
    });
    // Use a fence longer than any backtick run in the source so a component
    // that itself contains a code fence can't break the markdown.
    const longestRun = (source.match(/`+/g) ?? []).reduce(
      (m, r) => Math.max(m, r.length),
      0,
    );
    const fence = "`".repeat(Math.max(3, longestRun + 1));
    lines.push("", `## Source (${target})`, "", `${fence}tsx`, source, fence, "");
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: entry.slug,
    type: "registry:component",
    dependencies: ["lucide-react"],
    files: [
      {
        path: target,
        content: source,
        type: "registry:component",
        target,
      },
    ],
  };
  return NextResponse.json(item);
}
