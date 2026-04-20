import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type {
  AnalyzeApiResult,
  AnalyzeRequestBody,
  AnalyzeResponse,
} from "@/lib/types/analyze";
import { getRequiredCreditsForAnalyze } from "@/lib/analyze/category-credits";
import { getCategoryDisplayLabel } from "@/lib/category/display-label";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

// 🔥 대표님의 완벽했던 '명사형 15자' 원본 프롬프트 100% 롤백
const SYSTEM_PROMPT = `당신은 최고 권위의 분석 전문가입니다.
반드시 아래 규칙에 따라 판단하고 오직 JSON으로만 응답하세요.

[🚨 1순위: 에러 검증 및 정확한 사유 (텍스트/이미지/링크 크로스체크!)]
- 무의미한 텍스트(예: dugod) -> rejection_reason: "의미를 알 수 없는 텍스트가 입력되었습니다."
- 완전히 똑같은 이미지 -> rejection_reason: "두 옵션에 완전히 동일한 이미지가 업로드되었습니다."
- 사진 뒤바뀜(크로스) -> rejection_reason: "입력하신 옵션 이름과 사진이 서로 뒤바뀌어 업로드되었습니다."
- 텍스트, 사진, 링크(URL) 용도 불일치 -> rejection_reason: "입력하신 이름, 사진, 링크의 제품 정보가 서로 일치하지 않습니다."
  ⚠️ (핵심: A옵션 이름은 '냉장고'인데, 첨부된 A링크(URL) 주소 문자열 안에 '선풍기'나 'fan' 등 명백히 다른 제품을 암시하는 단어가 있다면 무조건 FAIL 처리해라!)

[🚨 2순위: 이름 절대 유지 및 팩트 체크 (창조/상상 금지!)]
- "item_a_name"과 "item_b_name"은 내가 [분석 요청]에서 준 유저입력 텍스트를 글자 하나 바꾸지 말고 100% 똑같이 복사해서 넣어라.
- "winnerName"은 A나 B의 이름과 100% 일치해야 한다.
- 제품에 원래 없는 스펙이나 단점(예: 필터가 없는데 필터 교체 언급)을 절대 지어내지 마라. 확실한 팩트만 적어라.

[🚨 3순위: 찐 리뷰 작성 및 표 초압축 구조화]
- "real_reviews_summary": 승리한 제품의 순수 후기만 적되, 유저 상황이나 패배한 옵션 언급을 절대 금지. 커뮤니티 찐 후기 3개.
- "table": 무조건 15자 이내의 짧고 강력한 '단답형(명사형)'으로 요약해라.
  - pros: ["장점: 짧은명사", "추천: 짧은명사", "우위: 짧은명사"]
  - cons: ["단점: 짧은명사", "불만: 짧은명사"]

[🚨 4순위: 검색어(search_keyword) 이원화 규칙 - 절대 엄수!!!]
- 메인 승자의 "search_keyword"는 유저가 입력한 텍스트(winnerName)를 100% 그대로 똑같이 적어라. (단, 음식 카테고리일 경우에만 유저 상황의 '지역'을 이름 앞에 붙여라. 맛집 단어는 절대 금지)
- 단, 대안 추천인 "option_c"의 "search_keyword"는 반드시 즉시 구매 가능한 "정확한 1개의 실물 상품명(브랜드+모델명)"으로 똑똑하게 제안해라. (추상적 단어 금지)

[출력 양식 - 반드시 JSON 형식 반환]
- 차단 시: { "status": "FAIL", "rejection_reason": "..." }
- 정상 시:
{
  "status": "PASS",
  "item_a_name": "유저입력 A",
  "item_b_name": "유저입력 B",
  "winnerName": "승자 이름",
  "score": 85,
  "search_keyword": "승리한 상품(winnerName)과 100% 동일한 텍스트",
  "win_percentage": 85,
  "regret_probability": 15,
  "real_reviews_summary": ["찐 리뷰1", "찐 리뷰2", "찐 리뷰3"],
  "comparison_metrics": [{"label": "항목1", "a_score": 80, "b_score": 90}],
  "option_c": {"name": "대안 실물 상품명", "reason": "이유", "search_keyword": "대안과 관련된 정확한 [1개의 실물 물건명]"},
  "analysis_text": "비교 요약",
  "table": {
    "A": { "pros": ["장점: ...", "추천: ...", "우위: ..."], "cons": ["단점: ...", "불만: ..."] },
    "B": { "pros": ["장점: ...", "추천: ...", "우위: ..."], "cons": ["단점: ...", "불만: ..."] }
  },
  "killerInsight": "승자를 강력히 추천하는 전문가의 일침",
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
      temperature: 0.0 // 🔥 상상력 완전 차단 (거짓 정보 생성 방지)
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

  let finalPrompt = `${SYSTEM_PROMPT}\n\n[분석 요청]\n유저입력 A: ${optionA}\nA 제품 링크: ${urlA}\n유저입력 B: ${optionB}\nB 제품 링크: ${urlB}\n상황: ${situationReason || "없음"}`;

  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `${optionA} vs ${optionB} 실제 사용자 후기 단점`,
          search_depth: "basic", include_answer: true, max_results: 3 
        })
      });
      if (tavilyRes.ok) {
        const searchData = await tavilyRes.json();
        const searchSummary = searchData.answer || searchData.results?.map((r: any) => r.content).join("\n") || "";
        if (searchSummary) {
          finalPrompt += `\n\n[🔥 실시간 검색 데이터]\n${searchSummary}`;
        }
      }
    } catch (e) { console.error("Tavily Error:", e); }
  }

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

    const out: AnalyzeApiResult = {
      winner: inferWinner(optionA, optionB, compact.winnerName || "", compact.item_a_name || "", compact.item_b_name || ""),
      winnerName: compact.winnerName || "추천 상품",
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
      searchKeyword: compact.search_keyword || compact.winnerName || "추천 상품",
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