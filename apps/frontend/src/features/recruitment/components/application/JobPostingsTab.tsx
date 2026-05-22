"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  useClosePostingOnBoard,
  useIntegrations,
  useJobPostings,
  usePushJobToBoard,
} from "../../hooks/useIntegrations";
import type { JobBoard, JobBoardPosting } from "../../types";

const BOARD_LABEL: Record<JobBoard, string> = {
  TALENT_VN: "Talent.vn",
  TOPCV: "TopCV",
  ITVIEC: "ITviec",
};

interface JobPostingsTabProps {
  jobId: ID;
  canPush: boolean;
}

export function JobPostingsTab({ jobId, canPush }: JobPostingsTabProps) {
  const integrationsQuery = useIntegrations();
  const postingsQuery = useJobPostings(jobId);
  const push = usePushJobToBoard();
  const close = useClosePostingOnBoard();

  const integrations = integrationsQuery.data ?? [];
  const postings = postingsQuery.data ?? [];
  const postingsByBoard = new Map(postings.map((p) => [p.integration.board, p]));

  const activeIntegrations = integrations.filter((i) => i.isActive);

  if (integrationsQuery.isLoading) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Đang tải…</p>
    );
  }

  if (activeIntegrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Chưa có job board nào được kích hoạt</p>
        <p className="text-xs text-muted-foreground">
          Vào <span className="font-medium">Tuyển dụng → Kết nối</span> để
          dán API key của Talent.vn / TopCV.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {activeIntegrations.map((integration) => {
        const posting = postingsByBoard.get(integration.board);
        return (
          <li key={integration.id}>
            <PostingRow
              board={integration.board}
              posting={posting}
              canPush={canPush}
              pending={push.isPending || close.isPending}
              onPush={() => push.mutate({ jobId, board: integration.board })}
              onClose={() => close.mutate({ jobId, board: integration.board })}
            />
          </li>
        );
      })}
    </ul>
  );
}

interface PostingRowProps {
  board: JobBoard;
  posting?: JobBoardPosting;
  canPush: boolean;
  pending: boolean;
  onPush: () => void;
  onClose: () => void;
}

function PostingRow({
  board,
  posting,
  canPush,
  pending,
  onPush,
  onClose,
}: PostingRowProps) {
  const status = posting?.lastSyncStatus;
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {BOARD_LABEL[board]}
            {status && <StatusBadge status={status} />}
          </div>
          {posting ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              ID: <span className="font-mono">{posting.externalId}</span>
              {posting.publishedAt && (
                <>
                  {" · đăng "}
                  {format(new Date(posting.publishedAt), "dd/MM/yyyy HH:mm", {
                    locale: vi,
                  })}
                </>
              )}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Chưa đăng tin
            </p>
          )}
          {posting?.lastSyncError && (
            <p className="mt-1 text-[11px] text-destructive">
              {posting.lastSyncError}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {posting?.externalUrl && (
            <Button asChild size="sm" variant="ghost">
              <a
                href={posting.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Mở
              </a>
            </Button>
          )}
          {canPush &&
            (status === "CLOSED" || !posting ? (
              <Button
                type="button"
                size="sm"
                onClick={onPush}
                disabled={pending}
              >
                {pending && (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                )}
                <Send className="mr-1 h-3.5 w-3.5" />
                Đăng tin
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onPush}
                  disabled={pending}
                >
                  Đăng lại
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  disabled={pending}
                >
                  Đóng tin
                </Button>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: JobBoardPosting["lastSyncStatus"] }) {
  const map = {
    PENDING: {
      label: "Đang chờ",
      cls: "bg-muted text-muted-foreground",
      Icon: Loader2,
    },
    SUCCESS: {
      label: "Đang đăng",
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      Icon: CheckCircle2,
    },
    FAILED: {
      label: "Lỗi",
      cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      Icon: XCircle,
    },
    CLOSED: {
      label: "Đã đóng",
      cls: "bg-muted text-muted-foreground",
      Icon: XCircle,
    },
  } as const;
  const meta = map[status];
  const { Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        meta.cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
