import { parseManwonPriceInput } from "@/lib/analyze/parse-manwon-price";
import type { CategoryId } from "@/lib/types/category";
import type { AnalyzeRequestBody } from "@/lib/types/analyze";
import { serializeDashboardForms } from "@/lib/dashboard/serialize-dashboard-forms";
import type { DashboardFormsState } from "@/lib/types/dashboard-forms";

const CATEGORY_LABELS: Record<CategoryId, string> = {
  gift: "선물상담",
  appliance: "홈&가전",
  fashion: "패션",
  date: "데이트/여행",
  asset: "고가자산",
  food: "뭐 먹을까?", // 🔥 라벨 추가
};

function pricesFromForms(
  forms: DashboardFormsState,
  tab: CategoryId
): { priceAManwon: number; priceBManwon: number } {
  switch (tab) {
    case "gift":
      return {
        priceAManwon: parseManwonPriceInput(forms.gift.priceA),
        priceBManwon: parseManwonPriceInput(forms.gift.priceB),
      };
    case "appliance":
      return {
        priceAManwon: parseManwonPriceInput(forms.appliance.priceA),
        priceBManwon: parseManwonPriceInput(forms.appliance.priceB),
      };
    case "fashion":
      return {
        priceAManwon: parseManwonPriceInput(forms.fashion.priceA),
        priceBManwon: parseManwonPriceInput(forms.fashion.priceB),
      };
    case "date":
      return {
        priceAManwon: parseManwonPriceInput(forms.date.priceA),
        priceBManwon: parseManwonPriceInput(forms.date.priceB),
      };
    case "asset":
      return {
        priceAManwon: parseManwonPriceInput(forms.asset.priceA),
        priceBManwon: parseManwonPriceInput(forms.asset.priceB),
      };
    // 🔥 음식 가격 추출 추가
    case "food":
      return {
        priceAManwon: parseManwonPriceInput(forms.food.priceA),
        priceBManwon: parseManwonPriceInput(forms.food.priceB),
      };
    default:
      return { priceAManwon: 0, priceBManwon: 0 };
  }
}

function situationFromForms(
  forms: DashboardFormsState,
  tab: CategoryId
): string {
  switch (tab) {
    case "gift":
      return forms.gift.situationReason.trim();
    case "appliance":
      return forms.appliance.situationReason.trim();
    case "fashion":
      return forms.fashion.situationReason.trim();
    case "date":
      return forms.date.situationReason.trim();
    case "asset":
      return forms.asset.situationReason.trim();
    // 🔥 지역 정보가 없으면 '내 주변'으로 묶어서 배달!
    case "food":
      return `[지역] ${forms.food.area || "내 주변"}\n[동행자] ${forms.food.companion}\n[선호스타일] ${forms.food.preference}\n[상황] ${forms.food.situationReason}`.trim();
    default:
      return "";
  }
}

function optionsFromForms(
  forms: DashboardFormsState,
  tab: CategoryId
): { optionA: string; optionB: string } {
  switch (tab) {
    case "gift":
      return { optionA: forms.gift.optionA, optionB: forms.gift.optionB };
    case "appliance":
      return {
        optionA: forms.appliance.optionA,
        optionB: forms.appliance.optionB,
      };
    case "fashion":
      return { optionA: forms.fashion.optionA, optionB: forms.fashion.optionB };
    case "date":
      return { optionA: forms.date.optionA, optionB: forms.date.optionB };
    case "asset":
      return { optionA: forms.asset.optionA, optionB: forms.asset.optionB };
    // 🔥 음식 옵션 추출 추가
    case "food":
      return { optionA: forms.food.optionA, optionB: forms.food.optionB };
    default:
      return { optionA: "", optionB: "" };
  }
}

/** 대시보드 폼 → /api/analyze 요청 본문 (분석 페이지 등에서 재사용) */
export function buildAnalyzeBodyFromDashboard(
  forms: DashboardFormsState,
  categoryId: CategoryId,
  opts: {
    validateOnly?: boolean;
    myeongunDeepDataEnabled?: boolean;
    /** 프론트에서 Data URL로 변환한 이미지 배열 */
    images?: string[];
  } = {}
): AnalyzeRequestBody {
  const { optionA, optionB } = optionsFromForms(forms, categoryId);
  const { priceAManwon, priceBManwon } = pricesFromForms(forms, categoryId);
  const situationReason = situationFromForms(forms, categoryId);
  const budgetManwon = Math.round((priceAManwon + priceBManwon) / 2);
  const slim = serializeDashboardForms(forms);
  let contextNotes = JSON.stringify({
    myeongunDeepDataEnabled: opts.myeongunDeepDataEnabled === true,
    categoryId,
    forms: slim,
  });
  const max = 14_000;
  if (contextNotes.length > max) {
    contextNotes = `${contextNotes.slice(0, max)}…`;
  }

  const images = Array.isArray(opts.images) ? opts.images : [];

  return {
    optionA: optionA.trim(),
    optionB: optionB.trim(),
    priceAManwon,
    priceBManwon,
    situationReason,
    budgetManwon,
    usagePeriod: "1y-3y",
    priority: "design",
    categoryId,
    category: CATEGORY_LABELS[categoryId],
    contextNotes,
    myeongunDeepDataEnabled: opts.myeongunDeepDataEnabled === true,
    validateOnly: opts.validateOnly === true,
    images,
    ...(categoryId === "appliance"
      ? { isPremium: forms.appliance.premiumSpaceAnalysis === true }
      : {}),
  };
}