import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Device } from "@apps-in-toss/web-framework";
import "./styles.css";

const WEB_URL = import.meta.env.VITE_CHOICEFLOW_WEB_URL || "https://choice.ymstudio.co.kr";
const WEB_ORIGIN = new URL(WEB_URL).origin;

const BRIDGE_READY = "choiceflow:bridge-ready";
const BRIDGE_HELLO = "choiceflow:bridge-hello";
const OPEN_URL = "choiceflow:open-url";

function withPlatform(url: string) {
  const next = new URL(url);
  next.searchParams.set("platform", "apps-in-toss");
  return next.toString();
}

/**
 * 웹사이트가 넘긴 주소를 열어도 되는지.
 *
 * 메시지는 아무 쪽에서나 보낼 수 있으므로 보낸 곳과 주소를 둘 다 본다.
 * 우리 웹사이트에서 온 https 주소만 연다.
 */
function isSafeToOpen(origin: string, value: unknown): value is string {
  if (origin !== WEB_ORIGIN) return false;
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function App() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  /*
    iframe 안의 웹사이트는 새 창 링크를 열 수 없다. 토스 WebView 가 새 창을
    받아 주지 않기 때문이다. 그래서 쿠팡 링크를 눌러도 아무 일이 없었고,
    토스로 들어온 사람의 클릭이 파트너스에 하나도 잡히지 않았다.

    웹사이트가 주소를 넘기면 여기서 토스 SDK 로 연다.
  */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; url?: unknown } | null;
      if (!data) return;

      /*
        웹사이트가 준비됐다고 인사하면 답한다. iframe 이 다 읽혔을 때 보낸
        신호를 웹사이트가 놓쳤을 수 있어서다.
      */
      if (data.type === BRIDGE_HELLO && event.origin === WEB_ORIGIN) {
        (event.source as Window | null)?.postMessage({ type: BRIDGE_READY }, WEB_ORIGIN);
        return;
      }

      if (data.type !== OPEN_URL) return;
      if (!isSafeToOpen(event.origin, data.url)) return;
      void Device.openURL(data.url).catch(() => {
        // SDK 로 못 열면 마지막으로 브라우저 방식을 시도한다.
        window.open(data.url as string, "_blank", "noopener");
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /*
    웹사이트에 "다리 준비됨"을 알린다. 이 신호를 받은 웹사이트만 링크를
    넘겨 오므로, 껍데기를 새로 올리기 전의 웹사이트와 섞여도 문제가 없다.
  */
  const announceBridge = () => {
    frameRef.current?.contentWindow?.postMessage({ type: BRIDGE_READY }, WEB_ORIGIN);
  };

  return (
    <main className="shell">
      {!loaded && !failed ? (
        <div className="status" role="status" aria-live="polite">
          <img src={`${WEB_URL}/logo.png`} alt="" />
          <strong>ChoiceFlow를 여는 중이에요</strong>
          <span>잠시만 기다려 주세요.</span>
        </div>
      ) : null}

      {failed ? (
        <div className="status" role="alert">
          <img src={`${WEB_URL}/logo.png`} alt="" />
          <strong>서비스를 불러오지 못했어요</strong>
          <span>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</span>
          <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
        </div>
      ) : null}

      <iframe
        ref={frameRef}
        className={loaded && !failed ? "webview ready" : "webview"}
        src={withPlatform(WEB_URL)}
        title="ChoiceFlow 추천 서비스"
        allow="geolocation; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          setLoaded(true);
          announceBridge();
        }}
        onError={() => setFailed(true)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
