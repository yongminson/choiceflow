import { NextResponse } from "next/server";

import { generateJson } from "@/lib/ai/generate-json";
import { buildDirectCoupangNpSearchUrl } from "@/lib/monetization/coupang-search";
import { normalizeProductSearchKeyword } from "@/lib/recommendation/recommendation-presentation";
import type { CompareApiResult, CompareVerdict } from "@/lib/types/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 20;
const RATE_BUCKET_MAX = 5_000;

function isRateLimited(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  if (rateBuckets.size > RATE_BUCKET_MAX) {
    rateBuckets.forEach((bucket, bucketKey) => {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    });
  }
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function readReasons(value: unknown): CompareApiResult["reasons"] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 3)
    .map((item) => {
      const record =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        label: clean(record.label, 20),
        text: clean(record.text, 160),
      };
    })
    .filter((item) => item.label && item.text);
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const optionA = clean(body.optionA, 60);
  const optionB = clean(body.optionB, 60);
  const context = clean(body.context, 150);

  if (!optionA || !optionB) {
    return NextResponse.json(
      { ok: false, error: "비교할 두 가지를 모두 입력해 주세요." },
      { status: 400 }
    );
  }
  if (optionA.toLocaleLowerCase("ko") === optionB.toLocaleLowerCase("ko")) {
    return NextResponse.json(
      { ok: false, error: "서로 다른 두 가지를 입력해 주세요." },
      { status: 400 }
    );
  }

  const prompt = `당신은 한국 소비자의 구매 결정을 돕는 전문가다.
사용자는 아래 두 가지 중 무엇을 고를지 정하지 못해 결정을 미루고 있다.

A: ${optionA}
B: ${optionB}
${context ? `사용자 상황: ${context}` : "사용자 상황: 알려지지 않음"}

규칙:
- 반드시 A 또는 B 중 하나를 고른다. "상황에 따라 다르다"로 회피하지 않는다.
- 두 후보가 정말 대등하면 verdict를 "tie"로 하되, 그때도 headline에서
  "무엇을 기준으로 잡으면 어느 쪽인지"를 분명히 말한다.
- 실제로 확인되지 않은 가격, 평점, 후기 수, 점유율 같은 수치는 절대 지어내지 않는다.
- 근거는 두 후보의 실질적인 차이(성능, 유지비, 실패 위험, 활용 빈도, 재판매 가치 등)에서 찾는다.
- 사용자가 나중에 후회할 지점을 각 후보마다 하나씩 짚는다. 이게 이 서비스의 핵심이다.
- 모든 문장은 한국어 존댓말, 광고 문구 없이 담백하게 쓴다.

JSON만 응답:
{
  "verdict": "A" | "B" | "tie",
  "headline": "결론 한 문장 (40자 내외)",
  "reasons": [
    {"label": "근거 제목 (10자 내외)", "text": "구체적 설명 (60~90자)"}
  ],
  "whenOther": "반대쪽을 골라야 하는 조건 (60자 내외)",
  "trapA": "A를 골랐을 때 나중에 후회하기 쉬운 지점 (50자 내외)",
  "trapB": "B를 골랐을 때 나중에 후회하기 쉬운 지점 (50자 내외)",
  "alternative": {
    "name": "둘 다 애매할 때의 제3 후보 (없으면 빈 문자열)",
    "reason": "그 후보를 제안하는 이유 (60자 내외)",
    "searchKeyword": "쿠팡에서 검색 가능한 구체적 상품명"
  },
  "searchKeywordA": "A를 쿠팡에서 찾을 검색어 (제품군 + 구분 조건)",
  "searchKeywordB": "B를 쿠팡에서 찾을 검색어 (제품군 + 구분 조건)"
}

reasons는 2개 또는 3개.`;

  try {
    const generated = await generateJson(prompt);
    const raw = generated?.parsed;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "지금은 비교 결과를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 }
      );
    }

    const record = raw as Record<string, unknown>;
    const rawVerdict = clean(record.verdict, 4).toUpperCase();
    const verdict: CompareVerdict =
      rawVerdict === "A" || rawVerdict === "B" ? rawVerdict : "tie";

    const reasons = readReasons(record.reasons);
    const headline = clean(record.headline, 120);
    if (!headline || reasons.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "비교 근거를 충분히 만들지 못했어요. 조금 더 구체적으로 적어주시면 정확해집니다.",
        },
        { status: 503 }
      );
    }

    const alternativeRecord =
      record.alternative && typeof record.alternative === "object"
        ? (record.alternative as Record<string, unknown>)
        : {};
    const alternativeName = clean(alternativeRecord.name, 40);
    const alternativeKeyword = alternativeName
      ? normalizeProductSearchKeyword(
          clean(alternativeRecord.searchKeyword, 60),
          alternativeName
        )
      : "";

    const keywordA = normalizeProductSearchKeyword(
      clean(record.searchKeywordA, 60),
      optionA
    );
    const keywordB = normalizeProductSearchKeyword(
      clean(record.searchKeywordB, 60),
      optionB
    );

    const result: CompareApiResult = {
      optionA,
      optionB,
      context: context || undefined,
      verdict,
      headline,
      reasons,
      whenOther: clean(record.whenOther, 160),
      trapA: clean(record.trapA, 140),
      trapB: clean(record.trapB, 140),
      alternative: alternativeName
        ? {
            name: alternativeName,
            reason: clean(alternativeRecord.reason, 160),
            searchKeyword: alternativeKeyword,
            sourceUrl: buildDirectCoupangNpSearchUrl(alternativeKeyword),
          }
        : undefined,
      searchKeywordA: keywordA,
      searchKeywordB: keywordB,
      sourceUrlA: buildDirectCoupangNpSearchUrl(keywordA),
      sourceUrlB: buildDirectCoupangNpSearchUrl(keywordB),
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[compare] Failed to build a verdict", error);
    return NextResponse.json(
      {
        ok: false,
        error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      },
      { status: 502 }
    );
  }
}
