/**
 * 만 원 단위 가격 입력(예: "35", "10~20", "1-2")을 숫자로 정규화합니다.
 * 범위 형식이면 두 값의 평균(반올림)을 사용합니다.
 */
export function parseManwonPriceInput(raw: string): number {
  const s = String(raw).trim();
  if (!s) return 0;
  const rangeMatch = s.match(
    /(\d+(?:\.\d+)?)\s*[~\-–—]\s*(\d+(?:\.\d+)?)/
  );
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Math.round((a + b) / 2);
    }
  }
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return 0;
  const n = Number.parseFloat(nums[0]);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}
