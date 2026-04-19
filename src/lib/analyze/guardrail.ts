/** AI 가드레일 거절 시 기본 메시지 (API·프론트 공통) */
export const ANALYZE_GUARDRAIL_DEFAULT_REASON =
  "상품, 자산, 서비스 등 명확한 비교 목적의 텍스트 및 이미지만 분석할 수 있습니다.";

/** STEP 1 비전·의도 검증 실패 시 — 이미지/텍스트가 비교 목적과 무관할 때 */
export const ANALYZE_GUARDRAIL_VISION_INTENT_REASON =
  "입력하신 내용이나 이미지가 비교 분석 목적에 맞지 않습니다. 상품이나 자산과 관련된 올바른 사진/내용을 입력해 주세요.";
