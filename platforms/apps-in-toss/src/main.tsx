import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const WEB_URL = import.meta.env.VITE_CHOICEFLOW_WEB_URL || "https://choice.ymstudio.co.kr";

function withPlatform(url: string) {
  const next = new URL(url);
  next.searchParams.set("platform", "apps-in-toss");
  return next.toString();
}

function App() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

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
        className={loaded && !failed ? "webview ready" : "webview"}
        src={withPlatform(WEB_URL)}
        title="ChoiceFlow 추천 서비스"
        allow="geolocation; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
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
