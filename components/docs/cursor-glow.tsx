"use client";

import { useCallback, useEffect, useState } from "react";

/** An ambient glow that follows the cursor. Desktop only; skipped on touch. */
export function CursorGlow() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  const [visible, setVisible] = useState(false);

  const onMove = useCallback((e: MouseEvent) => {
    requestAnimationFrame(() => setPos({ x: e.clientX, y: e.clientY }));
    setVisible(true);
  }, []);

  useEffect(() => {
    const onLeave = () => setVisible(false);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.body.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.removeEventListener("mouseleave", onLeave);
    };
  }, [onMove]);

  return (
    <div
      aria-hidden
      className="sk-cursor-glow hidden lg:block"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    />
  );
}
