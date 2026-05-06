"use client";

import { File as FileIcon, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  /** Comma-separated MIME types or extensions, e.g. ".csv,.xlsx". */
  accept?: string;
  /** Soft limit in bytes for client-side rejection. */
  maxSizeBytes?: number;
  disabled?: boolean;
  uploading?: boolean;
  /** 0–100 progress while uploading; null/undefined hides the bar. */
  progress?: number | null;
  onSelect: (file: File) => void;
  onClear?: () => void;
  selectedFile?: File | null;
  className?: string;
}

const MB = 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Drag-and-drop file picker with progress indicator. Stateless about
 * uploading itself — the caller wires `onSelect` to its API call and
 * passes back `progress` while the request is in flight.
 */
export function FileUpload({
  accept,
  maxSizeBytes,
  disabled,
  uploading,
  progress,
  onSelect,
  onClear,
  selectedFile,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndPick = useCallback(
    (file: File) => {
      setError(null);
      if (maxSizeBytes && file.size > maxSizeBytes) {
        setError(`File quá lớn (giới hạn ${formatSize(maxSizeBytes)}).`);
        return;
      }
      onSelect(file);
    },
    [maxSizeBytes, onSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndPick(file);
    },
    [disabled, uploading, validateAndPick],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDrag(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        disabled={disabled || uploading}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 text-sm transition-colors",
          drag
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/40",
          (disabled || uploading) && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <div className="text-foreground">
          Kéo file vào đây hoặc <span className="font-medium underline">chọn file</span>
        </div>
        {accept && (
          <div className="text-xs text-muted-foreground">
            Định dạng hỗ trợ: {accept}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndPick(file);
            e.target.value = "";
          }}
        />
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {uploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-medium">{selectedFile.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(selectedFile.size)}
              </span>
            </div>
            {uploading && typeof progress === "number" && (
              <Progress value={progress} className="h-1" />
            )}
          </div>
          {!uploading && onClear && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClear}
              aria-label="Xoá file"
              className="h-7 w-7 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
