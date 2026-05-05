"use client";

import {
  Copy,
  Eye,
  Info,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useGetAttendanceDeviceToken,
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
  /**
   * `created` — vừa tạo / regenerate, hiển thị warning về token cũ;
   * `view` — admin chủ động xem lại, không có warning đặc biệt.
   */
  mode: "created" | "view";
}

export function AttendanceDevicesView() {
  const canManage = useIsAppAdmin("HRM");
  const list = useAttendanceDevices();
  const create = useCreateAttendanceDevice();
  const update = useUpdateAttendanceDevice();
  const getToken = useGetAttendanceDeviceToken();
  const regen = useRegenerateAttendanceDeviceToken();
  const remove = useDeleteAttendanceDevice();

  const [createOpen, setCreateOpen] = useState(false);
  const [tokenDialog, setTokenDialog] = useState<TokenDialogState | null>(null);

  const apiEndpoint = String(apiClient.defaults.baseURL ?? "");

  const onCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copied");
    } catch {
      toast.error("Copy thất bại — copy thủ công.");
    }
  };

  const onCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(apiEndpoint);
      toast.success("Endpoint copied");
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
        mode: "created",
      });
    } catch (err) {
      toast.error("Tạo device thất bại", {
        description:
          err instanceof Error ? err.message : "Serial có thể đang được dùng.",
      });
    }
  };

  const onViewToken = async (id: ID, serial: string) => {
    try {
      const { token } = await getToken.mutateAsync(id);
      setTokenDialog({ deviceId: id, token, serial, mode: "view" });
    } catch (err) {
      toast.error("Không lấy được token", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  const onCopyToken = async (id: ID) => {
    try {
      const { token } = await getToken.mutateAsync(id);
      await navigator.clipboard.writeText(token);
      toast.success("Token copied vào clipboard");
    } catch (err) {
      toast.error("Copy thất bại", {
        description: err instanceof Error ? err.message : "Try again later.",
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
        mode: "created",
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
            Đầu đọc chấm công đã đăng ký với Org. Đăng ký mỗi device 1 lần để
            nhận token; ZK-Bridge ở văn phòng dùng token để push log về.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add device
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Cách dùng token</AlertTitle>
        <AlertDescription className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              C-HR API endpoint
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
                {apiEndpoint}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={onCopyEndpoint}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste vào field <strong>API base URL</strong> ở trang{" "}
              <code>/config/chr</code> của ZK-Bridge.
            </p>
          </div>

          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Bấm <strong>Add device</strong> để đăng ký 1 đầu đọc — server
              sinh ra 1 token JWT đại diện cho device đó.
            </li>
            <li>
              Mở <strong>menu ⋯</strong> ở mỗi dòng → <strong>Copy token</strong>
              {" "}để lấy token vào clipboard, paste vào ZK-Bridge (trang{" "}
              <code>/devices</code> của bridge).
            </li>
            <li>
              Token có thể xem lại / copy lại bất cứ lúc nào — không còn giới
              hạn &quot;chỉ hiển thị 1 lần&quot;.
            </li>
            <li>
              Nghi ngờ token bị lộ → <strong>Regenerate token</strong> — token
              cũ ngừng hoạt động ngay, bridge phải paste token mới.
            </li>
          </ol>
        </AlertDescription>
      </Alert>

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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={`Actions for ${dev.serial}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onCopyToken(dev.id)}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Copy token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onViewToken(dev.id, dev.serial)}
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          View token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onRegenerate(dev.id, dev.serial)}
                        >
                          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                          Regenerate token
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onToggleActive(dev.id, !dev.isActive)}
                        >
                          {dev.isActive ? (
                            <>
                              <PowerOff className="mr-2 h-3.5 w-3.5" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Power className="mr-2 h-3.5 w-3.5" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(dev.id, dev.serial)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            Sau khi tạo, token sẽ hiện ngay để copy vào ZK-Bridge. Admin có
            thể quay lại xem / copy token bất cứ lúc nào qua menu ⋯.
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
            {state?.mode === "created"
              ? "Token mới đã được sinh. Token cũ (nếu có) đã ngừng hoạt động — paste token này vào ZK-Bridge."
              : "Token JWT của device. Có thể quay lại đây xem / copy lại bất cứ lúc nào."}
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
          <Button onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
