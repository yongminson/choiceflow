import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCoupangSearchUrl,
  createCoupangAuthorization,
  formatCoupangSignedDate,
  isAllowedCoupangRedirectUrl,
  normalizeCoupangKeyword,
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
