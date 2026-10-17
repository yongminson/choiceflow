export type ChoiceFlowPlatform = "web" | "android" | "apps-in-toss";

const STORAGE_KEY = "choiceflow_platform";

function isPlatform(value: string | null): value is Exclude<ChoiceFlowPlatform, "web"> {
  return value === "android" || value === "apps-in-toss";
}

// 토스 iframe 처럼 저장소가 막힌 곳에서는 읽고 쓰기가 예외를 던진다.
function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(value: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // 저장하지 못해도 이번 화면의 판단은 그대로 쓴다.
  }
}

export function rememberPlatformFromUrl(): ChoiceFlowPlatform {
  if (typeof window === "undefined") return "web";

  const requested = new URLSearchParams(window.location.search).get("platform");
  if (isPlatform(requested)) {
    store(requested);
    return requested;
  }

  if (/ChoiceFlowAndroid/i.test(window.navigator.userAgent)) {
    store("android");
    return "android";
  }

  const remembered = readStored();
  if (isPlatform(remembered)) return remembered;

  // 첫 스크립트나 토스 다리가 이미 붙인 표시가 있으면 그것을 따른다.
  const marked = document.documentElement.dataset.choiceflowPlatform ?? null;
  return isPlatform(marked) ? marked : "web";
}

export function isEmbeddedStoreRuntime(): boolean {
  return rememberPlatformFromUrl() !== "web";
}
