"use client";

import { useEffect, useState } from "react";

export type RailItem = { id: string; label: string };

/** Right-hand anchor rail with scroll-spy. Shown only on wide (xl) screens. */
export function OnThisPage({ items }: { items: RailItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[188px] shrink-0 flex-col gap-2.5 py-14 pl-8 xl:flex">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.07em] text-[#61656c]">
        On this page
      </div>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`-ml-3 border-l-2 py-0.5 pl-3 text-[12.5px] outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:-outline-offset-2 ${
            active === item.id
              ? "border-emerald-400 text-[#f7f7f7]"
              : "border-transparent text-[#94969c] hover:text-[#f7f7f7]"
          }`}
        >
          {item.label}
        </a>
      ))}
    </aside>
  );
}
