/** A/B 비교 결과 — "둘 중 뭘 사지?"에 대한 답 */
export type CompareVerdict = "A" | "B" | "tie";

export type CompareReason = {
  label: string;
  text: string;
};

export type CompareAlternative = {
  name: string;
  reason: string;
  searchKeyword: string;
  sourceUrl: string;
};

export type CompareApiResult = {
  optionA: string;
  optionB: string;
  context?: string;
  verdict: CompareVerdict;
  /** 결론 한 문장 */
  headline: string;
  /** 승자를 고른 근거 2~3개 */
  reasons: CompareReason[];
  /** 반대쪽을 골라야 하는 조건 — 정직하게 남겨두는 여지 */
  whenOther: string;
  /** 각 후보를 골랐을 때 나중에 후회하기 쉬운 지점 */
  trapA: string;
  trapB: string;
  alternative?: CompareAlternative;
  searchKeywordA: string;
  searchKeywordB: string;
  sourceUrlA: string;
  sourceUrlB: string;
  checkedAt: string;
};
