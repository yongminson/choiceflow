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

[🚨 1순위: 에러 검증 (이미지/텍스트 불일치 엄격 차단!)]
- 입력된 텍스트와 사진이 명백하게 다를 경우(예: '삼성' 입력 후 'LG' 사진, '와인' 텍스트에 '여행' 사진) 무조건 FAIL 처리해라.
- 🔥 FAIL 처리 시, "rejection_reason"에 "왜 에러가 났는지" 유저가 빡치지 않게 1~2줄로 짧고 친절하게 적어라. (예: "텍스트와 사진이 맞지 않아요!", "알 수 없는 단어입니다.")
- 단, '스파', '해변', '노래방' 등 일반 장소/명사는 절대 튕겨내지 말고 분석해라.

[🚨 2순위: 팩트 체크 및 절대 승패 기준]
- "item_a_name"과 "item_b_name"은 유저가 입력한 텍스트를 100% 똑같이 복사해라.
- 두 옵션이 비슷해도 승자가 매번 바뀌지 않게, [가성비], [편의성] 중 하나를 기준으로 단호하게 한쪽의 손을 들어라.

[🚨 3순위: 장단점 구조화]
- "table": 단어 1~2개가 아니라, 특징이 포함된 15~20자 내외의 핵심 요약 문구로 작성해라.

[🚨 4순위: 검색어(search_keyword) 똑똑하게 추출]
- 메인 승자의 "search_keyword": 쿠팡이나 네이버에서 실제 검색 가능한 [핵심 브랜드 + 정확한 상품명]으로 깔끔하게 교정해라. (예: "가방" -> "여성 숄더백", "삼성냉장고" -> "삼성 비스포크 냉장고")
- 대안(option_c): 즉시 구매/검색 가능한 정확한 실물 상품명 1개 제안.

[출력 양식 - JSON]
{
  "status": "PASS",
  "item_a_name": "유저입력 A",
  "item_b_name": "유저입력 B",
  "winnerName": "승자 이름",
  "score": 85,
  "search_keyword": "스마트하게 정제된 쇼핑 검색어",
  "win_percentage": 85,
  "regret_probability": 15,
  "real_reviews_summary": ["리뷰1", "리뷰2", "리뷰3"],
  "comparison_metrics": [{"label": "가성비", "a_score": 80, "b_score": 90}],
  "option_c": {"name": "대안 상품명", "reason": "이유", "search_keyword": "정확한 실물 상품/장소명"},
  "analysis_text": "비교 요약",
  "table": {
    "A": { "pros": ["구체적 장점", "구체적 장점"], "cons": ["구체적 단점", "구체적 단점"] },
    "B": { "pros": ["구체적 장점", "구체적 장점"], "cons": ["구체적 단점", "구체적 단점"] }
  },
  "killerInsight": "근거가 포함된 강력한 일침",
  "summary": "구체적인 한 줄 요약"
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

  // 🔥 운영자(대표님) 마스터키 설정 (카카오 로그인 시 사용하시는 이메일을 적어주세요!)
  const ADMIN_EMAIL = "yongmincucu@gmail.com"; 
  const isAdmin = user?.email === ADMIN_EMAIL;

  // 운영자가 아니면서 크레딧이 부족할 때만 에러(402) 발생
  if (!isAdmin && (profile?.credits ?? 0) < required) {
    return NextResponse.json({ ok: false, error: "크레딧 부족" }, { status: 402 });
  }

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

    const winner = inferWinner(optionA, optionB, compact.winnerName || "추천 상품", compact.item_a_name || "", compact.item_b_name || "");
    const winnerName = compact.winnerName || "추천 상품";
    
    // 🔥 [핵심 로직] AI가 만든 검색어 받아오기
    let finalSearchKeyword = compact.search_keyword || winnerName;

    // 🔥 [강제 덮어쓰기] "뭐 먹을까(food)" 카테고리일 때만, 무조건 유저가 입력한 글자 100% 그대로 적용!
    if (categoryId === "food") {
      finalSearchKeyword = winner === "A" ? optionA : optionB;
    }

    const out: AnalyzeApiResult = {
      winner: winner,
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
      searchKeyword: finalSearchKeyword,
      optionALabel: compact.item_a_name || optionA,
      optionBLabel: compact.item_b_name || optionB,
      priceAManwon: priceAManwon || 0,
      priceBManwon: priceBManwon || 0,
      budgetManwon: Math.round(((priceAManwon || 0) + (priceBManwon || 0)) / 2),
      categoryId,
      myeongunDeepDataEnabled: !!body.myeongunDeepDataEnabled,
    };

    // 🔥 운영자는 크레딧 차감(update)을 실행하지 않고 통과!
    const updateCreditTask = isAdmin
      ? Promise.resolve() 
      : supabase.from("profiles").update({ credits: (profile?.credits || 0) - required }).eq("id", user.id);

    await Promise.all([
      updateCreditTask,
      // 운영자는 사용한 크레딧(spent_credits) 기록도 0으로 남깁니다.
      supabase.from("analysis_history").insert({ user_id: user.id, category: getCategoryDisplayLabel(categoryId), input_data: body, result_data: out, spent_credits: isAdmin ? 0 : required })
    ]);

    return NextResponse.json({ ok: true, ...out });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "제미나이 엔진 통신 오류" }, { status: 502 });
  }
}