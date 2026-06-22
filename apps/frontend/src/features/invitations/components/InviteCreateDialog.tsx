"use client";

import { Check, Copy, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";

import { useCreateInvitation } from "../hooks/useInvitations";
import type { InvitationCreateResponse, InvitedRole } from "../types";

interface InviteCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteCreateDialog({ open, onClose }: InviteCreateDialogProps) {
  const create = useCreateInvitation();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<InvitedRole>("user");
  const [created, setCreated] = useState<InvitationCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state on each fresh open.
  const wantedSyncKey = open ? "open" : "closed";
  const [syncKey, setSyncKey] = useState(wantedSyncKey);
  if (open && syncKey !== wantedSyncKey) {
    setSyncKey(wantedSyncKey);
    setEmail("");
    setName("");
    setMessage("");
    setRole("user");
    setCreated(null);
    setCopied(false);
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Nhập email");
      return;
    }
    try {
      const result = await create.mutateAsync({
        email: email.trim(),
        name: name.trim() || undefined,
        message: message.trim() || undefined,
        role,
      });
      setCreated(result);
      toast.success("Đã tạo lời mời");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Tạo lời mời thất bại",
      );
    }
  };

  const onCopy = async () => {
    if (!created?.acceptUrl) return;
    try {
      await navigator.clipboard.writeText(created.acceptUrl);
      setCopied(true);
      toast.success("Đã copy link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không copy được — hãy chọn và copy thủ công");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{created ? "Lời mời đã tạo" : "Mời thành viên mới"}</DialogTitle>
          <DialogDescription>
            {created
              ? "Copy link dưới đây gửi cho người được mời (qua Zalo/Slack/...). Khi họ click + đăng nhập, hệ thống tự động thêm họ vào tổ chức."
              : "Nhập email người bạn muốn mời. Lời mời có hiệu lực 7 ngày."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Email được mời</div>
              <div className="font-medium">{created.email}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Quyền:{" "}
                <span className="font-medium text-foreground">
                  {created.invitedRole === "admin"
                    ? "Admin tổ chức"
                    : created.invitedRole === "sysowner"
                      ? "Sysowner"
                      : "Thành viên"}
                </span>
                {created.expiresAt && (
                  <>
                    {" · "}Hết hạn:{" "}
                    {new Date(created.expiresAt).toLocaleString("vi-VN")}
                  </>
                )}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Link kích hoạt</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={created.acceptUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onCopy}
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mẹo: Nếu người được mời có Microsoft Office 365 với cùng email,
                họ có thể bỏ qua link và bấm thẳng &quot;Đăng nhập Microsoft&quot;
                trên trang đăng nhập — hệ thống sẽ tự động kích hoạt lời mời.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Đóng</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: tuan@cmc.vn"
                required
                disabled={create.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-name">
                Tên hiển thị <span className="text-xs text-muted-foreground">(tuỳ chọn)</span>
              </Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd: Nguyễn Văn Tuấn"
                disabled={create.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-role">Quyền trong tổ chức</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as InvitedRole)}
                disabled={create.isPending}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    Thành viên — quyền cơ bản (xem dữ liệu của mình)
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin tổ chức — toàn quyền (mời, đổi cấu hình, đổi role)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Có thể đổi sau qua trang Nhân sự. Quyền HRM appadmin gán
                riêng qua Settings sau khi user vào tổ chức.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-message">
                Lời nhắn <span className="text-xs text-muted-foreground">(tuỳ chọn)</span>
              </Label>
              <Textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="vd: Em vào nhóm Engineering nhé"
                rows={3}
                maxLength={2000}
                disabled={create.isPending}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
                Huỷ
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Tạo lời mời
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
