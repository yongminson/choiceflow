/**
 * 일 1회 무료 정책 — `profiles.last_free_use_at` 기준 뼈대.
 * Asia/Seoul 달력 기준으로 같은 날이면 "오늘 무료 사용함".
 */

function kstCalendarDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/**
 * 오늘(한국 날짜) 이미 일일 무료를 사용한 것으로 볼지.
 * `lastFreeUseAt`이 없으면 아직 사용 안 함.
 */
export function hasConsumedDailyFreeToday(
  lastFreeUseAt: string | null | undefined
): boolean {
  if (lastFreeUseAt == null || lastFreeUseAt === "") return false;
  const last = new Date(lastFreeUseAt);
  if (Number.isNaN(last.getTime())) return false;
  return kstCalendarDateString(last) === kstCalendarDateString(new Date());
}
