import type { AnalyzeApiResult, QuickRecommendation } from "@/lib/types/analyze";

/**
 * 공유 링크에 담기는 결과 스냅샷.
 *
 * 원본 결과에는 화면 재구성에만 쓰이는 값(정밀 질문용 id 등)이 섞여 있다.
 * 공유 페이지는 읽기 전용이므로 보여줄 것만 남긴다. 저장 용량도, 남에게
 * 넘어가는 정보량도 줄어든다.
 */
export type SharedResultPayload = {
  categoryId?: string;
  scenarioLabel?: string;
  priorityLabel?: string;
  budgetLabel?: string;
  userWish?: string;
  advisory?: string;
  recommendations: QuickRecommendation[];
  checkedAt?: string;
};

/** 공유 페이로드가 이 크기를 넘으면 저장하지 않는다. 정상 결과는 20KB 안쪽이다. */
export const MAX_SHARE_PAYLOAD_BYTES = 96 * 1024;

function text(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed || undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function toSharedRecommendation(value: unknown): QuickRecommendation | null {
  if (!value || typeof value !== "object") return null;
  const item = value as QuickRecommendation;
  const name = text(item.name, 80);
  if (!name) return null;

  return {
    rank: number(item.rank) ?? 0,
    name,
    reason: text(item.reason, 400) ?? "",
    searchKeyword: text(item.searchKeyword, 100) ?? "",
    qualitySummary: text(item.qualitySummary, 300) ?? "",
    asSummary: text(item.asSummary, 300),
    depreciationSummary: text(item.depreciationSummary, 300),
    price: number(item.price),
    priceLabel: text(item.priceLabel, 40),
    rating: number(item.rating),
    reviewCount: number(item.reviewCount),
    address: text(item.address, 200),
    sourceUrl: httpsUrl(item.sourceUrl),
    sourceLabel: text(item.sourceLabel, 60),
    priceLevel: text(item.priceLevel, 40),
    selectionType: item.selectionType,
    selectionLabel: text(item.selectionLabel, 40),
    imageUrl: httpsUrl(item.imageUrl),
    productName: text(item.productName, 160),
    isRocket: item.isRocket === true,
    overall: number(item.overall),
    scores: Array.isArray(item.scores)
      ? item.scores
          .map((score) => ({
            label: text(score?.label, 20) ?? "",
            value: number(score?.value) ?? 0,
          }))
          .filter((score) => score.label)
          .slice(0, 5)
      : undefined,
    fitChecks: Array.isArray(item.fitChecks)
      ? item.fitChecks
          .map((check) => ({
            ok: check?.ok !== false,
            text: text(check?.text, 40) ?? "",
          }))
          .filter((check) => check.text)
          .slice(0, 4)
      : undefined,
    // 감수해야 하는 점은 공유 링크에서도 빠지면 안 된다.
    // 단점을 함께 보여주는 것이 이 결과 화면의 성격 자체다.
    caution: text(item.caution, 60),
  };
}

/**
 * 클라이언트가 보낸 결과에서 공유해도 되는 부분만 뽑는다.
 * 추천 후보가 하나도 없으면 공유할 것이 없으므로 null 을 돌려준다.
 */
export function toSharedResultPayload(
  value: unknown
): SharedResultPayload | null {
  if (!value || typeof value !== "object") return null;
  const result = value as AnalyzeApiResult;

  const recommendations = Array.isArray(result.quickRecommendations)
    ? result.quickRecommendations
        .map(toSharedRecommendation)
        .filter((item): item is QuickRecommendation => item !== null)
        .slice(0, 4)
    : [];
  if (recommendations.length === 0) return null;

  return {
    categoryId: text(result.categoryId, 20),
    scenarioLabel: text(result.quickScenarioLabel, 40),
    priorityLabel: text(result.quickPriorityLabel, 40),
    budgetLabel: text(result.quickBudgetLabel, 40),
    userWish: text(result.quickUserWish, 100),
    advisory: text(result.advisory, 600),
    recommendations,
    checkedAt: text(result.checkedAt, 40),
  };
}

/** 저장된 jsonb 를 다시 읽을 때도 같은 규칙으로 통과시킨다. */
export function readSharedResultPayload(
  value: unknown
): SharedResultPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as SharedResultPayload;
  const recommendations = Array.isArray(record.recommendations)
    ? record.recommendations
        .map(toSharedRecommendation)
        .filter((item): item is QuickRecommendation => item !== null)
        .slice(0, 4)
    : [];
  if (recommendations.length === 0) return null;

  return {
    categoryId: text(record.categoryId, 20),
    scenarioLabel: text(record.scenarioLabel, 40),
    priorityLabel: text(record.priorityLabel, 40),
    budgetLabel: text(record.budgetLabel, 40),
    userWish: text(record.userWish, 100),
    advisory: text(record.advisory, 600),
    recommendations,
    checkedAt: text(record.checkedAt, 40),
  };
}

/** 링크를 받은 사람이 카카오톡·트위터에서 먼저 보는 문구. */
export function sharePreviewText(payload: SharedResultPayload): {
  title: string;
  description: string;
} {
  const winner = payload.recommendations[0];
  const context = [payload.scenarioLabel, payload.budgetLabel]
    .filter(Boolean)
    .join(" · ");
  return {
    title: context ? `${winner.name} — ${context}` : winner.name,
    description:
      winner.reason ||
      "ChoiceFlow가 조건을 비교해 하나를 골랐습니다. 같은 고민이라면 직접 받아보세요.",
  };
}
