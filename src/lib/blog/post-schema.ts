/**
 * 블로그 글의 형식과 검증 규칙.
 *
 * 자동 생성은 양이 늘어날수록 품질이 무너지기 쉽다. 검색엔진이 문제 삼는 것도
 * "AI로 썼다"가 아니라 "읽을 값이 없는 글이 대량으로 쌓이는 것"이다.
 * 그래서 형식을 고정하고, 아래 기준을 통과하지 못한 글은 저장하지 않는다.
 *
 * 생성 스크립트와 화면이 같은 규칙을 쓰도록 이 파일 하나에 모아 둔다.
 */

export type BuyingCriterion = {
  /** 비교 기준 이름. 예: "소음" */
  name: string;
  /** 왜 이 기준이 중요한지 */
  why: string;
  /** 실제로 어떻게 확인하는지 */
  how: string;
};

export type PostFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** ChoiceFlow 카테고리와 연결해 본문에서 해당 추천 흐름으로 보낸다 */
  categoryId: "food" | "gift" | "appliance" | "fashion" | "date" | "asset";
  publishedAt: string;
  intro: string;
  criteria: BuyingCriterion[];
  /** 사람들이 실제로 하는 실수 */
  mistakes: string[];
  /** 사기 전 확인할 것 */
  checklist: string[];
  faq: PostFaq[];
};

export const POST_RULES = {
  titleMin: 12,
  titleMax: 60,
  descriptionMin: 50,
  descriptionMax: 160,
  introMin: 150,
  criteriaMin: 4,
  criteriaMax: 7,
  criterionTextMin: 40,
  mistakesMin: 3,
  mistakeTextMin: 25,
  checklistMin: 4,
  checklistTextMin: 15,
  faqMin: 3,
  faqAnswerMin: 60,
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CATEGORY_IDS = [
  "food",
  "gift",
  "appliance",
  "fashion",
  "date",
  "asset",
] as const;

/**
 * 근거 없이 숫자를 지어내는 것이 자동 생성 글의 가장 흔한 실패다.
 * "10만 명이 선택한", "만족도 98%" 같은 문구는 확인할 방법이 없으므로 막는다.
 */
const FABRICATED_CLAIM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // 조사가 끼어들 수 있어 단위와 동사 사이에 한글 몇 글자를 허용한다.
  // "10만 명이 선택한", "3만 건 이상 판매된" 모두 걸러야 한다.
  {
    pattern: /\d+\s*만\s*(명|건|개)[가-힣\s]{0,4}(선택|사용|학습|판매|구매)/,
    label: "검증 불가한 사용자·판매 수치",
  },
  { pattern: /만족도[가-힣\s]{0,3}\d+\s*%/, label: "검증 불가한 만족도 수치" },
  {
    pattern: /\d+\s*%\s*(이상\s*)?(의\s*)?(사람|소비자|구매자|이용자)/,
    label: "출처 없는 비율 통계",
  },
  {
    pattern: /(사람|소비자|구매자|이용자)[가-힣\s]{0,3}\d+\s*%/,
    label: "출처 없는 비율 통계",
  },
  { pattern: /(1위|최고|최상급)\s*(브랜드|제품|상품)/, label: "근거 없는 1위·최고 표현" },
  { pattern: /(전문가|의사|변호사)\s*(들이)?\s*추천/, label: "실체 없는 전문가 추천" },
];

export type ValidationResult =
  | { ok: true; post: BlogPost }
  | { ok: false; problems: string[] };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectFabricatedClaims(post: BlogPost): string[] {
  const haystack = [
    post.title,
    post.description,
    post.intro,
    ...post.criteria.flatMap((item) => [item.name, item.why, item.how]),
    ...post.mistakes,
    ...post.checklist,
    ...post.faq.flatMap((item) => [item.question, item.answer]),
  ].join("\n");

  return FABRICATED_CLAIM_PATTERNS.filter(({ pattern }) =>
    pattern.test(haystack)
  ).map(({ label }) => `근거 없는 표현이 있습니다: ${label}`);
}

/**
 * 생성된 글이 실을 만한지 검사한다.
 * 문제를 모두 모아 돌려주므로, 스크립트가 그대로 모델에게 되돌려 고쳐 받을 수 있다.
 */
