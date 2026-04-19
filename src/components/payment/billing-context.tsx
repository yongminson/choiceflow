"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BillingContextValue = {
  openBilling: () => void;
  closeBilling: () => void;
  isOpen: boolean;
};

const BillingContext = createContext<BillingContextValue | null>(null);

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling must be used within BillingContextProvider");
  }
  return ctx;
}

export function BillingContextProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openBilling = useCallback(() => setIsOpen(true), []);
  const closeBilling = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      openBilling,
      closeBilling,
      isOpen,
    }),
    [openBilling, closeBilling, isOpen]
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}
