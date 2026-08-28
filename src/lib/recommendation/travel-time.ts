/**
 * 한 후보 안에서 소요 시간이 서로 다르게 적히는 것을 막는다.
 *
 * 같은 숙소 카드에 "차로 35분 거리"와 "40분 내 도착 가능"이 함께 떴다.
 * 히어로 설명, 조건 판단, 적합성 설명이 각각 따로 생성되는데 AI 가
 * 그때마다 숫자를 새로 지어내기 때문이다. 읽는 사람은 어느 쪽이 맞는지
 * 알 수 없고, 숫자가 어긋나는 순간 나머지 판단까지 못 믿게 된다.
 *
 * 후보마다 값을 하나로 정하고, 그 후보의 모든 문장을 그 값으로 다시 쓴다.
 */

/** "차로 35분", "걸어서 10분" — 이동 수단이 앞에 붙는 형태. */
const WITH_TRANSPORT =
  /(차로|차량으로|차량|자동차로|도보로|걸어서|버스로|지하철로)(\s*약)?\s*(\d{1,3})\s*분/g;

/** "35분 거리", "40분 내 도착" — 뒤에 거리·도착을 뜻하는 말이 붙는 형태. */
const WITH_DISTANCE = /(\d{1,3})\s*분\s*(거리|내|이내|안|만에|대)/g;

/** 이 범위를 벗어난 값은 이동 시간으로 보지 않는다. */
const MIN_MINUTES = 1;
const MAX_MINUTES = 600;

function isPlausible(minutes: number): boolean {
  return (
    Number.isFinite(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES
  );
}

/** 문장들에 적힌 이동 시간을 모두 모은다. 나온 순서를 지킨다. */
export function collectTravelMinutes(texts: string[]): number[] {
  const found: number[] = [];
  for (const text of texts) {
    if (!text) continue;
    // replace 로 훑는다. matchAll 은 이 프로젝트의 컴파일 대상에서 못 쓴다.
    text.replace(WITH_TRANSPORT, (...args: unknown[]) => {
      const minutes = Number(args[3]);
      if (isPlausible(minutes)) found.push(minutes);
      return "";
    });
    text.replace(WITH_DISTANCE, (...args: unknown[]) => {
      const minutes = Number(args[1]);
      if (isPlausible(minutes)) found.push(minutes);
      return "";
    });
  }
  return found;
}

/**
 * 후보가 쓸 하나의 값을 정한다.
 *
 * AI 가 따로 적어 준 값이 있으면 그것을 쓴다. 없으면 문장에서 가장 자주
 * 나온 값을 쓴다. 어느 쪽이 맞는지 알 수 없으니 적어도 하나로 맞추는 것이
 * 목적이다.
 */
export function pickTravelMinutes(
  declared: unknown,
  texts: string[]
): number | undefined {
  const fromField = Number(declared);
  if (isPlausible(fromField)) return Math.round(fromField);

  const found = collectTravelMinutes(texts);
  if (found.length === 0) return undefined;

  const counts = new Map<number, number>();
  for (const minutes of found) {
    counts.set(minutes, (counts.get(minutes) ?? 0) + 1);
  }
  let best = found[0];
  let bestCount = 0;
  for (const minutes of found) {
    const count = counts.get(minutes) ?? 0;
    if (count > bestCount) {
      best = minutes;
      bestCount = count;
    }
  }
  return best;
}

/** 문장에 적힌 이동 시간을 모두 정해진 값으로 바꾼다. */
export function rewriteTravelMinutes(text: string, minutes: number): string {
  if (!text) return text;
  return text
    .replace(
      WITH_TRANSPORT,
      (_match, transport: string, about: string | undefined) =>
        `${transport}${about ?? ""} ${minutes}분`
    )
    .replace(WITH_DISTANCE, (_match, _number: string, tail: string) =>
      `${minutes}분 ${tail}`
    );
}

type TravelTexts = {
  reason?: string;
  qualitySummary?: string;
  caution?: string;
  fitChecks?: { text: string }[];
};

/**
 * 후보의 모든 문장이 같은 소요 시간을 말하게 맞춘다.
 * 이동 시간이 적혀 있지 않은 후보는 그대로 둔다.
 */
export function normalizeTravelTime<T extends TravelTexts>(
  candidate: T,
  declared?: unknown
): T {
  const texts = [
    candidate.reason,
    candidate.qualitySummary,
    candidate.caution,
    ...(candidate.fitChecks ?? []).map((check) => check.text),
  ].filter((text): text is string => typeof text === "string");

  const minutes = pickTravelMinutes(declared, texts);
  if (minutes === undefined) return candidate;

  const rewrite = (text?: string) =>
    typeof text === "string" ? rewriteTravelMinutes(text, minutes) : text;

  return {
    ...candidate,
    reason: rewrite(candidate.reason),
    qualitySummary: rewrite(candidate.qualitySummary),
    caution: rewrite(candidate.caution),
    fitChecks: candidate.fitChecks?.map((check) => ({
      ...check,
      text: rewriteTravelMinutes(check.text, minutes),
    })),
  };
}
