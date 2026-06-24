"use client";

import { ArrowRight, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApproveRequest, useRequests } from "@/features/requests";

const PREVIEW_LIMIT = 3;

export function PendingApprovalsCard() {
  const list = useRequests({ scope: "incoming" });
  const approve = useApproveRequest();

  const pending = (list.data ?? []).filter((r) => r.status === "PENDING");
  const visible = pending.slice(0, PREVIEW_LIMIT);
  const overflow = pending.length - visible.length;

  const onApprove = async (id: string) => {
    try {
      await approve.mutateAsync({ id, data: {} });
      toast.success("Đã duyệt đơn");
    } catch (err) {
      toast.error("Không duyệt được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" /> Cần tôi duyệt
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {pending.length}
              </span>
            )}
          </span>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/approval/requests">
              Tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardTitle>
        <CardDescription>
          Quick approve từ đây hoặc click để xem chi tiết.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
          </div>
        ) : pending.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Không có đơn nào chờ bạn duyệt. ✨
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/approval/requests?selected=${r.id}`}
                    className="block hover:text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {r.title ?? r.group.name}
                      </span>
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {r.group.code}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.requester.user?.name ?? r.requester.user?.email ?? r.requester.code}
                      {" · "}
                      {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </Link>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApprove(r.id)}
                  disabled={approve.isPending}
                  className="shrink-0 gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Duyệt
                </Button>
              </li>
            ))}
            {overflow > 0 && (
              <li className="pt-2 text-center text-xs text-muted-foreground">
                + {overflow} đơn khác
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
