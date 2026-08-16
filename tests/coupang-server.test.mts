import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCoupangSearchUrl,
  createCoupangAuthorization,
  formatCoupangSignedDate,
  isAllowedCoupangRedirectUrl,
  normalizeCoupangKeyword,
  productDedupKeys,
} from "../src/lib/monetization/coupang-server.ts";

test("formats Coupang signed dates in UTC", () => {
  assert.equal(
    formatCoupangSignedDate(new Date("2025-01-02T03:04:05.000Z")),
    "250102T030405Z"
  );
});

test("creates a deterministic HMAC authorization header", () => {
  const authorization = createCoupangAuthorization({
    method: "POST",
    path: "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink",
    accessKey: "access-test",
    secretKey: "secret-test",
    now: new Date("2025-01-02T03:04:05.000Z"),
  });

  assert.equal(
    authorization,
    "CEA algorithm=HmacSHA256, access-key=access-test, signed-date=250102T030405Z, signature=166af09dd0d38cb9309d92d7c9271228d1b546b972f6627c61804dbf332bd18b"
  );
});

test("normalizes and bounds user-controlled search keywords", () => {
  assert.equal(normalizeCoupangKeyword("  무선   이어폰  "), "무선 이어폰");
  assert.equal(normalizeCoupangKeyword("x".repeat(200)).length, 120);
  assert.equal(normalizeCoupangKeyword(null), "");
});

test("builds an encoded HTTPS Coupang fallback search URL", () => {
  const url = new URL(buildCoupangSearchUrl("무선 이어폰"));
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "www.coupang.com");
  assert.equal(url.pathname, "/np/search");
  assert.equal(url.searchParams.get("q"), "무선 이어폰");
});

test("only accepts known HTTPS Coupang redirect hosts", () => {
  assert.equal(
    isAllowedCoupangRedirectUrl("https://link.coupang.com/a/example"),
    true
  );
  assert.equal(isAllowedCoupangRedirectUrl("https://coupa.ng/example"), true);
  assert.equal(
    isAllowedCoupangRedirectUrl("http://link.coupang.com/a/example"),
    false
  );
  assert.equal(
    isAllowedCoupangRedirectUrl("https://coupang.com.evil.example/a"),
    false
  );
  assert.equal(isAllowedCoupangRedirectUrl("not-a-url"), false);
});

test("같은 상품인지 가릴 때 주소 하나만 보지 않는다", () => {
  // 제휴 딥링크에는 호출마다 달라지는 추적 파라미터가 붙는다.
  // 주소만 비교하면 같은 상품이 두 슬롯에 그대로 들어간다.
  const first = productDedupKeys({
    productId: "12345",
    productName: "차이슨 무선청소기",
    productPrice: 190000,
    productImage: "https://img.coupangcdn.com/a.jpg",
    productUrl: "https://link.coupang.com/re/AFF?pageKey=12345&traceid=aaa",
    isRocket: true,
    isFreeShipping: false,
  });
  const sameProductLaterCall = productDedupKeys({
    productId: "12345",
    productName: "차이슨 무선청소기",
    productPrice: 190000,
    productImage: "https://img.coupangcdn.com/a.jpg",
    productUrl: "https://link.coupang.com/re/AFF?pageKey=12345&traceid=bbb",
    isRocket: true,
    isFreeShipping: false,
  });

  assert.notEqual(first[1], sameProductLaterCall[1]);
  const used = new Set(first);
  assert.ok(sameProductLaterCall.some((key) => used.has(key)));
});

test("판매자만 다른 같은 물건도 사진으로 걸러낸다", () => {
  // 상품 번호는 갈리지만 화면에서는 같은 사진, 같은 값으로 보인다.
  const used = new Set(
    productDedupKeys({
      productId: "111",
      productName: "차이슨 무선청소기",
      productPrice: 190000,
      productImage: "https://img.coupangcdn.com/a.jpg",
      productUrl: "https://link.coupang.com/re/AFF?pageKey=111",
      isRocket: true,
      isFreeShipping: false,
    })
  );
  const otherSeller = productDedupKeys({
    productId: "222",
    productName: "차이슨 무선청소기",
    productPrice: 190000,
    productImage: "https://img.coupangcdn.com/a.jpg",
    productUrl: "https://link.coupang.com/re/AFF?pageKey=222",
    isRocket: true,
    isFreeShipping: false,
  });
  assert.ok(otherSeller.some((key) => used.has(key)));
});

test("다른 상품은 걸러내지 않는다", () => {
  const used = new Set(
    productDedupKeys({
      productId: "111",
      productName: "차이슨 무선청소기",
      productPrice: 190000,
      productImage: "https://img.coupangcdn.com/a.jpg",
      productUrl: "https://link.coupang.com/re/AFF?pageKey=111",
      isRocket: true,
      isFreeShipping: false,
    })
  );
  const different = productDedupKeys({
    productId: "999",
    productName: "로보락 로봇청소기",
    productPrice: 420000,
    productImage: "https://img.coupangcdn.com/z.jpg",
    productUrl: "https://link.coupang.com/re/AFF?pageKey=999",
    isRocket: true,
    isFreeShipping: false,
  });
  assert.ok(!different.some((key) => used.has(key)));
});
