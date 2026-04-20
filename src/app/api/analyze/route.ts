import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type {
  AnalyzeApiResult,
  AnalyzeRequestBody,
} from "@/lib/types/analyze";
import { getRequiredCreditsForAnalyze } from "@/lib/analyze/category-credits";
import { getCategoryDisplayLabel } from "@/lib/category/display-label";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const SYSTEM_PROMPT = `당신은 최고 권위의 분석 전문가입니다.
반드시 아래 규칙에 따라 판단하고 오직 JSON으로만 응답하세요.

[🚨 1순위: 에러 검증 (즉각 차단 조건)]
- 무의미한 텍스트, 완전히 동일한 이미지, 텍스트와 사진/링크 불일치 시 무조건 FAIL 처리.

[🚨 2순위: 팩트 체크 및 이름 유지 (가장 중요!!!)]
- "item_a_name"과 "item_b_name"은 유저가 입력한 텍스트를 100% 똑같이 복사해라.
- 제품 스펙(필터 유무, 소음, 유지비 등)에 대해 객관적인 Fact만 사용해라. 절대 없는 단점을 상상해서 지어내지 마라!

[🚨 3순위: 찐 리뷰 작성 및 표 초압축 구조화]
- "real_reviews_summary": 승리한 제품의 객관적이고 대표적인 실제 평가 3개를 적어라.
- "table": 무조건 15자 이내의 짧고 강력한 '단답형(명사형)'으로 요약해라. (문장형 절대 금지)
  - pros: ["장점: 짧은명사", "우위: 짧은명사"]
  - cons: ["단점: 짧은명사", "불만: 짧은명사"]

[🚨 4순위: 검색어(search_keyword) 규칙]
- 메인 승자의 "search_keyword": 유저 입력 텍스트 그대로 작성. (음식 카테고리일 경우에만 지역명 + 음식명)
- 대안(option_c) "search_keyword": 즉시 구매 가능한 정확한 실물 상품명(브랜드+모델명) 1개만 제안.

[출력 양식 - JSON]
{
  "status": "PASS",
  "item_a_name": "유저입력 A",
  "item_b_name": "유저입력 B",
  "winnerName": "승자 이름",
  "score": 85,
  "search_keyword": "검색어",
  "win_percentage": 85,
  "regret_probability": 15,
  "real_reviews_summary": ["리뷰1", "리뷰2", "리뷰3"],
  "comparison_metrics": [{"label": "가성비", "a_score": 80, "b_score": 90}],
  "option_c": {"name": "대안 상품명", "reason": "이유", "search_keyword": "정확한 실물 상품명"},
  "analysis_text": "비교 요약",
  "table": {
    "A": { "pros": ["명사형", "명사형"], "cons": ["명사형", "명사형"] },
    "B": { "pros": ["명사형", "명사형"], "cons": ["명사형", "명사형"] }
  },
  "killerInsight": "강력한 일침",
  "summary": "한 줄 요약"
}`;

function parseRequestImages(body: AnalyzeRequestBody): string[] {
  const raw = body.images;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.startsWith("data:image/") && x.length > 0);
}

function inferWinner(optionA: string, optionB: string, winnerName: string, itemAName: string, itemBName: string): "A" | "B" {
  const wl = winnerName.trim().toLowerCase();
  const aName = itemAName.trim().toLowerCase();
  const bName = itemBName.trim().toLowerCase();
  if (wl === aName) return "A";
  if (wl === bName) return "B";
  const a = optionA.trim().toLowerCase();
  const b = optionB.trim().toLowerCase();
  if (a.includes(wl) && !b.includes(wl)) return "A";
  if (b.includes(wl) && !a.includes(wl)) return "B";
  return "A";
}

