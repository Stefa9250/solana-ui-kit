"use client";

import type { ComponentType } from "react";
import TransactionStatusDemo from "@/components/kit/transaction-status/demo";
import ConnectWalletDemo from "@/components/kit/connect-wallet/demo";
import ConnectWalletModalDemo from "@/components/kit/connect-wallet-modal/demo";
import TokenAmountInputDemo from "@/components/kit/token-amount-input/demo";
import FeeExplainerDemo from "@/components/kit/fee-explainer/demo";
import AddressDisplayDemo from "@/components/kit/address-display/demo";
import StateScreenDemo from "@/components/kit/state-screen/demo";
import TransactionReviewDemo from "@/components/kit/transaction-review/demo";

/**
 * Maps a registry slug to its live docs demo.
 * Each demo lives next to its component in components/kit/<slug>/demo.tsx
 * and renders the component with buttons to cycle every state.
 */
export const demos: Record<string, ComponentType> = {
  "transaction-status": TransactionStatusDemo,
  "connect-wallet": ConnectWalletDemo,
  "connect-wallet-modal": ConnectWalletModalDemo,
  "token-amount-input": TokenAmountInputDemo,
  "fee-explainer": FeeExplainerDemo,
  "address-display": AddressDisplayDemo,
  "state-screen": StateScreenDemo,
  "transaction-review": TransactionReviewDemo,
};
