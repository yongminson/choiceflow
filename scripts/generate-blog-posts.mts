/**
 * 블로그 글 자동 생성.
 *
 * GitHub Actions 가 정해진 시각에 실행한다. 아직 쓰지 않은 주제를 목록에서
 * 꺼내 OpenAI 로 초안을 만들고, 검증을 통과한 것만 파일로 남긴다.
 *
 * 검증에 걸리면 문제 목록을 그대로 모델에게 돌려주고 한 번 더 시킨다.
 * 두 번째도 실패하면 그 주제는 건너뛴다. 기준을 낮춰 통과시키지 않는다.
 * 통과 못 한 글을 실어 봐야 검색에도, 읽는 사람에게도 도움이 되지 않는다.
 *
 * 실행: node --experimental-strip-types scripts/generate-blog-posts.mts
 * 환경변수: OPENAI_API_KEY (필수), POSTS_PER_RUN (선택, 기본 3)
 */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  POST_RULES,
  validateBlogPost,
  type BlogPost,
} from "../src/lib/blog/post-schema.ts";

const ROOT = process.cwd();
const TOPICS_PATH = path.join(ROOT, "content/blog/topics.json");
const POSTS_DIR = path.join(ROOT, "content/blog/posts");

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const POSTS_PER_RUN = Math.max(
  1,
  Math.min(5, Number(process.env.POSTS_PER_RUN) || 3)
);

type Topic = { slug: string; topic: string; categoryId: BlogPost["categoryId"] };

const CATEGORY_LABEL: Record<BlogPost["categoryId"], string> = {
  food: "음식",
  gift: "선물",
  appliance: "가전·디지털",
  fashion: "패션",
  date: "여행·데이트",
  asset: "렌탈·큰 지출",
};

function buildPrompt(topic: Topic, problems?: string[]): string {
  const today = new Date().toISOString().slice(0, 10);

  return `당신은 한국 소비자에게 구매 판단 기준을 알려주는 글을 씁니다.

주제: ${topic.topic}
카테고리: ${CATEGORY_LABEL[topic.categoryId]}
slug: ${topic.slug}
publishedAt: ${today}
categoryId: ${topic.categoryId}

[이 글의 목적]
특정 상품을 홍보하는 글이 아닙니다. "무엇을 사라"가 아니라
"무엇을 기준으로 판단하라"를 알려주는 글입니다.
읽고 나면 매장이나 쇼핑몰에서 스스로 비교할 수 있어야 합니다.

[반드시 지킬 것]
1. 구체적인 제품명·브랜드명을 쓰지 않는다. 기준만 다룬다.
2. 확인할 수 없는 수치를 만들지 않는다.
   "10만 명이 선택", "만족도 98%", "전문가 추천" 같은 표현은 금지다.
   숫자를 쓰려면 규격이나 단위처럼 누구나 확인 가능한 것만 쓴다.
   (예: "소음은 dB 로 표기되며 60dB 이상은 대화가 어렵다")
3. 각 기준은 왜 중요한지(why)와 실제로 어떻게 확인하는지(how)를 나눠 쓴다.
   how 에는 상세페이지에서 볼 항목이나 매장에서 해 볼 동작처럼
   바로 따라 할 수 있는 것을 적는다.
4. mistakes 에는 실제로 자주 벌어지는 실수를 쓴다.
   "잘 알아보지 않고 산다" 같은 뻔한 말은 쓰지 않는다.
5. 광고 문구 톤을 쓰지 않는다. 담백한 설명체로 쓴다.
6. 문체는 "~합니다", "~입니다" 존댓말로 통일한다.
   글마다 말투가 달라지면 한 사람이 쓴 글로 읽히지 않는다.

[분량]
- intro: ${POST_RULES.introMin}자 이상
- criteria: ${POST_RULES.criteriaMin}~${POST_RULES.criteriaMax}개, why·how 각 ${POST_RULES.criterionTextMin}자 이상
- mistakes: ${POST_RULES.mistakesMin}개 이상, 각 ${POST_RULES.mistakeTextMin}자 이상
- checklist: ${POST_RULES.checklistMin}개 이상, 각 ${POST_RULES.checklistTextMin}자 이상
- faq: ${POST_RULES.faqMin}개 이상, answer 각 ${POST_RULES.faqAnswerMin}자 이상
- title: ${POST_RULES.titleMin}~${POST_RULES.titleMax}자
- description: ${POST_RULES.descriptionMin}~${POST_RULES.descriptionMax}자
${
  problems?.length
    ? `\n[직전 결과가 아래 이유로 반려되었습니다. 모두 고쳐서 다시 쓰세요]\n${problems
        .map((item) => `- ${item}`)
        .join("\n")}`
    : ""
}

아래 JSON 형식으로만 응답하세요. 다른 말은 붙이지 마세요.
{"slug":"${topic.slug}","title":"","description":"","categoryId":"${topic.categoryId}","publishedAt":"${today}","intro":"","criteria":[{"name":"","why":"","how":""}],"mistakes":[""],"checklist":[""],"faq":[{"question":"","answer":""}]}`;
}

async function callOpenAI(prompt: string): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY 가 설정되지 않았습니다.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI 응답 실패 ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI 응답이 비어 있습니다.");
  return JSON.parse(content);
}

async function loadWrittenSlugs(): Promise<Set<string>> {
  if (!existsSync(POSTS_DIR)) return new Set();
  const files = await readdir(POSTS_DIR);
  return new Set(
    files.filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5))
  );
}

async function generateOne(topic: Topic): Promise<BlogPost | null> {
  let problems: string[] | undefined;

  // 한 번 반려되면 이유를 붙여 다시 시킨다. 두 번째도 실패하면 넘어간다.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const raw = await callOpenAI(buildPrompt(topic, problems));
      const result = validateBlogPost({ ...(raw as object), slug: topic.slug });
      if (result.ok) return result.post;

      problems = result.problems;
      console.warn(
        `[blog] ${topic.slug} 시도 ${attempt} 반려:\n  - ${result.problems.join("\n  - ")}`
      );
    } catch (error) {
      console.error(
        `[blog] ${topic.slug} 시도 ${attempt} 오류:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
  return null;
}

async function main() {
  const topics = JSON.parse(await readFile(TOPICS_PATH, "utf8")) as Topic[];
  const written = await loadWrittenSlugs();
  const pending = topics.filter((topic) => !written.has(topic.slug));

  if (pending.length === 0) {
    console.log("[blog] 남은 주제가 없습니다. topics.json 에 주제를 추가하세요.");
    return;
  }

  await mkdir(POSTS_DIR, { recursive: true });

  let saved = 0;
  for (const topic of pending.slice(0, POSTS_PER_RUN)) {
    const post = await generateOne(topic);
    if (!post) {
      console.warn(`[blog] ${topic.slug} 건너뜀 (기준 미달)`);
      continue;
    }
    await writeFile(
      path.join(POSTS_DIR, `${post.slug}.json`),
      `${JSON.stringify(post, null, 2)}\n`,
      "utf8"
    );
    saved += 1;
    console.log(`[blog] 저장: ${post.slug} — ${post.title}`);
  }

  console.log(
    `[blog] 완료. ${saved}편 저장, 남은 주제 ${pending.length - Math.min(pending.length, POSTS_PER_RUN)}개`
  );
}

main().catch((error) => {
  console.error("[blog] 실행 실패:", error);
  process.exit(1);
});
