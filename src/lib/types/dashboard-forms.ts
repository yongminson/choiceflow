export type GiftFormState = {
  giftPurpose: string;
  giverNote: string;
  /** 나의 성별·연령대 (이성/동성/상하 관계 맥락) */
  giverAgeGender: string;
  receiverAgeGender: string;
  receiverInterests: string;
  optionA: string;
  optionB: string;
  filesA: File[];
  filesB: File[];
  /** A 옵션 예상 가격 (만 원 등 자유 입력, 숫자 추출) */
  priceA: string;
  /** B 옵션 예상 가격 */
  priceB: string;
  /** 나의 현재 상황 및 이 선택이 고민되는 진짜 이유 (필수) */
  situationReason: string;
};

export type ApplianceFormState = {
  optionA: string;
  optionB: string;
  priceA: string;
  priceB: string;
  situationReason: string;
  linkUrlA: string;
  linkUrlB: string;
  filesA: File[];
  filesB: File[];
  premiumSpaceAnalysis: boolean;
  houseSize: string;
  interiorStyle: string;
  spaceLayoutFiles: File[];
};

export type FashionFormState = {
  tpo: string;
  optionA: string;
  optionB: string;
  filesA: File[];
  filesB: File[];
  priceA: string;
  priceB: string;
  situationReason: string;
  body: string;
};

export type DateFormState = {
  companion: string;
  tripPurpose: string;
  area: string;
  priceA: string;
  priceB: string;
  situationReason: string;
  vibe: string;
  optionA: string;
  optionB: string;
  filesA: File[];
  filesB: File[];
};

export type AssetFormState = {
  optionA: string;
  optionB: string;
  priceA: string;
  priceB: string;
  situationReason: string;
  filesA: File[];
  filesB: File[];
  type: string;
  horizon: string;
  risk: string;
  note: string;
};

// 🔥 새롭게 추가된 '음식/메뉴' 바구니 설계도!
export type FoodFormState = {
  companion: string; // 예: 직장 동료, 가족, 친구, 혼밥 등
  preference: string; // 예: 매콤한거, 국물, 헤비한거, 가벼운거 등
  area: string; // 🔥 지역 추가!
  optionA: string;
  optionB: string;
  priceA: string; // 1인당 예산
  priceB: string; // 1인당 예산
  situationReason: string; // 점심, 저녁, 야식, 술안주 등
  filesA: File[];
  filesB: File[];
};

export type DashboardFormsState = {
  gift: GiftFormState;
  appliance: ApplianceFormState;
  fashion: FashionFormState;
  date: DateFormState;
  asset: AssetFormState;
  food: FoodFormState; // 🔥 전체 묶음에 food 추가
};

export const initialDashboardForms = (): DashboardFormsState => ({
  gift: {
    giftPurpose: "",
    giverNote: "",
    giverAgeGender: "",
    receiverAgeGender: "",
    receiverInterests: "",
    optionA: "",
    optionB: "",
    filesA: [],
    filesB: [],
    priceA: "",
    priceB: "",
    situationReason: "",
  },
  appliance: {
    optionA: "",
    optionB: "",
    priceA: "",
    priceB: "",
    situationReason: "",
    linkUrlA: "",
    linkUrlB: "",
    filesA: [],
    filesB: [],
    premiumSpaceAnalysis: false,
    houseSize: "",
    interiorStyle: "",
    spaceLayoutFiles: [],
  },
  fashion: {
    tpo: "",
    optionA: "",
    optionB: "",
    filesA: [],
    filesB: [],
    priceA: "",
    priceB: "",
    situationReason: "",
    body: "",
  },
  date: {
    companion: "",
    tripPurpose: "",
    area: "",
    priceA: "",
    priceB: "",
    situationReason: "",
    vibe: "",
    optionA: "",
    optionB: "",
    filesA: [],
    filesB: [],
  },
  asset: {
    optionA: "",
    optionB: "",
    priceA: "",
    priceB: "",
    situationReason: "",
    filesA: [],
    filesB: [],
    type: "",
    horizon: "",
    risk: "",
    note: "",
  },
  // 🔥 음식 바구니 초기화(비워두기) 설정
  food: {
    companion: "",
    preference: "",
    area: "", // 🔥 지역 초기값 추가!
    optionA: "",
    optionB: "",
    priceA: "",
    priceB: "",
    situationReason: "",
    filesA: [],
    filesB: [],
  },
});