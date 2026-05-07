"use client";

import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useOrgUsers } from "../hooks/useOrgUsers";
import type { OrgUser } from "../types";

interface UserPickerProps {
  value: ID | null;
  onChange: (user: OrgUser | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Restrict to users with no Employee link yet. Set false in edit mode. */
  availableForLink?: boolean;
  /** When editing an Employee, include the user currently linked to it. */
  includeLinkedTo?: ID;
  /** Initial display when value is set but no fetch has happened yet. */
  fallback?: { name: string | null; email: string } | null;
}

/**
 * Search-as-you-type User picker, scoped to the current Org. Calls the
 * picker `onChange` with the full row so the form can copy display info
 * (name/email) into siblings.
 */
export function UserPicker({
  value,
  onChange,
  placeholder = "Pick a user…",
  disabled = false,
  availableForLink = true,
  includeLinkedTo,
  fallback,
}: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useOrgUsers({
    q: search.trim() || undefined,
    availableForLink,
    includeLinkedTo,
    limit: 50,
  });

  // The selected user might still be off-screen if the search filters it
  // out. We reuse the same /users response — when the picker first mounts
  // (no search), the selected user is in the page; otherwise the parent
  // can pass `fallback` to keep the trigger label sane.
  const inList = list.data?.find((u) => u.id === value) ?? null;
  const selected = inList
    ? { name: inList.name, email: inList.email }
    : fallback ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.name ?? "(no name)"}
              <span className="ml-2 text-xs text-muted-foreground">
                {selected.email}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {list.isLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Đang tải…
            </div>
          ) : list.error ? (
            <p className="p-3 text-xs text-destructive">
              Không tải được danh sách:{" "}
              {(list.error as Error).message ?? "lỗi không xác định"}
            </p>
          ) : !list.data?.length ? (
            <p className="p-3 text-xs text-muted-foreground">
              Không có người dùng nào.
            </p>
          ) : (
            <ul className="py-1">
              {list.data.map((u) => {
                const active = u.id === value;
                const linkedElsewhere =
                  u.employeeId !== null && u.employeeId !== includeLinkedTo;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(u);
                        setOpen(false);
                        setSearch("");
                      }}
                      disabled={linkedElsewhere}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
                        active && "bg-accent/30",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">
                          {u.name ?? "(no name)"}
                          {linkedElsewhere && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                              already linked
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </div>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
