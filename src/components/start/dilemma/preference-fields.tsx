"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SITUATION_LABEL =
  "나의 현재 상황 및 이 선택이 고민되는 진짜 이유 (필수, 10자 이상)";

type PreferenceFieldsProps = {
  priceAManwonText: string;
  priceBManwonText: string;
  onPriceAChange: (v: string) => void;
  onPriceBChange: (v: string) => void;
  situationReason: string;
  onSituationReasonChange: (v: string) => void;
  usagePeriod: string;
  onUsagePeriodChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  disabled?: boolean;
};

export function PreferenceFields({
  priceAManwonText,
  priceBManwonText,
  onPriceAChange,
  onPriceBChange,
  situationReason,
  onSituationReasonChange,
  usagePeriod,
  onUsagePeriodChange,
  priority,
  onPriorityChange,
  disabled = false,
}: PreferenceFieldsProps) {
  return (
    <div className="space-y-8 pt-2">
      <div className="space-y-2">
        <Label htmlFor="situation-reason" className="text-foreground">
          {SITUATION_LABEL}
        </Label>
        <Textarea
          id="situation-reason"
          disabled={disabled}
          value={situationReason}
          onChange={(e) => onSituationReasonChange(e.target.value)}
          placeholder="예: 주방이 좁아서 크기가 고민됨, 선물 받는 사람이 실용적인 걸 좋아함 등"
          className="min-h-[120px] resize-y"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="price-a-manwon" className="text-foreground">
            A 옵션 예상 가격 (필수)
          </Label>
          <div className="flex max-w-xs items-center gap-2">
            <Input
              id="price-a-manwon"
              type="text"
              inputMode="text"
              disabled={disabled}
              value={priceAManwonText}
              onChange={(e) => {
                onPriceAChange(e.target.value);
              }}
              placeholder="예: 10~20"
              className="h-11 tabular-nums"
            />
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              만 원
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="price-b-manwon" className="text-foreground">
            B 옵션 예상 가격 (필수)
          </Label>
          <div className="flex max-w-xs items-center gap-2">
            <Input
              id="price-b-manwon"
              type="text"
              inputMode="text"
              disabled={disabled}
              value={priceBManwonText}
              onChange={(e) => {
                onPriceBChange(e.target.value);
              }}
              placeholder="예: 10~20"
              className="h-11 tabular-nums"
            />
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              만 원
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="usage-period" className="text-foreground">
            사용 기간 (필수)
          </Label>
          <Select
            value={usagePeriod}
            disabled={disabled}
            onValueChange={(v) => {
              if (v != null) onUsagePeriodChange(v);
            }}
          >
            <SelectTrigger
              id="usage-period"
              size="default"
              className="h-11 w-full min-w-0 rounded-xl"
            >
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="under-1y">1년 미만</SelectItem>
              <SelectItem value="1y-3y">1년 ~ 3년</SelectItem>
              <SelectItem value="over-3y">3년 이상</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="text-foreground">
            우선순위 (필수)
          </Label>
          <Select
            value={priority}
            disabled={disabled}
            onValueChange={(v) => {
              if (v != null) onPriorityChange(v);
            }}
          >
            <SelectTrigger
              id="priority"
              size="default"
              className="h-11 w-full min-w-0 rounded-xl"
            >
              <SelectValue placeholder="우선순위 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">가격</SelectItem>
              <SelectItem value="design">디자인</SelectItem>
              <SelectItem value="performance">성능</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
