"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions / insecure context) — leave state as-is.
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 border border-[#373a41] bg-[#13161b] px-3 py-1.5 text-[12px] font-semibold text-[#cecfd2] transition-colors duration-150 hover:bg-[#22262f] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 cursor-pointer"
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check aria-hidden className="size-3.5 text-emerald-400" />
          Copied
        </>
      ) : (
        <>
          <Copy aria-hidden className="size-3.5" />
          {label}
        </>
      )}
    </button>
  );
}
