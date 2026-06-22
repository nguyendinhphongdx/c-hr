"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckCircle2,
  Copy,
  Inbox,
  Loader2,
  Mail,
  UserPlus2,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { InvitationStatusBadge } from "../components/InvitationStatusBadge";
import { InviteCreateDialog } from "../components/InviteCreateDialog";
import {
  useApproveInvitation,
  useInvitations,
  useRejectInvitation,
  useRevokeInvitation,
} from "../hooks/useInvitations";
import type { Invitation, InvitationKind, InvitationStatus } from "../types";

type TabKey = "pending" | "history";

export function InvitationsAdminView() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows, isLoading } = useInvitations();
  const revoke = useRevokeInvitation();
  const approve = useApproveInvitation();
  const reject = useRejectInvitation();

  const { pending, history } = useMemo(() => {
    const list = rows ?? [];
    return {
      pending: list.filter((r) => r.status === "PENDING"),
      history: list.filter((r) => r.status !== "PENDING"),
    };
  }, [rows]);

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lời mời thành viên</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý lời mời (gửi đi) và yêu cầu tham gia (gửi đến) cho tổ chức của bạn.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus2 className="mr-2 h-4 w-4" />
          Mời thành viên
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="pending">
            Đang chờ
            {pending.length > 0 && (
              <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cần xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader />
              ) : pending.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="h-10 w-10 text-muted-foreground/40" />}
                  title="Không có lời mời chờ xử lý"
                  description="Khi có user yêu cầu tham gia tổ chức, sẽ xuất hiện ở đây."
                />
              ) : (
                <ul className="space-y-2">
                  {pending.map((r) => (
                    <InvitationRow
                      key={r.id}
                      row={r}
                      busy={revoke.isPending || approve.isPending || reject.isPending}
                      onRevoke={(id) => revoke.mutate({ id })}
                      onApprove={(id) => approve.mutate({ id })}
                      onReject={(id) =>
                        reject.mutate({ id, input: { decisionNote: undefined } })
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader />
              ) : history.length === 0 ? (
                <EmptyState
                  icon={<Mail className="h-10 w-10 text-muted-foreground/40" />}
                  title="Chưa có lời mời nào"
                />
              ) : (
                <ul className="space-y-2">
                  {history.map((r) => (
                    <InvitationRow key={r.id} row={r} historical />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </PageContainer>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {icon}
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

const KIND_LABEL: Record<InvitationKind, string> = {
  ADMIN_INVITE: "Mời",
  SELF_REQUEST: "Yêu cầu",
};

const ROLE_LABEL: Record<string, string> = {
  user: "Thành viên",
  admin: "Admin tổ chức",
  sysowner: "Sysowner",
};

function InvitationRow({
  row,
  historical,
  busy,
  onRevoke,
  onApprove,
  onReject,
}: {
  row: Invitation;
  historical?: boolean;
  busy?: boolean;
  onRevoke?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const copyLink = async () => {
    if (!row.inviteToken) return;
    const url = `${window.location.origin}/invite/${encodeURIComponent(row.inviteToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    } catch {
      toast.error("Không copy được");
    }
  };

  return (
    <li className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.name ?? row.email}</span>
            <InvitationStatusBadge status={row.status as InvitationStatus} />
            <span className="rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {KIND_LABEL[row.kind]}
            </span>
            {row.invitedRole && row.invitedRole !== "user" && (
              <span className="rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                {ROLE_LABEL[row.invitedRole] ?? row.invitedRole}
              </span>
            )}
          </div>
          {row.name && (
            <div className="text-xs text-muted-foreground">{row.email}</div>
          )}
          {row.message && (
            <div className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
              &ldquo;{row.message}&rdquo;
            </div>
          )}
          <div className="mt-1 text-[11px] text-muted-foreground">
            Tạo {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
            {row.expiresAt && row.kind === "ADMIN_INVITE" && (
              <> · hết hạn {format(new Date(row.expiresAt), "dd/MM/yyyy", { locale: vi })}</>
            )}
          </div>
        </div>

        {!historical && (
          <div className="flex items-center gap-1.5">
            {row.kind === "ADMIN_INVITE" && row.inviteToken && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyLink}
                disabled={busy}
              >
                <Copy className="mr-1.5 h-3 w-3" />
                Copy link
              </Button>
            )}
            {row.kind === "SELF_REQUEST" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-emerald-700 hover:bg-emerald-50"
                onClick={() => onApprove?.(row.id)}
                disabled={busy}
              >
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
                Duyệt
              </Button>
            )}
            {row.kind === "SELF_REQUEST" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onReject?.(row.id)}
                disabled={busy}
              >
                <XCircle className="mr-1.5 h-3 w-3" />
                Từ chối
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRevoke?.(row.id)}
              disabled={busy}
            >
              <X className="mr-1.5 h-3 w-3" />
              Huỷ
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
