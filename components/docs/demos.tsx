"use client";

import type { ComponentType } from "react";
import TransactionStatusDemo from "@/components/kit/transaction-status/demo";
import ConnectWalletDemo from "@/components/kit/connect-wallet/demo";
import ConnectWalletModalDemo from "@/components/kit/connect-wallet-modal/demo";

/**
 * Maps a registry slug to its live docs demo.
 * Each demo lives next to its component in components/kit/<slug>/demo.tsx
 * and renders the component with buttons to cycle every state.
 */
export const demos: Record<string, ComponentType> = {
  "transaction-status": TransactionStatusDemo,
  "connect-wallet": ConnectWalletDemo,
  "connect-wallet-modal": ConnectWalletModalDemo,
};
