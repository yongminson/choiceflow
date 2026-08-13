export type ChoiceFlowPlatform = "web" | "android" | "apps-in-toss";

const STORAGE_KEY = "choiceflow_platform";

function isPlatform(value: string | null): value is Exclude<ChoiceFlowPlatform, "web"> {
  return value === "android" || value === "apps-in-toss";
}

export function rememberPlatformFromUrl(): ChoiceFlowPlatform {
  if (typeof window === "undefined") return "web";

  const requested = new URLSearchParams(window.location.search).get("platform");
  if (isPlatform(requested)) {
    window.sessionStorage.setItem(STORAGE_KEY, requested);
    return requested;
  }

  if (/ChoiceFlowAndroid/i.test(window.navigator.userAgent)) {
    window.sessionStorage.setItem(STORAGE_KEY, "android");
    return "android";
  }

  const remembered = window.sessionStorage.getItem(STORAGE_KEY);
  return isPlatform(remembered) ? remembered : "web";
}

export function isEmbeddedStoreRuntime(): boolean {
  return rememberPlatformFromUrl() !== "web";
}
