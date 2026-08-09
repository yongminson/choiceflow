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
      return { ok: record.ok !== false, text };
    })
    .filter((item): item is RecommendationFitCheck => item !== null)
    .slice(0, MAX_CHECKS);

  const met = parsed.filter((item) => item.ok);
  const unmet = parsed.filter((item) => !item.ok);
  if (met.length < 2 || unmet.length === 0) return undefined;
  // 충족 항목을 먼저, 감수 항목을 마지막에 둔다.
  return [...met, ...unmet];
}

/**
 * AI 체크리스트가 없을 때 서버가 확인한 사실만으로 만드는 최소 체크리스트.
 *
 * 없는 항목을 지어내면 이 화면 전체를 못 믿게 된다.
 * 실제 가격·배송처럼 확인된 값만 쓰고, 그것으로 두 줄을 못 채우면 아예 만들지 않는다.
 */
export function derivedFitChecks(
  item: QuickRecommendation,
  maxBudgetWon?: number
): RecommendationFitCheck[] | undefined {
  if (item.fitChecks?.length) return item.fitChecks;
  const checks: RecommendationFitCheck[] = [];

  if (typeof item.price === "number" && maxBudgetWon) {
    checks.push(
      item.price <= maxBudgetWon
        ? { ok: true, text: "예산 안에 들어옴" }
        : { ok: false, text: "예산을 조금 넘음" }
    );
  }
  if (item.isRocket) {
    checks.push({ ok: true, text: "로켓배송으로 바로 받음" });
  }
  if (typeof item.rating === "number" && item.rating >= 4) {
    checks.push({ ok: true, text: `지도 평점 ${item.rating.toFixed(1)}점` });
  }
  if (typeof item.distanceMeters === "number" && item.distanceMeters <= 1000) {
    checks.push({ ok: true, text: "걸어서 갈 수 있는 거리" });
  }

  return checks.length >= 2 ? checks.slice(0, MAX_CHECKS) : undefined;
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
        ? { ok: true, text: `걸어서 갈 만한 ${input.distanceMeters}m` }
        : {
            ok: false,
            text: `${(input.distanceMeters / 1000).toFixed(1)}km — 이동이 필요함`,
          }
    );
  }
  if (typeof input.rating === "number") {
    checks.push(
      input.rating >= 4
        ? { ok: true, text: `평점 ${input.rating.toFixed(1)}점` }
        : { ok: false, text: `평점 ${input.rating.toFixed(1)}점으로 낮음` }
    );
  }
  if (typeof input.reviewCount === "number") {
    checks.push(
      input.reviewCount >= 50
        ? {
            ok: true,
            text: `후기 ${input.reviewCount.toLocaleString("ko-KR")}개로 충분함`,
          }
        : { ok: false, text: `후기 ${input.reviewCount}개로 적음` }
    );
  }
  if (input.openNow === true) {
    checks.push({ ok: true, text: "지금 영업 중" });
  } else if (input.openNow === false) {
    checks.push({ ok: false, text: "지금은 영업 종료" });
  }

  return checks.length >= 2 ? checks.slice(0, MAX_CHECKS) : undefined;
}
