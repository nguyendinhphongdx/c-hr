"use client";

import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
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

import { useEmployee, useEmployees } from "../hooks/useEmployees";
import type { Employee } from "../types";

interface EmployeePickerProps {
  value: ID | null;
  onChange: (employeeId: ID | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Status filter for the search list. Defaults to ACTIVE. */
  status?: Employee["status"];
}

const PAGE_LIMIT = 20;

/**
 * Search-as-you-type Employee picker. Uses GET /employees with the `q`
 * filter (matches code or linked User's name / email). Selected employee
 * is loaded separately so the trigger label survives unrelated searches.
 */
export function EmployeePicker({
  value,
  onChange,
  placeholder = "Select employee…",
  disabled = false,
  status = "ACTIVE",
}: EmployeePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useEmployees({
    q: search.trim() || undefined,
    status,
    limit: PAGE_LIMIT,
  });

  // Resolve the selected employee independently of the search results
  // so the trigger label survives unrelated searches.
  const selected = useEmployee(value);
  const selectedEmployee = selected.data ?? null;

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
          {selectedEmployee ? (
            <span className="truncate">
              {selectedEmployee.user?.name ?? "(no name)"}
              <span className="ml-2 text-xs text-muted-foreground">
                {selectedEmployee.user?.email}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear"
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                  setSearch("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(null);
                    setSearch("");
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
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
              placeholder="Search by name, email, or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {list.isLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : !list.data?.data.length ? (
            <p className="p-3 text-xs text-muted-foreground">
              No employees match.
            </p>
          ) : (
            <ul className="py-1">
              {list.data.data.map((emp) => {
                const active = emp.id === value;
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(emp.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50",
                        active && "bg-accent/30",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">
                          {emp.user?.name ?? "(no name)"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {emp.user?.email ?? "—"} · {emp.code}
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
