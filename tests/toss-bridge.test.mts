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

/*
  상품을 못 찾은 카드와 관련 상품 링크는 /api/coupang 을 거쳐 쿠팡으로 간다.
  처음에는 이 주소가 우리 사이트라는 이유로 넘기지 않아 토스에서 계속
  열리지 않았다.
*/
test("우리 서버를 거쳐 쿠팡으로 가는 주소도 넘긴다", () => {
  assert.equal(isBridgeableUrl("/api/coupang?q=%EB%AC%B4%EC%84%A0", SITE), true);
  assert.equal(isBridgeableUrl(`${SITE}/api/coupang?q=x`, SITE), true);
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
