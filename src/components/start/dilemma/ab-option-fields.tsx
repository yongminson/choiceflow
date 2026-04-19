"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { OptionImageDropzone } from "@/components/dashboard/option-image-dropzone";

type AbOptionFieldsProps = {
  optionA: string;
  optionB: string;
  onOptionAChange: (v: string) => void;
  onOptionBChange: (v: string) => void;
  filesA: File[];
  filesB: File[];
  onFilesAChange: (files: File[]) => void;
  onFilesBChange: (files: File[]) => void;
  disabled?: boolean;
};

export function AbOptionFields({
  optionA,
  optionB,
  onOptionAChange,
  onOptionBChange,
  filesA,
  filesB,
  onFilesAChange,
  onFilesBChange,
  disabled = false,
}: AbOptionFieldsProps) {
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:items-start">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="opt-a" className="text-foreground">
            A 옵션 (필수)
          </Label>
          <Textarea
            id="opt-a"
            name="optionA"
            value={optionA}
            onChange={(e) => onOptionAChange(e.target.value)}
            disabled={disabled}
            placeholder="예: 삼성 비스포크"
            className="min-h-[140px] text-base font-medium md:min-h-[160px]"
          />
        </div>
        <OptionImageDropzone
          label="A 옵션 이미지"
          inputId="start-img-a"
          files={filesA}
          onFilesChange={onFilesAChange}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-center py-1 md:min-w-[3.5rem] md:pt-10">
        <span className="rounded-full bg-muted px-4 py-2 text-xs font-semibold tracking-[0.25em] text-muted-foreground shadow-sm">
          VS
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="opt-b" className="text-foreground">
            B 옵션 (필수)
          </Label>
          <Textarea
            id="opt-b"
            name="optionB"
            value={optionB}
            onChange={(e) => onOptionBChange(e.target.value)}
            disabled={disabled}
            placeholder="예: LG 디오스"
            className="min-h-[140px] text-base font-medium md:min-h-[160px]"
          />
        </div>
        <OptionImageDropzone
          label="B 옵션 이미지"
          inputId="start-img-b"
          files={filesB}
          onFilesChange={onFilesBChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
