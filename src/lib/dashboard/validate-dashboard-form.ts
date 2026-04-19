import { parseManwonPriceInput } from "@/lib/analyze/parse-manwon-price";
import type { CategoryId } from "@/lib/types/category";
import type { DashboardFormsState } from "@/lib/types/dashboard-forms";

const SITUATION_MIN = 10;

/** 첫 번째 오류 메시지 또는 통과 시 null */
export function validateDashboardForm(
  tab: CategoryId,
  forms: DashboardFormsState
): string | null {
  const notEmpty = (s: string) => s.trim().length > 0;

  const situationOk = (s: string) => s.trim().length >= SITUATION_MIN;
  const pricesOk = (a: string, b: string) =>
    parseManwonPriceInput(a) > 0 && parseManwonPriceInput(b) > 0;

  // 🔥 패션 모드 전용 예외 검증 함수
  const fashionPricesOk = (a: string, b: string) => {
    if (a === "보유중" || b === "보유중") return true;
    return parseManwonPriceInput(a) > 0 && parseManwonPriceInput(b) > 0;
  };

  switch (tab) {
    case "gift": {
      const g = forms.gift;
      if (!notEmpty(g.optionA)) return "A 옵션을 입력해 주세요.";
      if (!notEmpty(g.optionB)) return "B 옵션을 입력해 주세요.";
      if (!notEmpty(g.giftPurpose)) return "선물 목적을 입력해 주세요.";
      if (!pricesOk(g.priceA, g.priceB)) {
        return "A·B 옵션 예상 가격을 각각 입력해 주세요.";
      }
      if (!situationOk(g.situationReason)) {
        return `「선물을 고르며 가장 고민되는 점 (상황 설명)」을 ${SITUATION_MIN}자 이상 적어 주세요.`;
      }
      return null;
    }
    case "appliance": {
      const a = forms.appliance;
      if (!notEmpty(a.optionA)) return "A 옵션을 입력해 주세요.";
      if (!notEmpty(a.optionB)) return "B 옵션을 입력해 주세요.";
      if (!pricesOk(a.priceA, a.priceB)) {
        return "A·B 옵션 예상 가격을 각각 입력해 주세요.";
      }
      if (!situationOk(a.situationReason)) {
        return `「나의 현재 상황 및 고민의 이유」를 ${SITUATION_MIN}자 이상 적어 주세요.`;
      }
      if (a.premiumSpaceAnalysis) {
        if (!notEmpty(a.houseSize)) return "집 평수를 입력해 주세요.";
        if (!notEmpty(a.interiorStyle)) return "인테리어 스타일을 입력해 주세요.";
        if (a.spaceLayoutFiles.length === 0) {
          return "배치할 공간 사진을 업로드해 주세요.";
        }
      }
      return null;
    }
    case "fashion": {
      const f = forms.fashion;
      if (!notEmpty(f.optionA)) return "A 옵션을 입력해 주세요.";
      if (!notEmpty(f.optionB)) return "B 옵션을 입력해 주세요.";
      if (!notEmpty(f.tpo)) return "TPO를 입력해 주세요.";
      if (!fashionPricesOk(f.priceA, f.priceB)) {
        return "A·B 옵션 예상 가격을 각각 입력해 주세요.";
      }
      if (!situationOk(f.situationReason)) {
        return `「나의 현재 상황 및 고민의 이유」를 ${SITUATION_MIN}자 이상 적어 주세요.`;
      }
      return null;
    }
    case "date": {
      const d = forms.date;
      if (!notEmpty(d.optionA)) return "A 옵션을 입력해 주세요.";
      if (!notEmpty(d.optionB)) return "B 옵션을 입력해 주세요.";
      if (!notEmpty(d.tripPurpose)) return "여행·데이트 목적을 입력해 주세요.";
      if (!notEmpty(d.area)) return "지역·목적지를 입력해 주세요.";
      if (!pricesOk(d.priceA, d.priceB)) {
        return "A·B 옵션 예상 가격을 각각 입력해 주세요.";
      }
      if (!situationOk(d.situationReason)) {
        return `「나의 현재 상황 및 고민의 이유」를 ${SITUATION_MIN}자 이상 적어 주세요.`;
      }
      return null;
    }
    case "asset": {
      const x = forms.asset;
      if (!notEmpty(x.optionA)) return "A 옵션을 입력해 주세요.";
      if (!notEmpty(x.optionB)) return "B 옵션을 입력해 주세요.";
      if (!notEmpty(x.type)) return "자산 유형을 입력해 주세요.";
      if (!notEmpty(x.horizon)) return "보유·검토 기간을 입력해 주세요.";
      if (!notEmpty(x.risk)) return "리스크 성향을 입력해 주세요.";
      if (!pricesOk(x.priceA, x.priceB)) {
        return "A·B 옵션 예상 가격을 각각 입력해 주세요.";
      }
      if (!situationOk(x.situationReason)) {
        return `「나의 현재 상황 및 고민의 이유」를 ${SITUATION_MIN}자 이상 적어 주세요.`;
      }
      return null;
    }
    // 🔥 새롭게 추가된 '뭐 먹을까?' 검사 로직!
    case "food": {
      const fd = forms.food;
      if (!notEmpty(fd.optionA)) return "A 메뉴 후보를 입력해 주세요.";
      if (!notEmpty(fd.optionB)) return "B 메뉴 후보를 입력해 주세요.";
      if (!notEmpty(fd.companion)) return "누구와 함께 드시는지 입력해 주세요.";
      if (!notEmpty(fd.preference)) return "원하시는 스타일을 입력해 주세요.";
      if (!pricesOk(fd.priceA, fd.priceB)) {
        return "A·B 메뉴 1인당 예상 가격을 각각 입력해 주세요.";
      }
      if (!situationOk(fd.situationReason)) {
        return `「어떤 상황에서 드시나요?」를 ${SITUATION_MIN}자 이상 적어 주세요.`;
      }
      return null;
    }
    default:
      return null;
  }
}