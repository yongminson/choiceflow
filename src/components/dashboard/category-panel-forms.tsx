"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";

import { OptionImageDropzone } from "@/components/dashboard/option-image-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryId } from "@/lib/types/category";
import type {
  ApplianceFormState,
  AssetFormState,
  DashboardFormsState,
  DateFormState,
  FashionFormState,
  GiftFormState,
  FoodFormState,
} from "@/lib/types/dashboard-forms";
import { cn } from "@/lib/utils";

type CategoryPanelFormProps = {
  categoryId: CategoryId;
  forms: DashboardFormsState;
  onFormsChange: (updater: (prev: DashboardFormsState) => DashboardFormsState) => void;
  disabled?: boolean;
};

function patchGift(prev: DashboardFormsState, patch: Partial<GiftFormState>): DashboardFormsState {
  return { ...prev, gift: { ...prev.gift, ...patch } };
}

function patchAppliance(prev: DashboardFormsState, patch: Partial<ApplianceFormState>): DashboardFormsState {
  return { ...prev, appliance: { ...prev.appliance, ...patch } };
}

function patchFashion(prev: DashboardFormsState, patch: Partial<FashionFormState>): DashboardFormsState {
  return { ...prev, fashion: { ...prev.fashion, ...patch } };
}

function patchDate(prev: DashboardFormsState, patch: Partial<DateFormState>): DashboardFormsState {
  return { ...prev, date: { ...prev.date, ...patch } };
}

function patchAsset(prev: DashboardFormsState, patch: Partial<AssetFormState>): DashboardFormsState {
  return { ...prev, asset: { ...prev.asset, ...patch } };
}

// 🔥 음식 폼 헬퍼 함수 추가 (에러 방지)
function patchFood(prev: DashboardFormsState, patch: Partial<FoodFormState>): DashboardFormsState {
  return { ...prev, food: { ...prev.food, ...patch } };
}

const fieldGap = "space-y-10";
const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";

const SITUATION_LABEL = "나의 현재 상황 및 이 선택이 고민되는 진짜 이유 (필수, 10자 이상)";
const GIFT_SITUATION_LABEL = "선물을 고르며 가장 고민되는 점 (상황 설명) (필수, 10자 이상)";

