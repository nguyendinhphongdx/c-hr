"use client";

import { ArrowLeft, ChevronRight, Loader2, Save, Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth";
import { useApproverCandidates } from "@/features/orgchart";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  useCreateRequest,
  useRequest,
  useRequestGroups,
} from "../hooks/useRequests";

import { DynamicForm } from "./DynamicForm";

type Step = "pick-group" | "fill-form";

interface RequestCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, skip step 1 and prefill form from the source request. */
  cloneFromId?: ID;
}

export function RequestCreateDialog({
  open,
  onClose,
  cloneFromId,
}: RequestCreateDialogProps) {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;

  const groupsQuery = useRequestGroups();
  const candidates = useApproverCandidates(employeeId);
  const create = useCreateRequest();
  const cloneSource = useRequest(cloneFromId ?? null);

  const [step, setStep] = useState<Step>(
    cloneFromId ? "fill-form" : "pick-group",
  );
  const [groupId, setGroupId] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState<string>("");
  const [approverId, setApproverId] = useState<string>("");
  const [groupSearch, setGroupSearch] = useState<string>("");
  // Track which clone source we already applied so we don't keep
  // overwriting user edits across re-renders.
  const [clonedFrom, setClonedFrom] = useState<string | null>(null);
  // Reset local form state on each fresh open. Render-time conditional
  // init — see ADR react-hooks/set-state-in-effect.
  const wantedSyncKey = open ? `${cloneFromId ?? "new"}` : "closed";
  const [syncKey, setSyncKey] = useState<string>(wantedSyncKey);
  if (open && syncKey !== wantedSyncKey) {
    setSyncKey(wantedSyncKey);
    setStep(cloneFromId ? "fill-form" : "pick-group");
    setGroupId(null);
    setData({});
    setTitle("");
    setApproverId("");
    setClonedFrom(null);
    setGroupSearch("");
  }

  const groups = (groupsQuery.data ?? []).filter((g) => g.isActive);
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const searchTerm = groupSearch.trim().toLowerCase();
  const filteredGroups = searchTerm
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(searchTerm) ||
          (g.description?.toLowerCase().includes(searchTerm) ?? false),
      )
    : groups;

  // Apply clone source once it loads. One-shot via clonedFrom guard so
  // user edits aren't trampled.
  if (
    open &&
    cloneFromId &&
    clonedFrom !== cloneFromId &&
    cloneSource.data &&
    groups.length > 0
  ) {
    const src = cloneSource.data;
    if (src.groupId) setGroupId(src.groupId);
    setData({ ...src.data });
    setTitle(src.title ?? "");
    setClonedFrom(cloneFromId);
  }

  // Default approver = suggested. One-shot. Skip for clones — force re-pick.
  if (
    open &&
    !approverId &&
    !cloneFromId &&
    candidates.data?.suggested?.employeeId
  ) {
    setApproverId(candidates.data.suggested.employeeId);
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handlePickGroup = (id: string) => {
    setGroupId(id);
    setStep("fill-form");
  };

  const handleBack = () => {
    if (cloneFromId) return;
    setGroupId(null);
    setStep("pick-group");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      toast.error("Chọn loại đơn");
      return;
    }
    if (!title.trim()) {
      toast.error("Nhập tiêu đề");
      return;
    }
    if (!approverId) {
      toast.error("Chọn người duyệt");
      return;
    }
    try {
      await create.mutateAsync({
        groupId: selectedGroup.id,
        approverId,
        title: title.trim(),
        data,
      });
      toast.success("Đã tạo đơn");
      onClose();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Tạo đơn thất bại",
      );
      console.error(err);
    }
  };

  const submitting = create.isPending;
  const cloneLoading =
    !!cloneFromId && (cloneSource.isLoading || clonedFrom !== cloneFromId);

  const dialogTitle =
    step === "pick-group"
      ? "Chọn loại đơn"
      : (selectedGroup?.name ?? "Tạo đơn");
  const description =
    step === "pick-group"
      ? "Chọn loại đơn bạn muốn tạo. Mỗi loại có biểu mẫu riêng."
      : cloneFromId
        ? "Đang nhân bản từ đơn cũ. Vui lòng kiểm tra dữ liệu và chọn lại người duyệt."
        : "Điền nội dung và chọn người duyệt.";

  if (!employeeId) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo đơn</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tài khoản chưa gắn Employee — không thể tạo đơn.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "fill-form" && !cloneFromId && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                aria-label="Quay lại"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="flex-1 text-left">{dialogTitle}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === "pick-group" && (
          <div className="flex max-h-[60vh] flex-col gap-2 py-1">
            {groups.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Tìm loại đơn theo tên hoặc mô tả..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {groupsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có loại đơn nào được kích hoạt.
                </p>
              ) : filteredGroups.length === 0 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  Không có loại đơn khớp với &quot;{groupSearch}&quot;.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {filteredGroups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => handlePickGroup(g.id)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-accent/40",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{g.name}</div>
                          {g.description && (
                            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {g.description}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === "fill-form" &&
          (cloneLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !selectedGroup ? (
            <p className="py-2 text-sm text-muted-foreground">
              Không tìm thấy loại đơn.
            </p>
          ) : (
            <form
              id="create-request-form"
              onSubmit={onSubmit}
              className="max-h-[60vh] space-y-4 overflow-y-auto py-1"
            >
              {selectedGroup.description && (
                <p className="text-xs text-muted-foreground">
                  {selectedGroup.description}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="create-title">Tiêu đề</Label>
                <Input
                  id="create-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Nghỉ phép tuần sau"
                  maxLength={200}
                  required
                  disabled={submitting}
                />
              </div>

              <DynamicForm
                schema={selectedGroup.fieldsSchema}
                value={data}
                onChange={setData}
                disabled={submitting}
              />

              <div className="grid gap-2">
                <Label htmlFor="create-approver">Người duyệt</Label>
                <Select
                  value={approverId || undefined}
                  onValueChange={setApproverId}
                  disabled={submitting}
                >
                  <SelectTrigger id="create-approver">
                    <SelectValue placeholder="Chọn người duyệt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(candidates.data?.candidates ?? []).map((c) => {
                      if (!c.employeeId) return null;
                      const isSuggested =
                        candidates.data?.suggested?.employeeId === c.employeeId;
                      return (
                        <SelectItem key={c.employeeId} value={c.employeeId}>
                          {c.name ?? c.email}
                          {isSuggested ? " (đề xuất)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </form>
          ))}

        <DialogFooter>
          {step === "pick-group" ? (
            <Button variant="outline" onClick={onClose}>
              Huỷ
            </Button>
          ) : (
            <>
              {!cloneFromId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  Quay lại
                </Button>
              )}
              {cloneFromId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Huỷ
                </Button>
              )}
              <Button
                type="submit"
                form="create-request-form"
                disabled={submitting || !selectedGroup || cloneLoading}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Tạo đơn
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
