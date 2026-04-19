"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Link2 } from "lucide-react";

import { UploadedImageThumbnails } from "@/components/dashboard/uploaded-image-thumbnails";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ApplianceDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  linkUrl: string;
  onLinkChange: (url: string) => void;
  disabled?: boolean;
  /** 링크 입력만 표시 (A/B별 이미지는 별도 영역 사용 시) */
  linkOnly?: boolean;
};

export function ApplianceDropzone({
  files,
  onFilesChange,
  linkUrl,
  onLinkChange,
  disabled = false,
  linkOnly = false,
}: ApplianceDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const next = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (next.length === 0) return;
      onFilesChange([...files, ...next]);
    },
    [files, onFilesChange]
  );

  const removeFileAt = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled]
  );

  return (
    <div className="space-y-4">
      <Label className="text-foreground">
        {linkOnly ? "제품 페이지 링크 (선택)" : "참고 이미지 · 링크"}
      </Label>
      {!linkOnly && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
            "border-white/35 bg-white/20 backdrop-blur-md dark:border-white/20 dark:bg-white/5",
            dragOver && "border-primary/60 bg-primary/10",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <ImagePlus
            className="mb-3 size-10 text-muted-foreground/80"
            aria-hidden
          />
          <p className="text-sm font-medium text-foreground">
            사진을 드래그 앤 드롭하거나 클릭하여 추가
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG 등 이미지 · 여러 장 선택 가능
          </p>
          <UploadedImageThumbnails
            files={files}
            onRemoveAt={removeFileAt}
            disabled={disabled}
            size="md"
            className="mt-4 w-full max-w-full"
          />
        </div>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Link2 className="size-4" aria-hidden />
        </div>
        <Input
          id="appliance-link"
          type="url"
          value={linkUrl}
          disabled={disabled}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="또는 제품 페이지 링크를 붙여넣기"
          className="h-11 pl-10"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
