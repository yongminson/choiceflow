/**
 * 카드에 띄울 상품 이름을 정한다.
 *
 * AI 는 후보 이름을 스스로 짓고, 서버는 그 검색어로 쿠팡에서 상품을 찾는다.
 * 두 값이 같은 물건이라는 보장이 없다. 실제로 "삼성전자 비스포크 제트
 * 스테이션"이라고 띄우고 전혀 다른 무명 스틱청소기로 링크가 나간 적이 있다.
 *
 * 브랜드를 지우는 것이 답은 아니다. 브랜드가 보여야 신뢰가 생긴다.
 * 그래서 지우는 대신 검증한다. AI 가 붙인 브랜드가 실제 상품명에도 있으면
 * 그대로 쓰고, 없으면 그 이름을 버리고 실제 상품명에서 만들어 쓴다.
 * 결과적으로 화면에 뜨는 브랜드는 항상 실제 판매 상품의 브랜드가 된다.
 */

/** 표기가 갈리는 브랜드는 별칭을 함께 둔다. 하나라도 걸리면 같은 브랜드로 본다. */
const BRAND_ALIASES: string[][] = [
  ["삼성", "삼성전자", "samsung", "비스포크", "bespoke"],
  ["lg", "엘지", "엘G", "코드제로", "codezero", "오브제", "objet"],
  ["다이슨", "dyson"],
  ["샤오미", "xiaomi", "미지아", "mijia"],
  ["로보락", "roborock"],
  ["에코백스", "ecovacs", "디봇", "deebot"],
  ["에브리봇", "everybot"],
  ["아이닉", "ainic", "iinic"],
  ["아이로봇", "irobot", "룸바", "roomba"],
  ["차이슨", "chaison"],
  ["르팡", "lefant"],
  ["드리미", "dreame"],
  ["나르왈", "narwal"],
  ["위닉스", "winix"],
  ["쿠쿠", "cuckoo"],
  ["쿠첸", "cuchen"],
  ["코웨이", "coway"],
  ["청호나이스", "chungho"],
  ["SK매직", "sk매직", "skmagic"],
  ["신일", "shinil"],
  ["한일", "hanil"],
  ["보국", "bokuk"],
  ["캐리어", "carrier"],
  ["위니아", "winia", "딤채", "dimchae"],
  ["대우", "daewoo"],
  ["필립스", "philips"],
  ["브라운", "braun"],
  ["테팔", "tefal"],
  ["일렉트로룩스", "electrolux"],
  ["밀레", "miele"],
  ["보쉬", "bosch"],
  ["발뮤다", "balmuda"],
  ["애플", "apple", "아이폰", "iphone", "맥북", "macbook", "아이패드", "ipad"],
  ["레노버", "lenovo", "씽크패드", "thinkpad"],
  ["에이수스", "asus", "젠북", "zenbook", "비보북", "vivobook"],
  ["에이서", "acer"],
  ["hp", "휴렛팩커드"],
  ["델", "dell"],
  ["msi", "엠에스아이"],
  ["기가바이트", "gigabyte"],
  ["레이저", "razer"],
  ["소니", "sony"],
  ["파나소닉", "panasonic"],
  ["샤프", "sharp"],
  ["도시바", "toshiba"],
  ["나이키", "nike"],
  ["아디다스", "adidas"],
  ["뉴발란스", "newbalance", "new balance"],
  ["아식스", "asics"],
  ["푸마", "puma"],
  ["리복", "reebok"],
  ["컨버스", "converse"],
  ["반스", "vans"],
  ["크록스", "crocs"],
  ["노스페이스", "northface", "north face"],
  ["파타고니아", "patagonia"],
  ["콜롬비아", "columbia"],
  ["유니클로", "uniqlo"],
  ["자라", "zara"],
  ["무신사", "musinsa"],
  ["샤오미미지아"],
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s\-_·・,()[\]/]/g, "");
}

/** 텍스트에 등장하는 브랜드를 대표 이름으로 모아 돌려준다. */
export function extractBrands(text: string): string[] {
  const haystack = normalize(text);
  const found: string[] = [];

  for (const aliases of BRAND_ALIASES) {
    const hit = aliases.some((alias) => haystack.includes(normalize(alias)));
    if (hit) found.push(aliases[0]);
  }
  return found;
}

/**
 * 쿠팡 상품명은 광고 수식어와 옵션이 길게 붙는다.
 * 카드 제목으로 쓸 수 있게 앞뒤 군더더기를 걷어낸다.
 */
export function cleanProductName(productName: string, maxLength = 34): string {
  let cleaned = productName
    // 괄호 안 부연은 대개 옵션·색상이다.
    .replace(/[([{][^)\]}]*[)\]}]/g, " ")
    // 판매 문구
    .replace(
      /(최신형|신형|정품|무료배송|당일발송|무료 ?설치|공식|공식판매|본사직영|한정특가|초특가|특가|사은품|증정|1\+1|국내산|해외직구)/g,
      " "
    )
    // 옵션 나열 구분자 이후는 잘라낸다.
    .split(/[,/|]|＋|\+/)[0]
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > maxLength) {
    // 단어 중간에서 끊기지 않게 마지막 공백에서 자른다.
    const cut = cleaned.slice(0, maxLength);
    const lastSpace = cut.lastIndexOf(" ");
    cleaned = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
  }

  return cleaned || productName.slice(0, maxLength);
}

export type NameCheck =
  | { ok: true }
  | { ok: false; reason: "multiple-brands" | "brand-not-in-product" };

/**
 * AI 가 지은 이름을 그대로 써도 되는지 본다.
 *
 * 막는 것은 두 가지다.
 * - 한 이름에 서로 다른 브랜드가 둘 이상 (예: "샤오미 로보락"). 그런 제품은 없다.
 * - 실제 상품에 없는 브랜드 (예: 무명 스틱청소기를 "삼성전자"로 표기).
 */
export function checkNameAgainstProduct(
  aiName: string,
  productName: string
): NameCheck {
  const nameBrands = extractBrands(aiName);
  if (nameBrands.length === 0) return { ok: true };
  if (nameBrands.length > 1) return { ok: false, reason: "multiple-brands" };

  const productBrands = extractBrands(productName);
  return productBrands.includes(nameBrands[0])
    ? { ok: true }
    : { ok: false, reason: "brand-not-in-product" };
}

/**
 * 화면에 띄울 이름을 정한다.
 * 검증을 통과하면 AI 이름을, 아니면 실제 상품명을 정리해 쓴다.
 */
export function resolveDisplayName(
  aiName: string,
  productName: string | undefined
): string {
  const trimmedAi = aiName.trim();
  if (!productName?.trim()) return trimmedAi;

  return checkNameAgainstProduct(trimmedAi, productName).ok
    ? trimmedAi
    : cleanProductName(productName);
}
