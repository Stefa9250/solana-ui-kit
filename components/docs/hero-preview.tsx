"use client";

/**
 * Landing-page hero: the real TransactionStatus component looping
 * pending → confirming → confirmed, so the kit's motion sells itself.
 */

import { useEffect, useRef, useState } from "react";
import {
  TransactionStatus,
  type TransactionStatusState,
} from "@/components/kit/transaction-status/transaction-status";

const SIGNATURE =
  "2ZE7Rz1DkV5xWqTgH8uJmN4pAeYcF6vKsX9bLd3M7nQaPjS5tUwB1hCiD4fGyRmE8oJx6KpLqNvTaZbWcXdYeUf";
const TOTAL = 31;

export function HeroPreview() {
  const [status, setStatus] = useState<TransactionStatusState>("pending");
  const [confirmations, setConfirmations] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timers = timersRef.current;
    const clearAll = () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    const runCycle = () => {
      clearAll();
      setStatus("pending");
      setConfirmations(0);
      timers.push(
        setTimeout(() => {
          setStatus("confirming");
          let count = 0;
          intervalRef.current = setInterval(() => {
            count += Math.ceil(Math.random() * 4);
            if (count >= TOTAL) {
              count = TOTAL;
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = null;
              setConfirmations(count);
              timers.push(
                setTimeout(() => {
                  setStatus("confirmed");
                  timers.push(setTimeout(runCycle, 3200));
                }, 500),
              );
            } else {
              setConfirmations(count);
            }
          }, 200);
        }, 2200),
      );
    };

    runCycle();
    return clearAll;
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none border border-[#22262f] bg-[#161b26] p-6"
    >
      <TransactionStatus
        status={status}
        signature={SIGNATURE}
        confirmations={status === "confirming" ? confirmations : undefined}
        totalConfirmations={TOTAL}
        details={{
          primary: `${status === "confirmed" ? "Sent" : "Sending"} 2.5 SOL`,
          secondary: "to wallet.sol",
          meta: "9xQe…F4kM",
        }}
        className="min-h-[172px]"
      />
    </div>
  );
}
