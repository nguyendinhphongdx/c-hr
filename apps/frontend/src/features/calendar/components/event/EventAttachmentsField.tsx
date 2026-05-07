"use client";

import { Info, Paperclip, Upload, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

interface EventAttachmentsFieldProps {
  files: File[];
  onChange: (next: File[]) => void;
  disabled?: boolean;
}

/**
 * File attachments — multi-file picker with a 20-file / 25MB-each cap
 * matching the xspace reference. UI-only for now: files live in local
 * form state; actual upload + persistence ships in a follow-up PR
 * (calendar `EventAttachment` schema + storage wire-in).
 */
export function EventAttachmentsField({
  files,
  onChange,
  disabled,
}: EventAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const remaining = MAX_FILES - files.length;
    const accepted: File[] = [];
    for (const f of Array.from(incoming).slice(0, remaining)) {
      if (f.size > MAX_FILE_BYTES) continue;
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    onChange([...files, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <Label>Tệp đính kèm</Label>

      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        <span>Tối đa {MAX_FILES} tệp / lần thêm, mỗi tệp ≤ 25MB</span>
        <span className="ml-auto font-medium tabular-nums">
          {files.length}/{MAX_FILES}
        </span>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatBytes(f.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label={`Bỏ ${f.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_FILES}
      >
        <Upload className="h-3.5 w-3.5" />
        Thêm tệp
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