async function generateGeminiJson(apiKey: string, prompt: string, base64Images: string[]) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const parts: any[] = [{ text: prompt }];

  if (base64Images[0]) {
    parts.push({ text: "\n\n[이미지 A]" });
    const [mimePart, dataPart] = base64Images[0].split(",");
    parts.push({ inlineData: { data: dataPart, mimeType: mimePart.split(":")[1].split(";")[0] } });
  }
  
  if (base64Images[1]) {
    parts.push({ text: "\n\n[이미지 B]" });
    const [mimePart, dataPart] = base64Images[1].split(",");
    parts.push({ inlineData: { data: dataPart, mimeType: mimePart.split(":")[1].split(";")[0] } });
  }

  const contents = [{ role: "user", parts }];

  const result = await model.generateContent({
    contents,
    generationConfig: { 
      responseMimeType: "application/json",
      temperature: 0.0
    }
  });

  return result.response.text();
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "JSON 오류" }, { status: 400 }); }

  const { optionA, optionB, categoryId, isPremium, situationReason, priceAManwon, priceBManwon } = body;
  
  const supabase = createRouteHandlerSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle();
  const required = getRequiredCreditsForAnalyze(categoryId, isPremium);
  if ((profile?.credits ?? 0) < required) return NextResponse.json({ ok: false, error: "크레딧 부족" }, { status: 402 });

  const urlA = (body as any).urlA || (body as any).linkA || (body as any).productUrlA || (body as any).optionAUrl || "없음";
  const urlB = (body as any).urlB || (body as any).linkB || (body as any).productUrlB || (body as any).optionBUrl || "없음";

  const finalPrompt = `${SYSTEM_PROMPT}\n\n[분석 요청]\n유저입력 A: ${optionA}\nA 제품 링크: ${urlA}\n유저입력 B: ${optionB}\nB 제품 링크: ${urlB}\n상황: ${situationReason || "없음"}`;

  try {
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const validImages = parseRequestImages(body);
    const rawText = await generateGeminiJson(geminiKey, finalPrompt, validImages);
    
    let compact;
    try {
      const cleanText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      compact = JSON.parse(cleanText);
    } catch (e) {
      return NextResponse.json({ ok: false, error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    if (compact.status === "FAIL" || compact.rejection_reason) {
      return NextResponse.json({ ok: false, status: "REJECTED", reason: compact.rejection_reason || "잘못된 입력입니다." });
    }

    const winnerName = compact.winnerName || "추천 상품";
    let finalSearchKeyword = compact.search_keyword || winnerName;

    // 🔥 AI가 헛소리 못하게 하는 절대 강제 로직!
    // 카테고리가 '음식(food)'이 아니면 무조건 AI가 만든 검색어 버리고 유저 입력값(winnerName)을 꽂아버립니다.
    if (categoryId !== "food") {
      finalSearchKeyword = winnerName;
    }

    const out: AnalyzeApiResult = {
      winner: inferWinner(optionA, optionB, winnerName, compact.item_a_name || "", compact.item_b_name || ""),
      winnerName: winnerName,
      score: compact.score || 80,
      winPercentage: compact.win_percentage || 80,
      regretProbability: compact.regret_probability || 20,
      realReviews: compact.real_reviews_summary || [],
      comparisonMetrics: compact.comparison_metrics?.map((m: any) => ({ label: m.label, a: m.a_score, b: m.b_score })),
      optionC: compact.option_c ? { name: compact.option_c.name, reason: compact.option_c.reason, searchKeyword: compact.option_c.search_keyword || "" } : undefined,
      analysisText: compact.analysis_text || "",
      table: compact.table || { A: { pros: [], cons: [] }, B: { pros: [], cons: [] } },
      killerInsight: compact.killerInsight || "",
      summary: compact.summary || "",
      searchKeyword: finalSearchKeyword, // 🔥 강제로 고정된 검색어 탑재
      optionALabel: compact.item_a_name || optionA,
      optionBLabel: compact.item_b_name || optionB,
      priceAManwon: priceAManwon || 0,
      priceBManwon: priceBManwon || 0,
      budgetManwon: Math.round(((priceAManwon || 0) + (priceBManwon || 0)) / 2),
      categoryId,
      myeongunDeepDataEnabled: !!body.myeongunDeepDataEnabled,
    };

    await Promise.all([
      supabase.from("profiles").update({ credits: (profile?.credits || 0) - required }).eq("id", user.id),
      supabase.from("analysis_history").insert({ user_id: user.id, category: getCategoryDisplayLabel(categoryId), input_data: body, result_data: out, spent_credits: required })
    ]);

    return NextResponse.json({ ok: true, ...out });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "제미나이 엔진 통신 오류" }, { status: 502 });
  }
}