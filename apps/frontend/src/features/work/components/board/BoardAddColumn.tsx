"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ID } from "@/lib/types";

import { useCreateSection } from "../../hooks/useProjects";

interface BoardAddColumnProps {
  projectId: ID;
}

export function BoardAddColumn({ projectId }: BoardAddColumnProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateSection();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const reset = () => {
    setOpen(false);
    setName("");
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      reset();
      return;
    }
    try {
      await create.mutateAsync({ projectId, data: { name: trimmed } });
      reset();
    } catch (err) {
      toast.error("Không tạo được cột", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-72 shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Thêm cột
      </button>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 self-start rounded-lg border bg-background p-2">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên cột mới…"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") reset();
        }}
        onBlur={() => {
          if (!name.trim()) reset();
        }}
        className="h-8 text-sm"
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={!name.trim() || create.isPending}
        >
          Thêm
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Huỷ
        </Button>
      </div>
    </div>
  );
}
