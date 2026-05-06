"use client";

import { format } from "date-fns";
import {
  Inbox,
  Layers,
  ListChecks,
  Mail,
  Plus,
  Users,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useIsAppAdmin } from "@/features/auth";
import { ApprovalFlow } from "@/features/collaboration";
import { cn } from "@/lib/utils";

import { RequestCreateDialog } from "../components/RequestCreateDialog";
import { RequestPreview } from "../components/RequestPreview";
import { useRequestGroups, useRequests } from "../hooks/useRequests";
import type {
  RequestListScope,
  RequestParticipant,
  RequestRow,
  RequestStatus,
} from "../types";

const ALL = "all";

type StatusFilter = "all" | RequestStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã huỷ" },
];

/**
 * Outlook-style 3-pane: scope/group nav (left) → dense list (middle) →
 * sticky preview (right). Scope and group are server-side filters; status
 * is filtered client-side off the list result.
 */
export function RequestListView() {
  const isHrmAdmin = useIsAppAdmin("HRM");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<RequestListScope>("mine");
  const [groupId, setGroupId] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Selection persisted on URL (`?id=<requestId>`) — survives reload + share.
  const selectedId = searchParams.get("id");
  const [creating, setCreating] = useState(false);

  const setSelectedId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("id", id);
    else params.delete("id");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const groupsQuery = useRequestGroups();
  const listQuery: { groupId?: string; scope?: "mine" | "incoming" } = {};
  if (groupId !== ALL) listQuery.groupId = groupId;
  if (scope !== "all") listQuery.scope = scope;
  const { data: rows, isLoading } = useRequests(listQuery);

  // Pending badge for "Cần duyệt" scope — count incoming PENDING regardless of
  // current scope/group selection so the user always knows the inbox size.
  const incomingQuery = useRequests({ scope: "incoming" });
  const pendingCount = useMemo(
    () => (incomingQuery.data ?? []).filter((r) => r.status === "PENDING").length,
    [incomingQuery.data],
  );

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const selected: RequestRow | null =
    filteredRows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[12rem_minmax(0,24rem)_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex flex-col border-b md:border-b-0 md:border-r">
        <div className="border-b px-3 py-3">
          <h1 className="text-sm font-semibold tracking-tight">Đơn từ</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Đơn nghỉ & quên chấm
          </p>
        </div>

        <nav className="flex flex-col gap-1 p-2">
          <SidebarSection label="Phạm vi" />
          <SidebarItem
            icon={<Mail className="h-4 w-4" />}
            label="Của tôi"
            active={scope === "mine"}
            onClick={() => setScope("mine")}
          />
          <SidebarItem
            icon={<Inbox className="h-4 w-4" />}
            label="Cần duyệt"
            active={scope === "incoming"}
            onClick={() => setScope("incoming")}
            trailing={
              pendingCount > 0 ? (
                <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                  {pendingCount}
                </Badge>
              ) : null
            }
          />
          {isHrmAdmin && (
            <SidebarItem
              icon={<Users className="h-4 w-4" />}
              label="Tất cả Org"
              active={scope === "all"}
              onClick={() => setScope("all")}
            />
          )}

          <SidebarSection label="Loại đơn" className="mt-3" />
          <SidebarItem
            icon={<Layers className="h-4 w-4" />}
            label="Tất cả loại"
            active={groupId === ALL}
            onClick={() => setGroupId(ALL)}
          />
          {(groupsQuery.data ?? []).map((g) => (
            <SidebarItem
              key={g.id}
              icon={<ListChecks className="h-4 w-4" />}
              label={g.name}
              active={groupId === g.id}
              onClick={() => setGroupId(g.id)}
            />
          ))}
        </nav>

        <div className="mt-auto border-t p-2">
          <Button className="w-full" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo đơn
          </Button>
        </div>
      </aside>

      {/* Middle pane — list */}
      <section className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
        <div className="flex flex-wrap gap-1.5 border-b p-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                statusFilter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Đang tải...</p>
          ) : filteredRows.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>Không có đơn nào</EmptyTitle>
                <EmptyDescription>
                  Thử đổi phạm vi, loại đơn hoặc bộ lọc trạng thái.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {filteredRows.map((r) => (
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
                      <span className="truncate font-medium">
                        {r.title ?? r.group.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(r.createdAt), "dd/MM HH:mm")}
                      </span>
                    </div>
                    {r.title && (
                      <div className="truncate text-xs text-muted-foreground">
                        {r.group.name}
                      </div>
                    )}
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
      </section>

      {/* Right pane — preview */}
      <section className="hidden min-h-0 md:block">
        {selected ? (
          <RequestPreview request={selected} />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Mail />
                </EmptyMedia>
                <EmptyTitle>Chưa chọn đơn</EmptyTitle>
                <EmptyDescription>
                  Chọn 1 đơn ở danh sách để xem chi tiết, duyệt hoặc bình luận.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </section>

      <RequestCreateDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}

function SidebarSection({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-2 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {label}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

function mapPartyRow(p: RequestParticipant): { name: string; avatar: null } {
  return {
    name: p.user?.name ?? p.user?.email ?? p.code,
    avatar: null,
  };
}
