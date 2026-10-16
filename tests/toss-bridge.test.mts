import { strict as assert } from "node:assert";
import test from "node:test";

import {
  BRIDGE_HELLO,
  BRIDGE_READY,
  OPEN_URL,
  isBridgeMessage,
  isBridgeableUrl,
} from "../src/lib/platform/toss-bridge.ts";

const SITE = "https://choice.ymstudio.co.kr";

/*
  토스 WebView 안의 iframe 에서는 새 창 링크가 열리지 않아 쿠팡 클릭이
  하나도 잡히지 않았다. 외부 https 주소만 껍데기에 넘겨 SDK 로 연다.
*/
test("쿠팡·지도 같은 외부 https 주소는 껍데기로 넘긴다", () => {
  assert.equal(isBridgeableUrl("https://link.coupang.com/a/abc", SITE), true);
  assert.equal(isBridgeableUrl("https://www.coupang.com/vp/products/1", SITE), true);
  assert.equal(isBridgeableUrl("https://map.naver.com/p/search/x", SITE), true);
});

test("사이트 안의 이동은 넘기지 않는다", () => {
  assert.equal(isBridgeableUrl("/result", SITE), false);
  assert.equal(isBridgeableUrl(`${SITE}/blog/x`, SITE), false);
});

test("https 가 아닌 주소는 넘기지 않는다", () => {
  assert.equal(isBridgeableUrl("http://example.com", SITE), false);
  assert.equal(isBridgeableUrl("javascript:alert(1)", SITE), false);
  assert.equal(isBridgeableUrl("mailto:a@b.c", SITE), false);
});

test("약속한 모양의 메시지만 받는다", () => {
  assert.equal(isBridgeMessage({ type: BRIDGE_READY }), true);
  assert.equal(isBridgeMessage({ type: BRIDGE_HELLO }), true);
  assert.equal(isBridgeMessage({ type: OPEN_URL, url: "https://a.b" }), true);
  assert.equal(isBridgeMessage({ type: OPEN_URL }), false);
  assert.equal(isBridgeMessage({ type: "something-else" }), false);
  assert.equal(isBridgeMessage(null), false);
  assert.equal(isBridgeMessage("choiceflow:bridge-ready"), false);
});
