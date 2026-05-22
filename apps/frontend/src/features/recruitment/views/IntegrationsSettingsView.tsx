"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  useDeleteIntegration,
  useIntegrations,
  useToggleIntegration,
  useUpsertIntegration,
} from "../hooks/useIntegrations";
import type { JobBoard, JobBoardIntegration } from "../types";

const BOARDS: Array<{
  board: JobBoard;
  label: string;
  description: string;
  available: boolean;
}> = [
  {
    board: "TALENT_VN",
    label: "Talent.vn",
    description: "Job board của Rework — Open API có sẵn.",
    available: true,
  },
  {
    board: "TOPCV",
    label: "TopCV",
    description:
      "Cần liên hệ TopCV BD để mua gói + nhận API key. Cùng pattern X-Api-Key + HMAC webhook như Talent.vn.",
    available: false,
  },
  {
    board: "ITVIEC",
    label: "ITviec",
    description:
      "Chưa có public API. Phase 4 sẽ tích hợp qua email-forwarding.",
    available: false,
  },
];

export function IntegrationsSettingsView() {
  const integrationsQuery = useIntegrations();
  const upsert = useUpsertIntegration();
  const toggle = useToggleIntegration();
  const remove = useDeleteIntegration();

  const integrations = integrationsQuery.data ?? [];
  const byBoard = new Map(integrations.map((i) => [i.board, i]));

  return (
    <PageContainer variant="bleed" className="h-full p-3!">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Cài đặt — Kết nối job board
          </h1>
          <p className="text-xs text-muted-foreground">
            Dán API key + webhook secret từ trang &quot;Kết nối API&quot; trên
            job board. C-HR sẽ dùng để đăng tin và nhận thông báo ứng viên.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {integrationsQuery.isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Đang tải…
            </div>
          ) : (
            <div className="grid gap-4">
              {BOARDS.map((b) => (
                <IntegrationCard
                  key={b.board}
                  board={b.board}
                  label={b.label}
                  description={b.description}
                  available={b.available}
                  existing={byBoard.get(b.board)}
                  onUpsert={async (apiKey, webhookSecret) => {
                    await upsert.mutateAsync({
                      board: b.board,
                      apiKey,
                      webhookSecret: webhookSecret || undefined,
                    });
                  }}
                  onToggle={() => toggle.mutate(b.board)}
                  onDelete={() => {
                    if (
                      !confirm(
                        `Xoá kết nối ${b.label}? Các job đã đăng vẫn còn trên job board.`,
                      )
                    ) {
                      return;
                    }
                    remove.mutate(b.board);
                  }}
                  saving={upsert.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

interface IntegrationCardProps {
  board: JobBoard;
  label: string;
  description: string;
  available: boolean;
  existing: JobBoardIntegration | undefined;
  saving: boolean;
  onUpsert: (apiKey: string, webhookSecret: string) => Promise<void>;
  onToggle: () => void;
  onDelete: () => void;
}

function IntegrationCard({
  label,
  description,
  available,
  existing,
  saving,
  onUpsert,
  onToggle,
  onDelete,
}: IntegrationCardProps) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const canSave = available && apiKey.trim().length >= 8;

  return (
    <section
      className={cn(
        "rounded-lg border bg-background p-4",
        !available && "opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{label}</h2>
            {existing && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  existing.isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {existing.isActive ? "Đang bật" : "Đang tắt"}
              </span>
            )}
            {!available && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Sắp có
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {existing && (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onToggle}
              title={existing.isActive ? "Tắt" : "Bật"}
            >
              {existing.isActive ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              title="Xoá kết nối"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </header>

      {existing && !editing ? (
        <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted-foreground">API key</dt>
          <dd className="font-mono">{existing.apiKeyPreview}</dd>
          <dt className="text-muted-foreground">Webhook secret</dt>
          <dd>{existing.hasWebhookSecret ? "Đã cấu hình" : "Chưa có"}</dd>
          <dt className="text-muted-foreground">Đồng bộ gần nhất</dt>
          <dd>
            {existing.lastSyncAt
              ? format(new Date(existing.lastSyncAt), "HH:mm dd/MM/yyyy", {
                  locale: vi,
                })
              : "Chưa đồng bộ"}
          </dd>
          {existing.lastError && (
            <>
              <dt className="text-muted-foreground">Lỗi gần nhất</dt>
              <dd className="text-destructive">{existing.lastError}</dd>
            </>
          )}
        </dl>
      ) : null}

      {available && (editing || !existing) && (
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">API key</label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Dán API key từ trang Kết nối API"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Webhook secret (tuỳ chọn — auto-gen nếu để trống)
            </label>
            <Input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setApiKey("");
                  setWebhookSecret("");
                }}
              >
                Huỷ
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!canSave || saving}
              onClick={async () => {
                await onUpsert(apiKey.trim(), webhookSecret.trim());
                setEditing(false);
                setApiKey("");
                setWebhookSecret("");
              }}
            >
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {existing ? "Cập nhật" : "Lưu & kích hoạt"}
            </Button>
          </div>
        </div>
      )}

      {available && existing && !editing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setEditing(true)}
        >
          Đổi credentials
        </Button>
      )}
    </section>
  );
}
