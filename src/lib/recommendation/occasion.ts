/**
 * 언제 입을 것인지, 어떤 자리에 입을 것인지를 읽어 맞지 않는 상품을 뺀다.
 *
 * 추석 시댁 모임에 입을 옷을 찾았는데 "여름여행 플라워 투피스"가 후보에
 * 올라왔다. 상품명에 여름이라고 적혀 있는데도 걸러지지 않았다.
 *
 * 계절과 자리는 상품명만 봐도 어긋나는 것이 꽤 걸린다. 완벽하지는 않지만
 * 이름에 대놓고 적혀 있는 것만 걸러도 이런 화면은 나가지 않는다.
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

/** 자유입력에 시기가 적혀 있으면 지금이 언제든 그 시기로 본다. */
const SEASON_WORDS: [RegExp, Season][] = [
  [/추석|한가위/, "autumn"],
  [/설날|설 |구정|새해/, "winter"],
  [/크리스마스|연말|송년/, "winter"],
  [/여름휴가|바캉스|피서|장마/, "summer"],
  [/벚꽃|봄나들이|입학식/, "spring"],
  [/가을/, "autumn"],
  [/겨울/, "winter"],
  [/여름/, "summer"],
  [/봄/, "spring"],
];

/** 상품명에 이런 말이 있으면 그 계절 옷으로 본다. */
const SUMMER_MARKS =
  /여름|하계|냉감|쿨링|시원한|민소매|나시|비치|수영|래시가드|워터|홀터넥|린넨|아이스/;
const WINTER_MARKS = /방한|기모|패딩|다운점퍼|무스탕|발열내의|히트텍|극세사|양털|뽀글이/;

/**
 * 격식 있는 자리를 뜻하는 말.
 * 이런 자리에는 짧거나 노출이 있는 옷을 후보로 올리지 않는다.
 */
const FORMAL_WORDS =
  /시댁|처가|상견례|장례|조문|빈소|제사|차례|면접|입학식|졸업식|결혼식|하객|돌잔치|어른들|웃어른|격식|단정/;

/** 결혼식 하객 자리에서만 따로 보는 말. 흰옷은 신부와 겹친다. */
const WEDDING_WORDS = /결혼식|하객|웨딩/;

/** 격식 있는 자리에 맞지 않는 상품명 표시. */
const CASUAL_MARKS =
  /미니원피스|미니스커트|초미니|시스루|홀터|오프숄더|크롭|슬릿|백리스|튜브탑|비키니|파티룩|클럽/;

/** 흰옷 계열 표시. */
const WHITE_MARKS = /화이트|아이보리|white|ivory|순백|웨딩화이트/;

export type Occasion = {
  season: Season;
  /** 격식 있는 자리인지. */
  formal: boolean;
  /** 결혼식 하객 자리인지. 흰옷을 따로 본다. */
  wedding: boolean;
};

export function seasonOfMonth(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/**
 * 언제·어떤 자리인지 읽는다.
 *
 * 시기를 적었으면 그것을 쓰고, 안 적었으면 지금 달로 본다.
 * 옷이 아닌 분야에서는 계절을 따질 일이 없어 호출하지 않는다.
 */
export function detectOccasion(wish: string, now: Date = new Date()): Occasion {
  const text = wish.trim();
  const declared = SEASON_WORDS.find(([pattern]) => pattern.test(text));

  return {
    season: declared ? declared[1] : seasonOfMonth(now.getMonth() + 1),
    formal: FORMAL_WORDS.test(text),
    wedding: WEDDING_WORDS.test(text),
  };
}

/**
 * 이 계절에 내놓으면 안 되는 상품인지.
 *
 * 봄은 겨울옷도 여름옷도 입을 만해서 아무것도 거르지 않는다.
 * 어중간한 때에 잘못 걸러 후보를 비우는 것보다 낫다.
 */
function isWrongSeason(productName: string, season: Season): boolean {
  if (season === "summer") return WINTER_MARKS.test(productName);
  if (season === "autumn" || season === "winter") {
    return SUMMER_MARKS.test(productName);
  }
  return false;
}

/** 이 자리에 내놓으면 안 되는 상품인지. */
export function isWrongOccasion(
  productName: string,
  occasion: Occasion
): boolean {
  if (isWrongSeason(productName, occasion.season)) return true;
  if (!occasion.formal) return false;
  if (CASUAL_MARKS.test(productName)) return true;
  // 하객 자리의 흰 원피스는 신부와 겹친다.
  return (
    occasion.wedding &&
    WHITE_MARKS.test(productName) &&
    /원피스|드레스/.test(productName)
  );
}
