"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAppAdmin } from "@/features/auth";
import { ApprovalFlow } from "@/features/collaboration";
import { cn } from "@/lib/utils";

import { RequestPreview } from "../components/RequestPreview";
import { useRequestGroups, useRequests } from "../hooks/useRequests";
import type {
  RequestListScope,
  RequestParticipant,
  RequestRow,
} from "../types";

const ALL = "all";

/**
 * Master-detail layout: list on the left, preview/decisions on the right
 * via shadcn/ui Resizable panels. Group + scope filters in the header.
 */
export function RequestListView() {
  const isHrmAdmin = useIsAppAdmin("HRM");
  const [scope, setScope] = useState<RequestListScope>("mine");
  const [groupId, setGroupId] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groupsQuery = useRequestGroups();
  const listQuery: { groupId?: string; scope?: "mine" | "incoming" } = {};
  if (groupId !== ALL) listQuery.groupId = groupId;
  if (scope !== "all") listQuery.scope = scope;
  const { data: rows, isLoading } = useRequests(listQuery);

  const selected: RequestRow | null =
    rows?.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Đơn từ</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý đơn xin nghỉ và đơn quên chấm — chọn 1 dòng để xem chi tiết.
          </p>
        </div>
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo đơn
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as RequestListScope)}>
          <TabsList>
            <TabsTrigger value="mine">Của tôi</TabsTrigger>
            <TabsTrigger value="incoming">Cần duyệt</TabsTrigger>
            {isHrmAdmin && <TabsTrigger value="all">Tất cả Org</TabsTrigger>}
          </TabsList>
        </Tabs>

        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Loại đơn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả loại</SelectItem>
            {(groupsQuery.data ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="overflow-y-auto border-r">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Đang tải...</p>
          ) : !rows || rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Không có đơn nào.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 px-4 py-3 text-left text-sm hover:bg-accent/40",
                      selectedId === r.id && "bg-accent/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.group.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.createdAt), "dd/MM HH:mm")}
                      </span>
                    </div>
                    <ApprovalFlow
                      size="sm"
                      requester={mapPartyRow(r.requester)}
                      approver={r.approver ? mapPartyRow(r.approver) : null}
                      status={r.status}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="overflow-hidden">
          <RequestPreview request={selected} />
        </div>
      </div>
    </div>
  );
}

function mapPartyRow(p: RequestParticipant): { name: string; avatar: null } {
  return {
    name: p.user?.name ?? p.user?.email ?? p.code,
    avatar: null,
  };
}
