"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";
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

interface BoardMeta {
  board: JobBoard;
  label: string;
  description: string;
  /** Whether C-HR has an adapter implementation for this board. */
  available: boolean;
  /** Board's docs/help link. */
  docsUrl?: string;
  /** Step-by-step setup hint shown above the form. */
  steps: string[];
  /** Show the paired Secret-key input (TopCV, etc.). */
  hasSecretKey?: boolean;
}

const BOARDS: BoardMeta[] = [
  {
    board: "TALENT_VN",
    label: "Talent.vn",
    description: "Job board của Rework — Open API có sẵn.",
    available: true,
    docsUrl: "https://talent.rework.vn",
    steps: [
      'Đăng nhập tài khoản nhà tuyển dụng trên talent.vn → "Cài đặt" → "Kết nối API".',
      "Bấm Tạo token. Copy giá trị API key + Webhook secret.",
      "Quay lại đây, dán cả hai vào ô bên dưới + Lưu & kích hoạt.",
      'Copy "URL webhook" sinh ra phía dưới, paste vào ô "Webhook URL" trên talent.vn để hoàn tất.',
    ],
  },
  {
    board: "TOPCV",
    label: "TopCV",
    description: "Job board IT lớn nhất VN. Cần liên hệ BD để mở API access.",
    available: true,
    hasSecretKey: true,
    docsUrl: "https://tuyendung.topcv.vn",
    steps: [
      "Đăng nhập tài khoản Nhà tuyển dụng trên TopCV, mua gói có API access.",
      'Vào "Cài đặt tài khoản" → "Kết nối API" → copy Access Token (= API key) và Secret Key.',
      "Dán cả 2 giá trị vào form bên dưới + Lưu & kích hoạt (bỏ trống Webhook secret — TopCV dùng Secret Key để ký webhook).",
      'Copy "URL webhook" sinh ra phía dưới, paste vào ô "Webhook URL" trên TopCV.',
      'Với các job đã có sẵn trên TopCV: chưa hỗ trợ tự link, sẽ về tab Đăng tin để bấm "Đăng lại" — C-HR sẽ tạo mới trên TopCV. (Bản kế: nút "Link job có sẵn".)',
    ],
  },
  {
    board: "ITVIEC",
    label: "ITviec",
    description:
      "Chưa có public API. Phase 4 sẽ tích hợp qua email-forwarding (mailbox parser).",
    available: false,
    steps: [],
  },
];

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/** Build the webhook URL the partner board needs to call. */
function buildWebhookUrl(board: JobBoard, integrationId: string): string {
  const boardSlug = board.toLowerCase().replace(/_/g, "-");
  // NEXT_PUBLIC_API_URL is usually ".../api" — append v1 if not already there.
  const base = apiBase.replace(/\/+$/, "");
  const withV1 = /\/v\d+$/.test(base) ? base : `${base}/v1`;
  return `${withV1}/webhooks/recruitment/${boardSlug}/${integrationId}`;
}

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
                  meta={b}
                  existing={byBoard.get(b.board)}
                  onUpsert={async (apiKey, secretKey, webhookSecret) => {
                    await upsert.mutateAsync({
                      board: b.board,
                      apiKey,
                      secretKey: secretKey || undefined,
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
  meta: BoardMeta;
  existing: JobBoardIntegration | undefined;
  saving: boolean;
  onUpsert: (
    apiKey: string,
    secretKey: string,
    webhookSecret: string,
  ) => Promise<void>;
  onToggle: () => void;
  onDelete: () => void;
}

function IntegrationCard({
  meta,
  existing,
  saving,
  onUpsert,
  onToggle,
  onDelete,
}: IntegrationCardProps) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hintsOpen, setHintsOpen] = useState(!existing && meta.available);

  const canSave = meta.available && apiKey.trim().length >= 8;
  const webhookUrl = existing
    ? buildWebhookUrl(meta.board, existing.id)
    : null;

  return (
    <section
      className={cn(
        "rounded-lg border bg-background p-4",
        !meta.available && "opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{meta.label}</h2>
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
            {!meta.available && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Sắp có
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {meta.description}
          </p>
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

      {meta.available && meta.steps.length > 0 && (
        <details
          className="mt-3 rounded-md border bg-muted/30 px-3 py-2"
          open={hintsOpen}
          onToggle={(e) => setHintsOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
            Hướng dẫn lấy API key
            {meta.docsUrl && (
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Mở {meta.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            {meta.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      )}

      {existing && webhookUrl && (
        <div className="mt-3 rounded-md border border-dashed bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Webhook URL — paste vào trang Kết nối API trên {meta.label}
          </p>
          <CopyableUrl url={webhookUrl} />
        </div>
      )}

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

      {meta.available && (editing || !existing) && (
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">API key</label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Dán API key từ trang Kết nối API ${meta.label}`}
              className="mt-1 font-mono"
            />
          </div>
          {meta.hasSecretKey && (
            <div>
              <label className="text-xs text-muted-foreground">
                Secret key (cặp với API key)
              </label>
              <Input
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={`Secret key từ ${meta.label}`}
                className="mt-1 font-mono"
              />
            </div>
          )}
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
                  setSecretKey("");
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
                await onUpsert(
                  apiKey.trim(),
                  secretKey.trim(),
                  webhookSecret.trim(),
                );
                setEditing(false);
                setApiKey("");
                setSecretKey("");
                setWebhookSecret("");
              }}
            >
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {existing ? "Cập nhật" : "Lưu & kích hoạt"}
            </Button>
          </div>
        </div>
      )}

      {meta.available && existing && !editing && (
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

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-[11px]">
        {url}
      </code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            // clipboard blocked — fall through silently
          }
        }}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
