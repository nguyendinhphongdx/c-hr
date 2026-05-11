"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useTags } from "../hooks/useTags";
import type { Tag } from "../types";
import { TagBadge } from "./TagBadge";

interface TagPickerProps {
  value: ID[];
  onChange: (ids: ID[]) => void;
  /** Filter the library by `scope`. Pass `"null"` for global-only. */
  scope?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Pre-resolved tags so chips render even before the library query
   *  resolves (e.g. when opening an edit dialog). */
  fallbackTags?: Pick<Tag, "id" | "name" | "color">[];
}

/**
 * Multi-select picker over the Tag library. Clicking a row toggles its
 * presence in `value`. Selected chips render below the trigger.
 */
export function TagPicker({
  value,
  onChange,
  scope,
  disabled,
  placeholder = "Thêm tag…",
  fallbackTags,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useTags(scope);

  const filtered = useMemo(() => {
    const all = list.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((t) => t.name.toLowerCase().includes(q));
  }, [list.data, search]);

  const selected = useMemo(() => {
    const byId = new Map<ID, Pick<Tag, "id" | "name" | "color">>();
    for (const t of fallbackTags ?? []) byId.set(t.id, t);
    for (const t of list.data ?? []) byId.set(t.id, t);
    return value
      .map((id) => byId.get(id))
      .filter((t): t is Pick<Tag, "id" | "name" | "color"> => !!t);
  }, [value, fallbackTags, list.data]);

  const toggle = (id: ID) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const remove = (id: ID) => onChange(value.filter((v) => v !== id));

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-0.5">
            <TagBadge tag={t} />
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full"
                onClick={() => remove(t.id)}
                aria-label={`Bỏ ${t.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </span>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Plus className="h-3 w-3" />
              {selected.length === 0 ? placeholder : "Thêm"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm tag…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {list.isLoading ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Đang tải…
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {search ? "Không tìm thấy tag nào." : "Chưa có tag nào."}
                </p>
              ) : (
                filtered.map((t) => {
                  const checked = value.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50",
                        checked && "bg-accent/40",
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {checked && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </span>
                      <TagBadge tag={t} size="sm" />
                      {t.scope && (
                        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t.scope}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
