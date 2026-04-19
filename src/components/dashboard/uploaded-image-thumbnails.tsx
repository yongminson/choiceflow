"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

function usePreviewUrls(files: File[]): string[] {
  const urls = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  useEffect(() => {
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [urls]);

  return urls;
}

type UploadedImageThumbnailsProps = {
  files: File[];
  onRemoveAt: (index: number) => void;
  disabled?: boolean;
  /** 썸네일 크기 (픽셀 근사) */
  size?: "sm" | "md";
  className?: string;
};

export function UploadedImageThumbnails({
  files,
  onRemoveAt,
  disabled = false,
  size = "sm",
  className,
}: UploadedImageThumbnailsProps) {
  const urls = usePreviewUrls(files);
  const dim = size === "md" ? "h-[88px] w-[88px]" : "h-20 w-20";

  if (files.length === 0) return null;

  return (
    <ul
      className={cn(
        "mt-3 flex flex-wrap justify-center gap-2.5 sm:justify-start",
        className
      )}
    >
      {files.map((f, i) => (
        <li
          key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
          className="relative shrink-0"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border border-primary/20 bg-muted/40 shadow-sm dark:border-white/15",
              dim
            )}
          >
            <img
              src={urls[i]}
              alt={f.name}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveAt(i);
              }}
              className={cn(
                "absolute -right-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full",
                "border border-border/80 bg-background/95 text-foreground shadow-md",
                "ring-1 ring-black/5 transition-colors dark:bg-card/95 dark:ring-white/10",
                "hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                disabled && "pointer-events-none opacity-50"
              )}
              aria-label={`${f.name} 삭제`}
            >
              <X className="size-3.5 shrink-0" strokeWidth={2.25} />
            </button>
          </div>
          <p
            className="mt-1 max-w-[5.5rem] truncate text-center text-[10px] leading-tight text-muted-foreground"
            title={f.name}
          >
            {f.name}
          </p>
        </li>
      ))}
    </ul>
  );
}