export function validateBlogPost(value: unknown): ValidationResult {
  const problems: string[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, problems: ["글이 객체 형태가 아닙니다."] };
  }
  const raw = value as Record<string, unknown>;

  const slug = text(raw.slug);
  if (!SLUG_PATTERN.test(slug)) {
    problems.push("slug는 영문 소문자·숫자·하이픈만 사용해야 합니다.");
  }

  const title = text(raw.title);
  if (title.length < POST_RULES.titleMin || title.length > POST_RULES.titleMax) {
    problems.push(
      `title은 ${POST_RULES.titleMin}~${POST_RULES.titleMax}자여야 합니다. (현재 ${title.length}자)`
    );
  }

  const description = text(raw.description);
  if (
    description.length < POST_RULES.descriptionMin ||
    description.length > POST_RULES.descriptionMax
  ) {
    problems.push(
      `description은 ${POST_RULES.descriptionMin}~${POST_RULES.descriptionMax}자여야 합니다. (현재 ${description.length}자)`
    );
  }

  const categoryId = text(raw.categoryId) as BlogPost["categoryId"];
  if (!CATEGORY_IDS.includes(categoryId)) {
    problems.push(`categoryId는 ${CATEGORY_IDS.join(", ")} 중 하나여야 합니다.`);
  }

  const publishedAt = text(raw.publishedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    problems.push("publishedAt은 YYYY-MM-DD 형식이어야 합니다.");
  }

  const intro = text(raw.intro);
  if (intro.length < POST_RULES.introMin) {
    problems.push(
      `intro는 최소 ${POST_RULES.introMin}자여야 합니다. (현재 ${intro.length}자)`
    );
  }

  const criteria = Array.isArray(raw.criteria)
    ? raw.criteria.map((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        return {
          name: text(record.name),
          why: text(record.why),
          how: text(record.how),
        };
      })
    : [];
  if (
    criteria.length < POST_RULES.criteriaMin ||
    criteria.length > POST_RULES.criteriaMax
  ) {
    problems.push(
      `criteria는 ${POST_RULES.criteriaMin}~${POST_RULES.criteriaMax}개여야 합니다. (현재 ${criteria.length}개)`
    );
  }
  criteria.forEach((item, index) => {
    if (!item.name) problems.push(`criteria[${index}].name이 비어 있습니다.`);
    if (item.why.length < POST_RULES.criterionTextMin) {
      problems.push(
        `criteria[${index}].why는 최소 ${POST_RULES.criterionTextMin}자여야 합니다.`
      );
    }
    if (item.how.length < POST_RULES.criterionTextMin) {
      problems.push(
        `criteria[${index}].how는 최소 ${POST_RULES.criterionTextMin}자여야 합니다.`
      );
    }
  });

  const mistakes = Array.isArray(raw.mistakes)
    ? raw.mistakes.map((item) => text(item)).filter(Boolean)
    : [];
  if (mistakes.length < POST_RULES.mistakesMin) {
    problems.push(`mistakes는 최소 ${POST_RULES.mistakesMin}개여야 합니다.`);
  }
  if (mistakes.some((item) => item.length < POST_RULES.mistakeTextMin)) {
    problems.push(
      `mistakes의 각 항목은 최소 ${POST_RULES.mistakeTextMin}자여야 합니다.`
    );
  }

  const checklist = Array.isArray(raw.checklist)
    ? raw.checklist.map((item) => text(item)).filter(Boolean)
    : [];
  if (checklist.length < POST_RULES.checklistMin) {
    problems.push(`checklist는 최소 ${POST_RULES.checklistMin}개여야 합니다.`);
  }
  if (checklist.some((item) => item.length < POST_RULES.checklistTextMin)) {
    problems.push(
      `checklist의 각 항목은 최소 ${POST_RULES.checklistTextMin}자여야 합니다.`
    );
  }

  const faq = Array.isArray(raw.faq)
    ? raw.faq.map((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        return {
          question: text(record.question),
          answer: text(record.answer),
        };
      })
    : [];
  if (faq.length < POST_RULES.faqMin) {
    problems.push(`faq는 최소 ${POST_RULES.faqMin}개여야 합니다.`);
  }
  faq.forEach((item, index) => {
    if (!item.question) problems.push(`faq[${index}].question이 비어 있습니다.`);
    if (item.answer.length < POST_RULES.faqAnswerMin) {
      problems.push(
        `faq[${index}].answer는 최소 ${POST_RULES.faqAnswerMin}자여야 합니다.`
      );
    }
  });

  if (problems.length > 0) return { ok: false, problems };

  const post: BlogPost = {
    slug,
    title,
    description,
    categoryId,
    publishedAt,
    intro,
    criteria,
    mistakes,
    checklist,
    faq,
  };

  const fabricated = collectFabricatedClaims(post);
  if (fabricated.length > 0) return { ok: false, problems: fabricated };

  return { ok: true, post };
}
