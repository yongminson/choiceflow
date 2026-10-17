"use client";

import { useEffect } from "react";

import {
  BRIDGE_HELLO,
  BRIDGE_READY,
  OPEN_URL,
  isBridgeMessage,
  isBridgeableUrl,
} from "@/lib/platform/toss-bridge";

/**
 * 토스 미니앱 껍데기 안에서 외부 링크 누름을 껍데기로 넘긴다.
 *
 * 왜 필요한지는 lib/platform/toss-bridge.ts 에 적어 두었다. 요약하면
 * 토스 WebView 안의 iframe 에서는 새 창 링크가 열리지 않아 쿠팡 클릭이
 * 하나도 잡히지 않았다.
 *
 * iframe 안에 있을 때만, 그리고 껍데기가 준비됐다고 알려 온 뒤에만
 * 움직인다. 일반 웹이나 옛 껍데기에서는 아무 일도 하지 않는다.
 */
export function TossLinkBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // iframe 안이 아니면 할 일이 없다.
    if (window.parent === window) return;

    let parentOrigin: string | null = null;

    const onMessage = (event: MessageEvent) => {
      // 감싸고 있는 껍데기가 보낸 것만 믿는다.
      if (event.source !== window.parent) return;
      if (!isBridgeMessage(event.data)) return;
      if (event.data.type === BRIDGE_READY) {
        parentOrigin = event.origin;
        /*
          토스 껍데기가 답했다면 토스 안이다. 주소에 platform 이 빠지고
          저장소도 막혀 표시를 못 붙였을 때를 위해 여기서도 붙인다.
          토스 내비게이션 바와 겹치는 헤더·뒤로가기를 감추는 데 쓴다.
        */
        document.documentElement.dataset.choiceflowPlatform = "apps-in-toss";
      }
    };

    const onClick = (event: MouseEvent) => {
      if (!parentOrigin) return;
      if (event.defaultPrevented || event.button !== 0) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isBridgeableUrl(anchor.href, window.location.origin)) return;

      /*
        기본 동작(새 창)만 막는다. 링크에 붙은 클릭 기록(trackOutboundClick)은
        React 쪽에서 그대로 돈다. preventDefault 는 전파를 멈추지 않는다.
      */
      event.preventDefault();
      window.parent.postMessage({ type: OPEN_URL, url: anchor.href }, parentOrigin);
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);

    /*
      준비됐다고 먼저 알린다. 껍데기가 보낸 "다리 준비됨"을 놓쳤을 수 있다.
      받는 쪽이 누구인지 아직 모르므로 대상은 "*" 로 둔다. 담긴 것이 없는
      인사라 누가 받아도 문제가 없다.
    */
    window.parent.postMessage({ type: BRIDGE_HELLO }, "*");
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
