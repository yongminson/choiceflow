"use client";

import { useEffect } from "react";

import { rememberPlatformFromUrl } from "@/lib/platform/runtime";

export function PlatformRuntimeMarker() {
  useEffect(() => {
    const platform = rememberPlatformFromUrl();
    document.documentElement.dataset.choiceflowPlatform = platform;
  }, []);

  return null;
}
