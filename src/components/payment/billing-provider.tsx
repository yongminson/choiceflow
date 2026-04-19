"use client";

import { BillingContextProvider } from "@/components/payment/billing-context";
import { useBilling } from "@/components/payment/billing-context";
import { BillingModal } from "@/components/payment/billing-modal";

function BillingModalBridge() {
  const { isOpen, closeBilling } = useBilling();
  return (
    <BillingModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeBilling();
      }}
    />
  );
}

/** 전역 결제 모달 + `useBilling()` */
export function BillingProvider({ children }: { children: React.ReactNode }) {
  return (
    <BillingContextProvider>
      {children}
      <BillingModalBridge />
    </BillingContextProvider>
  );
}

export { useBilling } from "@/components/payment/billing-context";
