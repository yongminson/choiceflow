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

// 🔥 잃어버렸던 대표님의 완벽한 프롬프트(이름유지, 명사형 단답 요약) 100% 복구!
const SYSTEM_PROMPT = `당신은 최고 권위의 분석 전문가입니다.
반드시 아래 규칙에 따라 판단하고 오직 JSON으로만 응답하세요.

[🚨 1순위: 킬 스위치 및 에러 검증 (즉각 차단 조건)]
- 의미를 알 수 없는 텍스트, 완전히 동일한 이미지 업로드, 텍스트와 사진/링크 정보가 불일치할 경우 무조건 FAIL 처리하고 사유를 반환해라.

[🚨 2순위: 이름 절대 유지 (창조 금지!) 및 팩트 엄수]
- "item_a_name"과 "item_b_name"은 내가 [분석 요청]에서 준 유저입력 텍스트를 글자 하나 바꾸지 말고 100% 똑같이 복사해서 넣어라.
- 제품에 존재하지 않는 스펙(예: 필터가 없는 제품에 필터 교체 단점 지적 등)을 절대 상상해서 지어내지 마라. 객관적 팩트만 적어라.

[🚨 3순위: 찐 리뷰 작성 및 표 초압축 구조화 (절대 규칙)]
- "real_reviews_summary": 승리한 옵션의 순수 후기만 적어라.
- "table": 무조건 15자 이내의 짧고 강력한 '단답형(명사형)'으로 요약해라. 문장형으로 길게 쓰지 마라!!!
  - pros: ["강력한 처리 성능", "우수한 냄새 관리", "다양한 모델 선택"] (이런 식으로 명사로 딱딱 끊어서)
  - cons: ["필터 교체 주기", "초기 가동 시간", "설치 공간 고려"]

[🚨 4순위: 검색어(search_keyword) 최적화 규칙]
- 음식(food) 카테고리: 유저 상황에 있는 [지역] 정보와 승자 이름을 합쳐라. (예: "강남역 삼겹살"). 절대 뒤에 '맛집'을 붙이지 마라.
- 그 외 카테고리: 메인 승자의 "search_keyword"는 유저가 입력한 텍스트(winnerName)를 100% 그대로 똑같이 적어라.
- 대안(option_c): 반드시 즉시 구매/검색 가능한 "정확한 1개의 실물 상품명(브랜드+모델명)"으로 제안해라.

[정상 통과 시 출력 양식 - 반드시 JSON 형식 반환]
{
  "status": "PASS",
  "item_a_name": "유저입력 A",
  "item_b_name": "유저입력 B",
  "winnerName": "승자 이름",
  "score": 85,
  "search_keyword": "승리한 상품(winnerName)과 동일한 텍스트 또는 음식 지역검색어",
  "win_percentage": 85,
  "regret_probability": 15,
  "real_reviews_summary": ["찐 리뷰1", "찐 리뷰2", "찐 리뷰3"],
  "comparison_metrics": [{"label": "항목1", "a_score": 80, "b_score": 90}],
  "option_c": {"name": "대안 실물 상품명", "reason": "이유", "search_keyword": "대안과 관련된 정확한 [1개의 실물 물건명]"},
  "analysis_text": "비교 요약",
  "table": {
    "A": { "pros": ["장점: 명사형", "추천: 명사형", "우위: 명사형"], "cons": ["단점: 명사형", "불만: 명사형"] },
    "B": { "pros": ["장점: 명사형", "추천: 명사형", "우위: 명사형"], "cons": ["단점: 명사형", "불만: 명사형"] }
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
      temperature: 0.0 // 🔥 상상력 0% 고정 (무조건 팩트만!)
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