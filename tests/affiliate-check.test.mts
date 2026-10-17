import { strict as assert } from "node:assert";
import test from "node:test";

import { describeAffiliateUrl } from "../src/lib/monetization/affiliate-check.ts";

const SUB = "choiceflow";

test("상품 검색 링크에 추적 표시와 채널이 있으면 정상", () => {
  const report = describeAffiliateUrl(
    "https://link.coupang.com/re/AFFSDP?lptag=AF7639883&subid=choiceflow&pageKey=7689316843&itemId=1&vendorItemId=2",
    SUB
  );
  assert.equal(report.tracked, true);
  assert.equal(report.hasSubId, true);
});

/*
  상품 검색 API 를 부를 때 채널 아이디를 넘기지 않아, 링크는 추적되지만
  채널이 비어 있었다. 리포트를 채널로 거르면 0 으로 보인다.
*/
test("추적은 되지만 채널이 없으면 알아챈다", () => {
  const report = describeAffiliateUrl(
    "https://link.coupang.com/re/AFFSDP?lptag=AF7639883&pageKey=7689316843",
    SUB
  );
  assert.equal(report.tracked, true);
  assert.equal(report.hasSubId, false);
  assert.ok(report.note.includes("채널 아이디가 없음"));
});

test("다른 채널이 붙어 있으면 알아챈다", () => {
  const report = describeAffiliateUrl(
    "https://link.coupang.com/re/AFFSDP?lptag=AF7639883&subid=other",
    SUB
  );
  assert.equal(report.hasSubId, false);
  assert.ok(report.note.includes('"other"'));
});

/*
  딥링크가 실패하면 /api/coupang 은 일반 쿠팡 검색 주소로 보낸다.
  쿠팡은 똑같이 열리지만 수수료가 없다.
*/
test("추적 표시가 없는 일반 쿠팡 주소는 수수료가 없다고 본다", () => {
  const report = describeAffiliateUrl(
    "https://www.coupang.com/np/search?q=%EB%AC%B4%EC%84%A0",
    SUB
  );
  assert.equal(report.tracked, false);
  assert.ok(report.note.includes("수수료가 없는"));
});

test("딥링크 짧은 주소는 추적됨으로 보되 채널은 따로 본다", () => {
  const report = describeAffiliateUrl("https://link.coupang.com/a/bKZ3hP", SUB);
  assert.equal(report.tracked, true);
  assert.equal(report.hasSubId, undefined);
});

test("쿠팡이 아닌 주소와 빈 값은 추적되지 않는다", () => {
  assert.equal(describeAffiliateUrl("https://example.com/x", SUB).tracked, false);
  assert.equal(describeAffiliateUrl(undefined, SUB).tracked, false);
  assert.equal(describeAffiliateUrl("not a url", SUB).parsed, false);
});
