import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

/**
 * 추천 JSON 생성 공용 어댑터.
 *
 * 이 서비스의 매출은 "AI가 만든 구체적인 상품 검색어 -> 쿠팡 링크 클릭"에서만
 * 발생한다. AI 호출이 실패하면 정적 폴백 문구가 나가고 전환은 사실상 0이 되므로,
 * 한 provider가 죽어도 다른 provider로 넘어가도록 체인을 구성한다.
 *
 * 순서는 비용이 낮고 지연이 짧은 쪽 -> 품질이 높은 쪽 -> 다른 provider.
 */

/** Gemini 모델 후보 (2026-08 기준 GA 모델) */
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.5-flash-lite",
];

/** OpenAI 모델 후보 */
const OPENAI_MODELS = ["gpt-5-mini"];

/** 성공한 조합을 기억해 다음 요청에서 실패한 모델을 다시 시도하지 않는다. */
let lastGoodGeminiModel: string | null = null;
let lastGoodOpenAiModel: string | null = null;

export type GenerateJsonResult = {
  parsed: unknown;
  provider: "gemini" | "openai";
  model: string;
};

function orderedModels(candidates: string[], lastGood: string | null): string[] {
  if (!lastGood) return candidates;
  return [lastGood, ...candidates.filter((model) => model !== lastGood)];
}

async function tryGemini(
  prompt: string,
  timeoutMs: number
): Promise<GenerateJsonResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const override = process.env.GEMINI_MODEL?.trim();
  const models = override
    ? [override]
    : orderedModels(GEMINI_MODELS, lastGoodGeminiModel);
  const client = new GoogleGenerativeAI(apiKey);

  for (const model of models) {
    try {
      const result = await client
        .getGenerativeModel({ model })
        .generateContent(
          {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          },
          { timeout: timeoutMs }
        );
      const parsed = JSON.parse(result.response.text()) as unknown;
      lastGoodGeminiModel = model;
      return { parsed, provider: "gemini", model };
    } catch (error) {
      console.warn(`[ai] gemini:${model} failed`, error);
    }
  }
  return null;
}

async function tryOpenAi(
  prompt: string,
  timeoutMs: number
): Promise<GenerateJsonResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const override = process.env.OPENAI_MODEL?.trim();
  const models = override
    ? [override]
    : orderedModels(OPENAI_MODELS, lastGoodOpenAiModel);
  const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });

  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) continue;
      const parsed = JSON.parse(text) as unknown;
      lastGoodOpenAiModel = model;
      return { parsed, provider: "openai", model };
    } catch (error) {
      console.warn(`[ai] openai:${model} failed`, error);
    }
  }
  return null;
}

/**
 * JSON 응답을 생성한다. 모든 provider가 실패하면 null을 돌려주고
 * 호출부가 정적 폴백을 쓰도록 한다.
 *
 * `AI_PROVIDER_ORDER=openai,gemini` 로 우선순위를 바꿀 수 있다.
 */
export async function generateJson(
  prompt: string,
  options: { timeoutMs?: number } = {}
): Promise<GenerateJsonResult | null> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const order = (process.env.AI_PROVIDER_ORDER?.trim() || "gemini,openai")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item === "gemini" || item === "openai");

  for (const provider of order.length > 0 ? order : ["gemini", "openai"]) {
    const result =
      provider === "gemini"
        ? await tryGemini(prompt, timeoutMs)
        : await tryOpenAi(prompt, timeoutMs);
    if (result) return result;
  }
  console.error("[ai] All providers failed; falling back to static candidates.");
  return null;
}
