"use client";

import {
  Building2,
  Car,
  Check,
  ChevronDown,
  Laptop,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useResources } from "../hooks/useResources";
import type { ResourceKind, ResourceRow } from "../types";

const KIND_ICON: Record<ResourceKind, typeof Building2> = {
  ROOM: Building2,
  EQUIPMENT: Laptop,
  VEHICLE: Car,
};

const KIND_LABEL: Record<ResourceKind, string> = {
  ROOM: "Phòng họp",
  EQUIPMENT: "Thiết bị",
  VEHICLE: "Xe",
};

interface ResourcePickerProps {
  /** Selected resource ids. */
  value: ID[];
  onChange: (next: ID[]) => void;
  /** Pre-resolved snapshot of selected — used to render chips when the
   *  matching row hasn't loaded yet (e.g. in edit dialog). */
  fallbackResources?: Pick<ResourceRow, "id" | "kind" | "name">[];
  disabled?: boolean;
}

/**
 * Multi-select picker for booking rooms / equipment / vehicles into an
 * event. Search-as-you-type, grouped by kind.
 *
 * Selected chips render below the trigger; click × to remove.
 */
export function ResourcePicker({
  value,
  onChange,
  fallbackResources,
  disabled,
}: ResourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useResources({
    q: search.trim() || undefined,
    activeOnly: true,
  });

  const selected = useMemo(() => {
    const byId = new Map<ID, Pick<ResourceRow, "id" | "kind" | "name">>();
    for (const r of fallbackResources ?? []) byId.set(r.id, r);
    for (const r of list.data ?? []) byId.set(r.id, r);
    return value
      .map((id) => byId.get(id))
      .filter((r): r is Pick<ResourceRow, "id" | "kind" | "name"> => !!r);
  }, [value, fallbackResources, list.data]);

  const grouped = useMemo(() => {
    const groups: Record<ResourceKind, ResourceRow[]> = {
      ROOM: [],
      EQUIPMENT: [],
      VEHICLE: [],
    };
    for (const r of list.data ?? []) groups[r.kind].push(r);
    return groups;
  }, [list.data]);

  const toggle = (id: ID) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const remove = (id: ID) => onChange(value.filter((v) => v !== id));

  return (
    <div className="grid gap-2">
      <Label>Tài nguyên (phòng / thiết bị / xe)</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {value.length > 0
                ? `${value.length} đã chọn`
                : "Thêm tài nguyên..."}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm phòng / thiết bị / xe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {list.isLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Đang tải...
              </p>
            ) : (list.data ?? []).length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Không có tài nguyên nào.
              </p>
            ) : (
              (Object.keys(grouped) as ResourceKind[]).map((kind) => {
                const rows = grouped[kind];
                if (rows.length === 0) return null;
                const Icon = KIND_ICON[kind];
                return (
                  <div key={kind} className="py-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {KIND_LABEL[kind]}
                    </div>
                    {rows.map((r) => {
                      const checked = value.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggle(r.id)}
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
                          <span className="min-w-0 flex-1 truncate">
                            {r.name}
                          </span>
                          {r.location && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {r.location}
                            </span>
                          )}
                          {r.capacity !== null && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {r.capacity} chỗ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((r) => {
            const Icon = KIND_ICON[r.kind];
            return (
              <li
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-40 truncate font-medium">{r.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={() => remove(r.id)}
                  disabled={disabled}
                  aria-label={`Bỏ ${r.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
