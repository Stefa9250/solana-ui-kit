"use client";

import { demos } from "@/components/docs/demos";

/** Client boundary: resolves a slug to its live demo, with a placeholder fallback. */
export function DemoHost({ slug }: { slug: string }) {
  const Demo = demos[slug];
  if (!Demo) {
    return (
      <div className="border border-dashed border-[#333741] px-6 py-14 text-center text-[14px] text-[#61656c]">
        Live demo coming soon.
      </div>
    );
  }
  return <Demo />;
}