export function CategoryPanelForm({
  categoryId,
  forms,
  onFormsChange,
  disabled = false,
}: CategoryPanelFormProps) {
  const [fashionMode, setFashionMode] = useState<"new" | "wardrobe">("new");

  useEffect(() => {
    if (categoryId === "fashion" && fashionMode === "wardrobe") {
      const currentA = forms.fashion.priceA;
      const currentB = forms.fashion.priceB;
      if (currentA !== "보유중" || currentB !== "보유중") {
        onFormsChange((p) => patchFashion(p, { priceA: "보유중", priceB: "보유중" }));
      }
    }
  }, [categoryId, fashionMode, forms.fashion.priceA, forms.fashion.priceB, onFormsChange]);

  switch (categoryId) {
    // 🔥 새롭게 추가된 음식 카테고리
    case "food": {
      const fd = forms.food;
      return (
        <>
          <div className={fieldGap}>
            <div className="space-y-2">
              <Label htmlFor="food-situation">언제, 어떤 상황에서 드시나요? (필수, 10자 이상)</Label>
              <Textarea
                id="food-situation"
                value={fd.situationReason}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchFood(p, { situationReason: e.target.value }))}
                placeholder="예: 오늘 비도 오고 꿀꿀한데, 퇴근길에 직장 동료들이랑 소주 한잔 하려고 합니다."
                className="min-h-[100px] resize-y"
              />
            </div>
            {/* 🔥 지역, 동행자, 스타일 3칸으로 변경! */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="food-area">지역 · 동네</Label>
                <Input
                  id="food-area"
                  value={fd.area}
                  disabled={disabled}
                  onChange={(e) => onFormsChange((p) => patchFood(p, { area: e.target.value }))}
                  placeholder="예: 강남역, 동네"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-companion">동행자</Label>
                <Input
                  id="food-companion"
                  value={fd.companion}
                  disabled={disabled}
                  onChange={(e) => onFormsChange((p) => patchFood(p, { companion: e.target.value }))}
                  placeholder="예: 친구들, 혼밥"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-preference">선호 스타일</Label>
                <Input
                  id="food-preference"
                  value={fd.preference}
                  disabled={disabled}
                  onChange={(e) => onFormsChange((p) => patchFood(p, { preference: e.target.value }))}
                  placeholder="예: 고기, 국물"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className={sectionTitle}>비교할 메뉴 후보</p>
              
              {/* 가격 입력칸 옵션 바로 위 */}
              <div className="grid gap-6 sm:grid-cols-2 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="food-price-a">A 메뉴 1인당 예상 가격</Label>
                  <div className="flex max-w-xs items-center gap-2">
                    <Input
                      id="food-price-a"
                      type="text"
                      inputMode="text"
                      value={fd.priceA}
                      disabled={disabled}
                      onChange={(e) => onFormsChange((p) => patchFood(p, { priceA: e.target.value }))}
                      placeholder="예: 1~3"
                      className="tabular-nums"
                    />
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="food-price-b">B 메뉴 1인당 예상 가격</Label>
                  <div className="flex max-w-xs items-center gap-2">
                    <Input
                      id="food-price-b"
                      type="text"
                      inputMode="text"
                      value={fd.priceB}
                      disabled={disabled}
                      onChange={(e) => onFormsChange((p) => patchFood(p, { priceB: e.target.value }))}
                      placeholder="예: 1~3"
                      className="tabular-nums"
                    />
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="food-a">A 옵션</Label>
                    <Textarea
                      id="food-a"
                      value={fd.optionA}
                      disabled={disabled}
                      onChange={(e) => onFormsChange((p) => patchFood(p, { optionA: e.target.value }))}
                      placeholder="예: 마라탕"
                      className="min-h-[100px]"
                    />
                  </div>
                  <OptionImageDropzone
                    label="A 참고 이미지 (선택)"
                    inputId="food-img-a"
                    files={fd.filesA}
                    onFilesChange={(filesA) => onFormsChange((p) => patchFood(p, { filesA }))}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="food-b">B 옵션</Label>
                    <Textarea
                      id="food-b"
                      value={fd.optionB}
                      disabled={disabled}
                      onChange={(e) => onFormsChange((p) => patchFood(p, { optionB: e.target.value }))}
                      placeholder="예: 교촌치킨 허니콤보"
                      className="min-h-[100px]"
                    />
                  </div>
                  <OptionImageDropzone
                    label="B 참고 이미지 (선택)"
                    inputId="food-img-b"
                    files={fd.filesB}
                    onFilesChange={(filesB) => onFormsChange((p) => patchFood(p, { filesB }))}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }
    case "gift": {
      const g = forms.gift;
      return (
        <>
          <div className={fieldGap}>
          <div className="space-y-2">
            <Label htmlFor="gift-situation">{GIFT_SITUATION_LABEL}</Label>
            <Textarea
              id="gift-situation"
              value={g.situationReason}
              disabled={disabled}
              onChange={(e) => onFormsChange((p) => patchGift(p, { situationReason: e.target.value }))}
              placeholder="예: 여자친구 1주년 선물인데 평소 어떤 브랜드를 좋아하는지 몰라서 고민입니다."
              className="min-h-[120px] resize-y"
            />
          </div>
          
          <div className="space-y-4">
            <p className={sectionTitle}>선물 맥락</p>
            <div className="space-y-2">
              <Label htmlFor="gift-purpose">선물 목적</Label>
              <Input
                id="gift-purpose"
                value={g.giftPurpose}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchGift(p, { giftPurpose: e.target.value }))}
                placeholder="예: 생일, 집들이, 결혼 축하, 냉장고·자동차 선물 등"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-giver">나의 정보 (선물 주는 사람)</Label>
              <Textarea
                id="gift-giver"
                value={g.giverNote}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchGift(p, { giverNote: e.target.value }))}
                placeholder="예: 30대 초반 남성, 직장인"
                className="min-h-[72px] resize-y"
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gift-receiver-ag">받는 분의 연령대 · 성별</Label>
                <Input
                  id="gift-receiver-ag"
                  value={g.receiverAgeGender}
                  disabled={disabled}
                  onChange={(e) => onFormsChange((p) => patchGift(p, { receiverAgeGender: e.target.value }))}
                  placeholder="예: 30대 초반 · 여성"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="gift-receiver-int">받는 분의 성향 · 관심사</Label>
                <Textarea
                  id="gift-receiver-int"
                  value={g.receiverInterests}
                  disabled={disabled}
                  onChange={(e) => onFormsChange((p) => patchGift(p, { receiverInterests: e.target.value }))}
                  placeholder="취미·브랜드·MBTI 또는 성격·관심사를 자유롭게"
                  className="min-h-[88px] resize-y"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className={sectionTitle}>비교할 선물 후보</p>
            
            <div className="grid gap-6 sm:grid-cols-2 pb-4">
              <div className="space-y-2">
                <Label htmlFor="gift-price-a">A 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="gift-price-a"
                    type="text"
                    inputMode="text"
                    value={g.priceA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchGift(p, { priceA: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gift-price-b">B 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="gift-price-b"
                    type="text"
                    inputMode="text"
                    value={g.priceB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchGift(p, { priceB: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                </div>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gift-a">A 옵션</Label>
                  <Textarea
                    id="gift-a"
                    value={g.optionA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchGift(p, { optionA: e.target.value }))}
                    placeholder="비교할 선물 후보 A"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="A 옵션 참고 이미지"
                  inputId="gift-img-a"
                  files={g.filesA}
                  onFilesChange={(filesA) => onFormsChange((p) => patchGift(p, { filesA }))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gift-b">B 옵션</Label>
                  <Textarea
                    id="gift-b"
                    value={g.optionB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchGift(p, { optionB: e.target.value }))}
                    placeholder="비교할 선물 후보 B"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="B 옵션 참고 이미지"
                  inputId="gift-img-b"
                  files={g.filesB}
                  onFilesChange={(filesB) => onFormsChange((p) => patchGift(p, { filesB }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
        </>
      );
    }
    case "appliance": {
      const a = forms.appliance;
      return (
        <>
          <div className={fieldGap}>
          <div className="space-y-2">
            <Label htmlFor="app-situation">{SITUATION_LABEL}</Label>
            <Textarea
              id="app-situation"
              value={a.situationReason}
              disabled={disabled}
              onChange={(e) => onFormsChange((p) => patchAppliance(p, { situationReason: e.target.value }))}
              placeholder="예: 주방이 좁아서 크기·배치가 가장 큰 고민입니다."
              className="min-h-[120px] resize-y"
            />
          </div>
          <div className="space-y-4">
            <p className={sectionTitle}>제품 비교</p>
            <div className="grid gap-6 sm:grid-cols-2 pb-4">
              <div className="space-y-2">
                <Label htmlFor="app-price-a">A 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="app-price-a"
                    type="text"
                    inputMode="text"
                    value={a.priceA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAppliance(p, { priceA: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-price-b">B 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="app-price-b"
                    type="text"
                    inputMode="text"
                    value={a.priceB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAppliance(p, { priceB: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                </div>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-a">A 옵션</Label>
                  <Textarea
                    id="app-a"
                    value={a.optionA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAppliance(p, { optionA: e.target.value }))}
                    placeholder="비교할 제품·모델"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="A 옵션 참고 이미지"
                  inputId="app-img-a"
                  files={a.filesA}
                  onFilesChange={(filesA) => onFormsChange((p) => patchAppliance(p, { filesA }))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-b">B 옵션</Label>
                  <Textarea
                    id="app-b"
                    value={a.optionB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAppliance(p, { optionB: e.target.value }))}
                    placeholder="비교할 제품·모델"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="B 옵션 참고 이미지"
                  inputId="app-img-b"
                  files={a.filesB}
                  onFilesChange={(filesB) => onFormsChange((p) => patchAppliance(p, { filesB }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          </div>
        </>
      );
    }
    case "fashion": {
      const f = forms.fashion;
      return (
        <>
          <div className={fieldGap}>
          <div className="flex w-full rounded-xl bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => {
                setFashionMode("new");
                onFormsChange((p) => patchFashion(p, {
                  priceA: p.fashion.priceA === "보유중" ? "" : p.fashion.priceA,
                  priceB: p.fashion.priceB === "보유중" ? "" : p.fashion.priceB,
                }));
              }}
              className={cn("flex-1 rounded-lg py-3 text-[14px] font-semibold transition-all duration-200", fashionMode === "new" ? "bg-background text-foreground shadow-sm ring-1 ring-border/10" : "text-muted-foreground hover:text-foreground")}
            >
              🛍️ 새로 구매할 아이템
            </button>
            <button
              type="button"
              onClick={() => {
                setFashionMode("wardrobe");
                onFormsChange((p) => patchFashion(p, { priceA: "보유중", priceB: "보유중" }));
              }}
              className={cn("flex-1 rounded-lg py-3 text-[14px] font-semibold transition-all duration-200", fashionMode === "wardrobe" ? "bg-background text-foreground shadow-sm ring-1 ring-border/10" : "text-muted-foreground hover:text-foreground")}
            >
              👗 보유 아이템 활용
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-situation">{SITUATION_LABEL}</Label>
            <Textarea
              id="f-situation"
              value={f.situationReason}
              disabled={disabled}
              onChange={(e) => onFormsChange((p) => patchFashion(p, { situationReason: e.target.value }))}
              placeholder={fashionMode === "new" ? "예: 체형·취향·이번에 꼭 맞추고 싶은 분위기 등" : "예: 내일 출근(또는 데이트)에 입고 나갈 건데, 날씨와 상황에 맞는 조합이 고민입니다."}
              className="min-h-[120px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-tpo">TPO (입고 갈 장소 및 상황)</Label>
            <Input
              id="f-tpo"
              value={f.tpo}
              disabled={disabled}
              onChange={(e) => onFormsChange((p) => patchFashion(p, { tpo: e.target.value }))}
              placeholder="예: 출근, 데이트, 겨울 여행, 결혼식 하객 등"
            />
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-body">체형 · 사이즈 메모</Label>
              <Textarea
                id="f-body"
                value={f.body}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchFashion(p, { body: e.target.value }))}
                placeholder="키, 상·하의 사이즈, 핏 선호 등"
                className="min-h-[88px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className={sectionTitle}>비교할 아이템</p>
            {fashionMode === "new" && (
              <div className="grid gap-6 sm:grid-cols-2 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="f-price-a">A 옵션 예상 가격</Label>
                  <Input
                    id="f-price-a"
                    type="text"
                    inputMode="text"
                    value={f.priceA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchFashion(p, { priceA: e.target.value }))}
                    placeholder="예: 10~20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-price-b">B 옵션 예상 가격</Label>
                  <Input
                    id="f-price-b"
                    type="text"
                    inputMode="text"
                    value={f.priceB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchFashion(p, { priceB: e.target.value }))}
                    placeholder="예: 10~20"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="f-a">A 옵션</Label>
                  <Textarea
                    id="f-a"
                    value={f.optionA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchFashion(p, { optionA: e.target.value }))}
                    placeholder={fashionMode === "new" ? "의류·신발·가방·악세서리 등 비교할 구매 후보 A" : "의류·신발·가방·악세서리 등 활용할 보유 아이템 A"}
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="A 참고 이미지"
                  inputId="f-img-a"
                  files={f.filesA}
                  onFilesChange={(filesA) => onFormsChange((p) => patchFashion(p, { filesA }))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="f-b">B 옵션</Label>
                  <Textarea
                    id="f-b"
                    value={f.optionB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchFashion(p, { optionB: e.target.value }))}
                    placeholder={fashionMode === "new" ? "의류·신발·가방·악세서리 등 비교할 구매 후보 B" : "의류·신발·가방·악세서리 등 활용할 보유 아이템 B"}
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="B 참고 이미지"
                  inputId="f-img-b"
                  files={f.filesB}
                  onFilesChange={(filesB) => onFormsChange((p) => patchFashion(p, { filesB }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
        </>
      );
    }
    case "date": {
      const d = forms.date;
      return (
        <>
          <div className={fieldGap}>
          <div className="space-y-2">
            <Label htmlFor="d-situation">{SITUATION_LABEL}</Label>
            <Textarea
              id="d-situation"
              value={d.situationReason}
              disabled={disabled}
              onChange={(e) => onFormsChange((p) => patchDate(p, { situationReason: e.target.value }))}
              placeholder="예: 일정·예산·동행자 취향이 엇갈려 고민됩니다."
              className="min-h-[120px] resize-y"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="d-companion">동행자</Label>
              <Input
                id="d-companion"
                value={d.companion}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchDate(p, { companion: e.target.value }))}
                placeholder="예: 연인, 부모님, 친구"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-purpose">여행 · 데이트 목적</Label>
              <Input
                id="d-purpose"
                value={d.tripPurpose}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchDate(p, { tripPurpose: e.target.value }))}
                placeholder="휴식, 기념일, 맛집 투어 등"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-area">지역 · 목적지</Label>
              <Input
                id="d-area"
                value={d.area}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchDate(p, { area: e.target.value }))}
                placeholder="강남, 제주, 오사카 등"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-vibe">분위기 · 코스 메모</Label>
              <Textarea
                id="d-vibe"
                value={d.vibe}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchDate(p, { vibe: e.target.value }))}
                placeholder="조용한 레스토랑, 드라이브, 온천 등"
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className={sectionTitle}>비교할 일정 · 장소 후보</p>
            <div className="grid gap-6 sm:grid-cols-2 pb-4">
              <div className="space-y-2">
                <Label htmlFor="d-price-a">A 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="d-price-a"
                    type="text"
                    inputMode="text"
                    value={d.priceA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchDate(p, { priceA: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-price-b">B 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="d-price-b"
                    type="text"
                    inputMode="text"
                    value={d.priceB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchDate(p, { priceB: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">만 원</span>
                </div>
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="d-a">A 옵션</Label>
                  <Textarea
                    id="d-a"
                    value={d.optionA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchDate(p, { optionA: e.target.value }))}
                    placeholder="후보 A 코스·장소"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="A 참고 이미지"
                  inputId="d-img-a"
                  files={d.filesA}
                  onFilesChange={(filesA) => onFormsChange((p) => patchDate(p, { filesA }))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="d-b">B 옵션</Label>
                  <Textarea
                    id="d-b"
                    value={d.optionB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchDate(p, { optionB: e.target.value }))}
                    placeholder="후보 B 코스·장소"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="B 참고 이미지"
                  inputId="d-img-b"
                  files={d.filesB}
                  onFilesChange={(filesB) => onFormsChange((p) => patchDate(p, { filesB }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
        </>
      );
    }
    case "asset": {
      const x = forms.asset;
      return (
        <>
          <div className={fieldGap}>
          <div className="space-y-2">
            <Label htmlFor="asset-situation">{SITUATION_LABEL}</Label>
            <Textarea
              id="asset-situation"
              value={x.situationReason}
              disabled={disabled}
              onChange={(e) => onFormsChange((p) => patchAsset(p, { situationReason: e.target.value }))}
              placeholder="예: 대출·현금 흐름·가족 설득이 걱정됩니다."
              className="min-h-[120px] resize-y"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-type">자산 유형</Label>
              <Input
                id="a-type"
                value={x.type}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchAsset(p, { type: e.target.value }))}
                placeholder="부동산, 자동차, 고액 보험 등 (주식·코인 등 고위험 상품은 제외)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-horizon">보유 · 검토 기간</Label>
              <Input
                id="a-horizon"
                value={x.horizon}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchAsset(p, { horizon: e.target.value }))}
                placeholder="1년 미만, 3년 이상 등"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-risk">리스크 성향</Label>
              <Input
                id="a-risk"
                value={x.risk}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchAsset(p, { risk: e.target.value }))}
                placeholder="보수 / 중립 / 공격"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-note">추가 조건</Label>
              <Textarea
                id="a-note"
                value={x.note}
                disabled={disabled}
                onChange={(e) => onFormsChange((p) => patchAsset(p, { note: e.target.value }))}
                placeholder="대출, 세금, 목표 수익률 등"
                className="min-h-[88px]"
              />
            </div>
          </div>
          <div className="space-y-4">
            <p className={sectionTitle}>비교할 선택지</p>
            <div className="grid gap-6 sm:grid-cols-2 pb-4">
              <div className="space-y-2">
                <Label htmlFor="asset-price-a">A 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="asset-price-a"
                    type="text"
                    inputMode="text"
                    value={x.priceA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAsset(p, { priceA: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-price-b">B 옵션 예상 가격</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="asset-price-b"
                    type="text"
                    inputMode="text"
                    value={x.priceB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAsset(p, { priceB: e.target.value }))}
                    placeholder="예: 10~20"
                    className="tabular-nums"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asset-a">A 옵션</Label>
                  <Textarea
                    id="asset-a"
                    value={x.optionA}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAsset(p, { optionA: e.target.value }))}
                    placeholder="후보 A 매물·상품 설명"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="A 참고 자료"
                  inputId="asset-img-a"
                  files={x.filesA}
                  onFilesChange={(filesA) => onFormsChange((p) => patchAsset(p, { filesA }))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asset-b">B 옵션</Label>
                  <Textarea
                    id="asset-b"
                    value={x.optionB}
                    disabled={disabled}
                    onChange={(e) => onFormsChange((p) => patchAsset(p, { optionB: e.target.value }))}
                    placeholder="후보 B 매물·상품 설명"
                    className="min-h-[120px]"
                  />
                </div>
                <OptionImageDropzone
                  label="B 참고 자료"
                  inputId="asset-img-b"
                  files={x.filesB}
                  onFilesChange={(filesB) => onFormsChange((p) => patchAsset(p, { filesB }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          <div className={cn("rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3.5", "text-[13px] leading-relaxed text-muted-foreground dark:border-amber-400/20 dark:bg-amber-400/[0.07]")}>
            <p className="font-medium text-foreground/90">고가 자산 분석은 정밀 데이터가 요구되어 <span className="tabular-nums">2</span> 크레딧이 소모됩니다.</p>
            <p className="mt-2 text-[12px]">1차 AI 분석 후 제휴 전문가 연결이 가능합니다.</p>
          </div>
        </div>
        </>
      );
    }
    default:
      return null;
  }
}