"use client";

import {
  Copy,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAppAdmin } from "@/features/auth";
import type { ID } from "@/lib/types";

import {
  useAttendanceDevices,
  useCreateAttendanceDevice,
  useDeleteAttendanceDevice,
  useRegenerateAttendanceDeviceToken,
  useUpdateAttendanceDevice,
} from "../hooks/useAttendanceDevices";
import type { DeviceBrand } from "../types";

const BRANDS: DeviceBrand[] = ["ZKTECO", "HIKVISION", "SUPREMA", "OTHER"];

function formatLastSeen(value: string | null): string {
  if (!value) return "Chưa kết nối";
  return new Date(value).toLocaleString();
}

interface TokenDialogState {
  deviceId: ID;
  token: string;
  serial: string;
}

export function AttendanceDevicesView() {
  const canManage = useIsAppAdmin("HRM");
  const list = useAttendanceDevices();
  const create = useCreateAttendanceDevice();
  const update = useUpdateAttendanceDevice();
  const regen = useRegenerateAttendanceDeviceToken();
  const remove = useDeleteAttendanceDevice();

  const [createOpen, setCreateOpen] = useState(false);
  const [tokenDialog, setTokenDialog] = useState<TokenDialogState | null>(null);

  const onCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copied");
    } catch {
      toast.error("Copy thất bại — copy thủ công.");
    }
  };

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Only HRM appadmins can manage attendance devices.
      </p>
    );
  }

  const onCreate = async (data: {
    name: string;
    serial: string;
    brand: DeviceBrand;
    ipAddress?: string;
  }) => {
    try {
      const result = await create.mutateAsync(data);
      setCreateOpen(false);
      setTokenDialog({
        deviceId: result.device.id,
        token: result.token,
        serial: result.device.serial,
      });
    } catch (err) {
      toast.error("Tạo device thất bại", {
        description:
          err instanceof Error ? err.message : "Serial có thể đang được dùng.",
      });
    }
  };

  const onRegenerate = async (id: ID, serial: string) => {
    if (
      !confirm(
        `Tạo token mới cho "${serial}"? Token cũ sẽ ngừng hoạt động ngay lập tức.`,
      )
    ) {
      return;
    }
    try {
      const result = await regen.mutateAsync(id);
      setTokenDialog({
        deviceId: id,
        token: result.token,
        serial,
      });
    } catch (err) {
      toast.error("Regenerate thất bại", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  const onToggleActive = async (id: ID, next: boolean) => {
    try {
      await update.mutateAsync({ id, data: { isActive: next } });
      toast.success(next ? "Device activated" : "Device disabled");
    } catch (err) {
      toast.error("Update thất bại", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  const onDelete = async (id: ID, serial: string) => {
    if (!confirm(`Xoá "${serial}"? Logs lịch sử sẽ giữ nguyên (FK SET NULL).`)) {
      return;
    }
    try {
      await remove.mutateAsync(id);
      toast.success("Device deleted");
    } catch (err) {
      toast.error("Delete thất bại", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Attendance devices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Đầu đọc chấm công đã đăng ký với Org. Mỗi device có 1 token; cấu
            hình token vào device để push log về.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add device
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : list.error ? (
          <p className="p-6 text-sm text-destructive">Couldn&apos;t load devices.</p>
        ) : !list.data?.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Chưa có device nào — nhấn &quot;Add device&quot; để tạo cái đầu tiên.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Serial</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.map((dev) => (
                <tr key={dev.id}>
                  <td className="px-4 py-3 font-medium">{dev.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{dev.serial}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dev.brand.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatLastSeen(dev.lastSeenAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={dev.isActive ? "default" : "outline"}>
                      {dev.isActive ? "active" : "disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRegenerate(dev.id, dev.serial)}
                        title="Regenerate token"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleActive(dev.id, !dev.isActive)}
                      >
                        {dev.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(dev.id, dev.serial)}
                        title="Delete device"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateDeviceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreate}
        pending={create.isPending}
      />

      <TokenDialog
        state={tokenDialog}
        onClose={() => setTokenDialog(null)}
        onCopy={onCopy}
      />
    </div>
  );
}

function CreateDeviceDialog({
  open,
  onOpenChange,
  onCreate,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: {
    name: string;
    serial: string;
    brand: DeviceBrand;
    ipAddress?: string;
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  // Empty until admin explicitly picks — brand is required, no default.
  const [brand, setBrand] = useState<DeviceBrand | "">("");
  const [ipAddress, setIpAddress] = useState("");

  const reset = () => {
    setName("");
    setSerial("");
    setBrand("");
    setIpAddress("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add attendance device</DialogTitle>
          <DialogDescription>
            Token plaintext sẽ chỉ hiện 1 lần ngay sau khi tạo — copy ngay vào
            cấu hình của device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="device-name">Tên</Label>
            <Input
              id="device-name"
              placeholder="Cửa chính"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-serial">Serial</Label>
            <Input
              id="device-serial"
              placeholder="ZK-001"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-brand">Brand *</Label>
            <Select value={brand} onValueChange={(v) => setBrand(v as DeviceBrand)}>
              <SelectTrigger id="device-brand">
                <SelectValue placeholder="Chọn loại máy..." />
              </SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-ip">IP address (optional)</Label>
            <Input
              id="device-ip"
              placeholder="192.168.1.50"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!brand) return;
              onCreate({
                name,
                serial,
                brand,
                ipAddress: ipAddress || undefined,
              });
            }}
            disabled={pending || !name || !serial || !brand}
            className="gap-2"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TokenDialog({
  state,
  onClose,
  onCopy,
}: {
  state: TokenDialogState | null;
  onClose: () => void;
  onCopy: (token: string) => void;
}) {
  return (
    <Dialog open={!!state} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token cho {state?.serial}</DialogTitle>
          <DialogDescription>
            Token này chỉ hiển thị 1 lần. Copy và cấu hình vào device ngay —
            sau khi đóng dialog, không thể xem lại.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">
          {state?.token}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => state && onCopy(state.token)}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button onClick={onClose}>Đã lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
