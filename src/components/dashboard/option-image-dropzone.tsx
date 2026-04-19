"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip } from "lucide-react";

import { UploadedImageThumbnails } from "@/components/dashboard/uploaded-image-thumbnails";
import { cn } from "@/lib/utils";

type OptionImageDropzoneProps = {
  label: string;
  /** true일 때만 작은 '선택사항' 문구 표시 */
  optional?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  inputId: string;
};

export function OptionImageDropzone({
  label,
  optional = true,
  files,
  onFilesChange,
  disabled = false,
  inputId,
}: OptionImageDropzoneProps) {
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
    <div className="space-y-1">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      {optional !== false && (
        <p className="text-[10px] text-muted-foreground/80">선택사항</p>
      )}
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
          "relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-3 py-5 text-center transition-colors",
          "border-primary/35 bg-primary/[0.06] backdrop-blur-sm dark:border-white/25 dark:bg-white/[0.06]",
          dragOver && "border-primary bg-primary/15",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <input
          id={inputId}
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
        <Paperclip
          className="mb-2 size-6 text-primary/90 dark:text-primary/80"
          aria-hidden
        />
        <span className="text-[13px] font-semibold text-foreground">
          이미지 업로드
        </span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">
          드래그 또는 클릭 · JPG, PNG
        </span>
        <UploadedImageThumbnails
          files={files}
          onRemoveAt={removeFileAt}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
