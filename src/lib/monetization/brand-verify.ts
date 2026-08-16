/**
 * 카드에 띄울 상품 이름을 정한다.
 *
 * AI 는 후보 이름을 스스로 짓고, 서버는 그 검색어로 쿠팡에서 상품을 찾는다.
 * 두 값이 같은 물건이라는 보장이 없다. 실제로 "삼성전자 비스포크 제트
 * 스테이션"이라고 띄우고 전혀 다른 무명 스틱청소기로 링크가 나간 적이 있다.
 *
 * 브랜드를 지우는 것이 답은 아니다. 브랜드가 보여야 신뢰가 생긴다.
 * 그래서 지우는 대신, 상품을 찾았으면 그 상품의 이름을 그대로 쓴다.
 * 화면에 뜨는 브랜드가 곧 링크되는 상품의 브랜드가 되므로 오표기가 생길 자리가 없다.
 * 상품을 못 찾았을 때만 AI 이름을 쓰고, 이때는 대조할 것이 없어 브랜드를 걷어낸다.
 */

/**
 * 표기가 갈리는 브랜드는 별칭을 함께 둔다. 하나라도 걸리면 같은 브랜드로 본다.
 *
 * 일상어와 겹치는 한글 표기는 넣지 않는다. "브라운 색상", "캐리어 가방",
 * "레이저 프린터", "샤프심"처럼 브랜드가 아닌 쓰임이 더 흔하면, 그 낱말을
 * 브랜드로 보다가 멀쩡한 이름을 잘라먹는다. 이런 브랜드는 영문 표기만 둔다.
 */
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
  ["carrier"],
  ["위니아", "winia", "딤채", "dimchae"],
  ["daewoo"],
  ["필립스", "philips"],
  ["braun"],
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
  ["dell"],
  ["msi", "엠에스아이"],
  ["기가바이트", "gigabyte"],
  ["razer"],
  ["소니", "sony"],
  ["파나소닉", "panasonic"],
  ["sharp"],
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
  ["컬럼비아", "columbia"],
  ["유니클로", "uniqlo"],
  ["zara"],
  ["무신사", "musinsa"],
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

/**
 * 화면에 띄울 이름을 정한다.
 *
 * 상품을 찾았으면 그 상품의 이름을 쓴다. AI 가 지은 이름은 브랜드를 빼고 나면
 * "자동 먼지비움 로봇청소기"처럼 분류 설명이 되어, 읽는 사람이 무엇을 사라는
 * 것인지 알 수 없다. 실제 상품명을 쓰면 그 문제와 브랜드 오표기가 함께 사라진다.
 * 표시되는 이름이 곧 링크되는 상품이 되기 때문이다.
 *
 * 검색이 실패해 붙일 상품이 없을 때만 AI 이름을 쓴다. 이때는 대조할 상품이
 * 없으므로 브랜드를 믿을 수 없어 브랜드가 섞여 있으면 통째로 버린다.
 */
export function resolveDisplayName(
  aiName: string,
  productName: string | undefined
): string {
  const trimmedAi = aiName.trim();
  if (productName?.trim()) return cleanProductName(productName);

  return extractBrands(trimmedAi).length > 0
    ? stripBrands(trimmedAi)
    : trimmedAi;
}

/**
 * 대조할 상품이 없을 때 이름에서 브랜드로 보이는 낱말을 걷어낸다.
 *
 * 낱말 단위로만 지운다. 부분 문자열로 지우면 "샤프심"의 "샤프"처럼 브랜드가
 * 아닌 쓰임까지 걸려 멀쩡한 단어가 잘려 나간다.
 * 긴 표기부터 지워야 "삼성전자"가 "삼성"만 지워지고 "전자"가 남는 일이 없다.
 */
const BRAND_TOKENS = BRAND_ALIASES.flat().sort((a, b) => b.length - a.length);

function stripBrands(name: string): string {
  const kept = name
    .split(/\s+/)
    .filter((token) => {
      const normalized = normalize(token);
      return !BRAND_TOKENS.some((brand) => normalized === normalize(brand));
    })
    .join(" ")
    .trim();

  return kept || name;
}
