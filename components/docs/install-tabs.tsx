"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";

const MANAGERS = [
  { id: "pnpm", label: "pnpm", cmd: (u: string) => `pnpm dlx shadcn@latest add ${u}` },
  { id: "npm", label: "npm", cmd: (u: string) => `npx shadcn@latest add ${u}` },
  { id: "yarn", label: "yarn", cmd: (u: string) => `npx shadcn@latest add ${u}` },
  { id: "bun", label: "bun", cmd: (u: string) => `bunx --bun shadcn@latest add ${u}` },
] as const;

/** Package-manager tabs for the shadcn `add` install command. */
export function InstallTabs({ url }: { url: string }) {
  const [pm, setPm] = useState<(typeof MANAGERS)[number]["id"]>("pnpm");
  const command = MANAGERS.find((m) => m.id === pm)!.cmd(url);

  return (
    <div className="border border-[#22262f] bg-[#0a0c10]">
      <div className="flex items-center gap-1 border-b border-[#22262f] px-2 py-1.5">
        {MANAGERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPm(m.id)}
            aria-pressed={pm === m.id}
            className={`cursor-pointer px-2.5 py-1 font-mono text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
              pm === m.id
                ? "text-[#f7f7f7]"
                : "text-[#61656c] hover:text-[#cecfd2]"
            }`}
          >
            {m.label}
          </button>
        ))}
        <div className="ml-auto">
          <CopyButton text={command} label="Copy" />
        </div>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-[#cecfd2]">
        <code>{command}</code>
      </pre>
    </div>
  );
}
