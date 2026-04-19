"use client";

import { Suspense } from "react";

import { AppNavbar } from "@/components/layout/app-navbar";

function NavbarFallback() {
  return (
    <header className="glass-nav fixed top-0 z-50 h-14 w-full animate-pulse border-b border-white/10 bg-white/30 backdrop-blur-xl" />
  );
}

export function AppNavbarWrapper() {
  return (
    <Suspense fallback={<NavbarFallback />}>
      <AppNavbar />
    </Suspense>
  );
}
