/**
 * 토스 미니앱 안에서 외부 링크를 여는 다리.
 *
 * 토스 미니앱은 이 웹사이트를 iframe 으로 감싼 껍데기다
 * (platforms/apps-in-toss). 결과 카드의 쿠팡 링크는 target="_blank" 로
 * 새 창을 여는데, 토스 WebView 안의 iframe 에서는 새 창이 열리지 않는다.
 * 토스 화면에서는 사람이 들어와 결과를 보는데 쿠팡 파트너스에는 클릭이
 * 하나도 잡히지 않았다. 눌러도 아무 일이 일어나지 않았던 것이다.
 *
 * 토스는 외부 링크를 열 때 SDK 의 Device.openURL 을 쓰게 한다. 그런데
 * SDK 는 껍데기에만 있고 iframe 안의 이 웹사이트에서는 부를 수 없다.
 * 그래서 링크를 누르면 껍데기에 주소를 넘기고, 껍데기가 SDK 로 연다.
 *
 * 껍데기가 "다리 준비됨"을 먼저 알려 온 때만 가로챈다. 껍데기를 아직
 * 새로 올리지 않았으면 신호가 오지 않으므로 지금처럼 그대로 둔다.
 * 새 웹사이트가 옛 껍데기를 만나도 지금보다 나빠지지 않게 하려는 것이다.
 */

export const BRIDGE_READY = "choiceflow:bridge-ready";
export const OPEN_URL = "choiceflow:open-url";
/**
 * 웹사이트가 준비됐다고 껍데기에 먼저 알리는 신호.
 *
 * 껍데기는 iframe 이 다 읽히면 "다리 준비됨"을 보내는데, 그때 이 웹사이트의
 * React 가 아직 화면을 붙이기 전이면 그 신호를 놓친다. 그래서 웹사이트가
 * 준비되면 먼저 인사를 보내고 껍데기가 그에 답하게 한다.
 */
export const BRIDGE_HELLO = "choiceflow:bridge-hello";

export type BridgeMessage =
  | { type: typeof BRIDGE_READY }
  | { type: typeof BRIDGE_HELLO }
  | { type: typeof OPEN_URL; url: string };

/** 껍데기에 넘겨 열어도 되는 주소인지. https 외부 주소만 넘긴다. */
export function isBridgeableUrl(href: string, currentOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(href, currentOrigin);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  // 같은 사이트 안의 이동은 iframe 안에서 그대로 하면 된다.
  return url.origin !== currentOrigin;
}

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type === BRIDGE_READY || record.type === BRIDGE_HELLO) return true;
  return record.type === OPEN_URL && typeof record.url === "string";
}
