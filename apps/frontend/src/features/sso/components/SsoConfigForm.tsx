"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  useDeleteSsoConfig,
  useSsoConfig,
  useUpsertSsoConfig,
} from "../hooks/useSsoConfig";

export function SsoConfigForm() {
  const { data, isLoading } = useSsoConfig();
  const upsert = useUpsertSsoConfig();
  const remove = useDeleteSsoConfig();

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (data) {
      setTenantId(data.tenantId);
      setClientId(data.clientId);
      setIsActive(data.isActive);
      setClientSecret("");
    } else if (!isLoading) {
      setTenantId("");
      setClientId("");
      setClientSecret("");
      setIsActive(true);
    }
  }, [data, isLoading]);

  const isCreating = !data;
  const submitting = upsert.isPending || remove.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() || !clientId.trim()) {
      toast.error("Vui lòng nhập đầy đủ Tenant ID và Client ID");
      return;
    }
    if (isCreating && !clientSecret.trim()) {
      toast.error("Lần đầu thiết lập cần nhập Client Secret");
      return;
    }
    try {
      await upsert.mutateAsync({
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
        isActive,
      });
      setClientSecret("");
      toast.success("Đã lưu cấu hình SSO");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Lưu cấu hình thất bại",
      );
    }
  };

  const onDelete = async () => {
    if (!confirm("Xoá cấu hình SSO? User sẽ không đăng nhập Microsoft được nữa.")) {
      return;
    }
    try {
      await remove.mutateAsync();
      toast.success("Đã xoá cấu hình SSO");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Xoá thất bại",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="sso-tenant">Tenant ID (Directory ID)</Label>
        <Input
          id="sso-tenant"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="vd 72f988bf-86f1-41af-91ab-2d7cd011db47"
          disabled={submitting}
          required
        />
        <p className="text-xs text-muted-foreground">
          Tìm trong Azure portal → Microsoft Entra ID → Overview → Tenant ID.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sso-client">Client ID (Application ID)</Label>
        <Input
          id="sso-client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="vd 11111111-2222-3333-4444-555555555555"
          disabled={submitting}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sso-secret">
          Client Secret{" "}
          {!isCreating && (
            <span className="text-xs text-muted-foreground">
              (để trống nếu giữ secret cũ)
            </span>
          )}
        </Label>
        <Input
          id="sso-secret"
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder={isCreating ? "Bắt buộc" : "••••••• (giữ nguyên)"}
          disabled={submitting}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Lấy trong Azure portal → App registrations → Certificates & secrets.
          Secret được mã hoá AES-256-GCM trước khi lưu DB.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="sso-active">Bật SSO</Label>
          <p className="text-xs text-muted-foreground">
            Khi tắt, nút &quot;Đăng nhập Microsoft&quot; không hoạt động.
          </p>
        </div>
        <Switch
          id="sso-active"
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={submitting}
        />
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Redirect URI</strong> cần thêm vào Azure App registration:
        <code className="ml-1 break-all rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">
          {(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1") +
            "/sso/entra/callback"}
        </code>
      </div>

      <div className="flex items-center justify-end gap-2">
        {!isCreating && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            disabled={submitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xoá cấu hình
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {upsert.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isCreating ? "Tạo cấu hình" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
