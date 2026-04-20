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

const SYSTEM_PROMPT = `당신은 엄격한 데이터 검증관이자 분석 전문가입니다.
응답은 반드시 JSON 형식이어야 합니다.

[🚨 0순위: 킬 스위치 (즉각 차단 조건 - 무관용 원칙)]
다음 중 하나라도 해당하면, 다른 어떠한 분석도 하지 말고 오직 아래의 JSON만 반환하고 즉시 종료해라.
{"status": "FAIL", "rejection_reason": "거절 사유"}

1. 이미지 불일치 (가장 중요): 
   - 유저입력 A의 이름과 [이미지 A]의 피사체가 명백히 다를 경우.
   - 유저입력 B의 이름과 [이미지 B]의 피사체가 명백히 다를 경우.
   - (예: 텍스트는 '삼겹살'인데 이미지는 '와인', 텍스트는 '가방'인데 이미지는 '신발'인 경우. '같이 쓸 수 있으니까' 등의 융통성 절대 금지!)
2. 이미지 중복: [이미지 A]와 [이미지 B]가 완전히 동일한 사진일 경우.
3. 사진 뒤바뀜: A의 텍스트가 B의 사진에 있고, B의 텍스트가 A의 사진에 있는 경우.
4. 의미 없는 텍스트: "asdf", "ㅇㅇ" 등 장난식 입력.

[🚨 1순위: 유저 제약 조건 엄수]
- 0순위를 무사히 통과했다면 분석을 시작하되, 유저 상황(situationReason)에 기재된 제약 조건(예: "회 못 먹음", "1차에 고기 먹음")을 위반하는 옵션은 무조건 패배 처리해라.

[🚨 2순위: 찐 리뷰 작성]
- "real_reviews_summary": 승리한 옵션의 순수 후기나 특징만 적되, 유저 상황이나 패배한 옵션 언급을 절대 금지해라. 커뮤니티나 포털의 실제 찐 후기 3개를 작성해라. (음식의 경우 실제 방문자들의 맛집 리뷰나 메뉴 특징을 적을 것)

[🚨 3순위: 검색어(search_keyword) 최적화 규칙 - 절대 엄수!!!]
- 승자의 "search_keyword" 작성 규칙:
  ▶️ 음식(food) 카테고리: 유저 상황에 있는 [지역] 정보와 승자 이름을 합쳐서 검색어를 만들어라. (예: "강남역 삼겹살", "내 주변 노래방"). 절대 뒤에 '맛집' 같은 단어를 임의로 붙이지 마라. 노래방에 맛집이 붙으면 검색이 망가진다.
  ▶️ 그 외 카테고리: 유저가 입력한 텍스트를 100% 동일하게 적어라.
- 단, 대안 추천인 "option_c"의 "search_keyword"는 반드시 즉시 구매/검색 가능한 "정확한 실물 상품명"으로 제안해라.

[🚨 4순위: 팩트 체크 엄수 - 상상 금지!!!]
- 제품에 존재하지 않는 스펙(예: 필터가 없는 제품에 필터 교체 단점 지적 등)을 절대 지어내지 마라. 검색 데이터와 객관적 사실에만 기반해서 장단점을 작성해라.

[정상 통과 시 출력 양식 - 반드시 JSON 형식 반환]
{
  "status": "PASS",
  "item_a_name": "유저입력 A",
  "item_b_name": "유저입력 B",
  "winnerName": "승자 이름",
  "score": 85,
  "search_keyword": "승리한 옵션과 100% 동일한 텍스트",
  "win_percentage": 85,
  "regret_probability": 15,
  "real_reviews_summary": ["리뷰1", "리뷰2", "리뷰3"],
  "comparison_metrics": [{"label": "항목1", "a_score": 80, "b_score": 90}],
  "option_c": {"name": "대안 상품명", "reason": "이유", "search_keyword": "대안 실물 검색어"},
  "analysis_text": "비교 요약",
  "table": {
    "A": { "pros": ["짧은명사", "짧은명사"], "cons": ["짧은명사", "짧은명사"] },
    "B": { "pros": ["짧은명사", "짧은명사"], "cons": ["짧은명사", "짧은명사"] }
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
      temperature: 0.0 // 🔥 핵심! 창의성을 0으로 만들어 절대 상상하지 못하게 함
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