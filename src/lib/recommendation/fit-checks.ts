import type { QuickRecommendation, RecommendationFitCheck } from "@/lib/types/analyze";

/** 체크리스트 한 줄은 훑어서 읽혀야 한다. 길어지면 줄글과 다를 게 없다. */
const MAX_TEXT_LENGTH = 34;
const MAX_CHECKS = 4;

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

/**
 * AI가 준 조건 체크리스트를 정리한다.
 *
 * 충족 항목만 늘어놓으면 광고 문구처럼 읽혀 오히려 신뢰를 잃는다.
 * 감수해야 할 항목이 하나도 없으면 체크리스트로 쓰지 않고 줄글 이유로 되돌린다.
 */
export function readFitChecks(value: unknown): RecommendationFitCheck[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .map((item) => {
      const record =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const text = cleanText(record.text);
      if (!text) return null;
      // AI 가 쓴 항목이다. 링크되는 상품의 사양을 확인하고 쓴 것이 아니므로
      // 확인된 사실과 섞이지 않게 guide 로 표시한다.
      return { ok: record.ok !== false, text, source: "guide" as const };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, MAX_CHECKS);

  const met = parsed.filter((item) => item.ok);
  const unmet = parsed.filter((item) => !item.ok);
  if (met.length < 2 || unmet.length === 0) return undefined;
  // 충족 항목을 먼저, 감수 항목을 마지막에 둔다.
  return [...met, ...unmet];
}

/**
 * 서버가 확인한 사실과 AI 의 판단을 합쳐 최종 체크리스트를 만든다.
 *
 * 확인된 것을 앞에 둔다. 실제 판매가와 배송 조건은 조회 결과라 사실이고,
 * AI 가 쓴 항목은 링크되는 상품을 보지 않고 조건만으로 판단한 것이다.
 * 둘을 섞어 같은 모양으로 보여주면 어느 쪽이 사실인지 알 수 없다.
 *
 * 없는 항목을 지어내지는 않는다. 확인된 것이 없고 AI 항목도 없으면
 * 체크리스트를 만들지 않고 줄글 이유로 돌아간다.
 */
export function derivedFitChecks(
  item: QuickRecommendation,
  maxBudgetWon?: number,
  context: FitCheckContext = {}
): RecommendationFitCheck[] | undefined {
  const verified = verifiedChecksFor(item, maxBudgetWon, context);
  const guides = item.fitChecks?.filter((check) => check.source !== "verified") ?? [];

  /*
    감수해야 하는 항목은 목록 끝에 오는데, 그대로 자르면 그것부터 잘려 나간다.
    실제로 확인된 항목 2개에 좋은 점 2개가 채워지면서 단점이 사라진 화면이
    나갔다. 단점을 먼저 보여주는 것이 이 서비스의 차별점이므로 자리를 먼저
    비워 둔다.
  */
  const positives = [...verified, ...guides].filter((check) => check.ok);
  const drawbacks = [...verified, ...guides].filter((check) => !check.ok);

  /*
    단점이 하나도 없으면 체크리스트를 만들지 않는다.

    AI 에게 ok=false 를 하나 넣으라고 시켜 두었지만 매번 지키지는 않는다.
    지키지 않은 요청에서 확인된 사실만 남으면 그것은 전부 좋은 점이라,
    좋은 점만 넉 줄 늘어선 카드가 나간다. 그런 화면은 광고와 구별되지 않고,
    이 서비스가 다른 추천 사이트와 갈리는 지점이 바로 거기다.
    없는 단점을 지어내지는 않으므로, 대신 체크리스트를 접고 줄글 이유로 돌아간다.
  */
  if (drawbacks.length === 0) return undefined;

  const combined = [
    ...positives.slice(0, MAX_CHECKS - 1),
    ...drawbacks.slice(0, 1),
  ];
  return combined.length >= 2 ? combined : undefined;
}

export type FitCheckContext = {
  cheapestPrice?: number;
  priciestPrice?: number;
};

/**
 * 조회 결과에서 바로 확인되는 항목만 모은다.
 *
 * 후보 넷이 모두 "예산 안에 들어옴 / 로켓배송으로 바로 받음"만 달고 있으면
 * 확인된 항목이 후보를 가르는 데 아무 도움이 되지 않는다. 예산 대비 어느
 * 정도인지, 후보 중 가장 싼지처럼 서로 달라지는 값을 쓴다.
 */
function verifiedChecksFor(
  item: QuickRecommendation,
  maxBudgetWon?: number,
  context: FitCheckContext = {}
): RecommendationFitCheck[] {
  const checks: RecommendationFitCheck[] = [];

  if (typeof item.price === "number" && maxBudgetWon) {
    if (item.price <= maxBudgetWon) {
      const ratio = Math.round((item.price / maxBudgetWon) * 100);
      checks.push({
        ok: true,
        text:
          ratio <= 90
            ? `예산의 ${ratio}% 수준`
            : "예산 상한에 거의 맞음",
        source: "verified",
      });
    } else {
      const over = item.price - maxBudgetWon;
      checks.push({
        ok: false,
        text: `예산을 ${over.toLocaleString("ko-KR")}원 넘음`,
        source: "verified",
      });
    }
  }
  if (
    typeof item.price === "number" &&
    typeof context.cheapestPrice === "number" &&
    item.price === context.cheapestPrice
  ) {
    checks.push({ ok: true, text: "후보 중 가장 저렴함", source: "verified" });
  }
  /*
    감수할 점도 조회 결과에서 나온다.

    AI 가 단점을 빼먹은 요청에서도 카드가 좋은 점만 늘어놓지 않으려면,
    확인된 사실 쪽에서도 불리한 것을 꺼낼 수 있어야 한다.
    지어낸 것이 아니라 실제 값이므로 그대로 쓸 수 있다.
  */
  if (
    typeof item.price === "number" &&
    typeof context.priciestPrice === "number" &&
    typeof context.cheapestPrice === "number" &&
    context.priciestPrice > context.cheapestPrice &&
    item.price === context.priciestPrice
  ) {
    checks.push({ ok: false, text: "후보 중 가장 비쌈", source: "verified" });
  }
  if (item.isRocket) {
    checks.push({ ok: true, text: "로켓배송으로 바로 받음", source: "verified" });
  } else if (typeof item.price === "number") {
    // 상품을 찾았는데 로켓배송이 아니면 배송을 기다려야 한다.
    // 상품을 못 찾았을 때는 배송 조건 자체를 모르므로 아무 말도 하지 않는다.
    checks.push({
      ok: false,
      text: "로켓배송이 아니라 배송이 걸림",
      source: "verified",
    });
  }
  if (typeof item.rating === "number" && item.rating >= 4) {
    checks.push({
      ok: true,
      text: `지도 평점 ${item.rating.toFixed(1)}점`,
      source: "verified",
    });
  }
  if (typeof item.distanceMeters === "number" && item.distanceMeters <= 1000) {
    checks.push({ ok: true, text: "걸어서 갈 수 있는 거리", source: "verified" });
  }

  return checks;
}

/**
 * 지도에서 확인된 사실로 만드는 체크리스트.
 *
 * 평점·후기 수·영업 여부는 실제 조회 결과이므로 충족/미달을 그대로 쓸 수 있다.
 */
export function placeFitChecks(input: {
  distanceMeters?: number;
  rating?: number;
  reviewCount?: number;
  openNow?: boolean;
}): RecommendationFitCheck[] | undefined {
  const checks: RecommendationFitCheck[] = [];

  if (typeof input.distanceMeters === "number") {
    checks.push(
      input.distanceMeters <= 1000
        ? {
            ok: true,
            text: `걸어서 갈 만한 ${input.distanceMeters}m`,
            source: "verified" as const,
          }
        : {
            ok: false,
            text: `${(input.distanceMeters / 1000).toFixed(1)}km — 이동이 필요함`,
            source: "verified" as const,
          }
    );
  }
  if (typeof input.rating === "number") {
    checks.push(
      input.rating >= 4
        ? { ok: true, text: `평점 ${input.rating.toFixed(1)}점`, source: "verified" as const }
        : {
            ok: false,
            text: `평점 ${input.rating.toFixed(1)}점으로 낮음`,
            source: "verified" as const,
          }
    );
  }
  if (typeof input.reviewCount === "number") {
    checks.push(
      input.reviewCount >= 50
        ? {
            ok: true,
            text: `후기 ${input.reviewCount.toLocaleString("ko-KR")}개로 충분함`,
            source: "verified" as const,
          }
        : {
            ok: false,
            text: `후기 ${input.reviewCount}개로 적음`,
            source: "verified" as const,
          }
    );
  }
  if (input.openNow === true) {
    checks.push({ ok: true, text: "지금 영업 중", source: "verified" });
  } else if (input.openNow === false) {
    checks.push({ ok: false, text: "지금은 영업 종료", source: "verified" });
  }

  return checks.length >= 2 ? checks.slice(0, MAX_CHECKS) : undefined;
}
