"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth";
import { useApproverCandidates } from "@/features/orgchart";

import { DynamicForm } from "../components/DynamicForm";
import { useCreateRequest, useRequestGroups } from "../hooks/useRequests";

/**
 * Two-step "create request" flow:
 *  1. Pick group from dropdown — fieldsSchema renders the form below
 *  2. Fill DynamicForm + approver dropdown
 *
 * Pre-fills `group=<code>&date=<YYYY-MM-DD>` from query so the timesheet
 * cell can deep-link a checkin/checkout correction with the right date.
 */
export function RequestCreateView() {
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;

  const groupsQuery = useRequestGroups();
  const candidates = useApproverCandidates(employeeId);
  const create = useCreateRequest();

  const initialGroupCode = search.get("group");
  const initialDate = search.get("date");

  const [groupId, setGroupId] = useState<string>("");
  const [data, setData] = useState<Record<string, unknown>>(
    initialDate ? { date: initialDate } : {},
  );
  const [approverId, setApproverId] = useState("");

  const groups = groupsQuery.data ?? [];
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;

  // Pick initial group when query has ?group=<code> and groups have loaded.
  // Render-time conditional state init (no useEffect — cf. ADR notes /
  // react-hooks/set-state-in-effect).
  if (!groupId && initialGroupCode && groups.length > 0) {
    const matched = groups.find((g) => g.code === initialGroupCode);
    if (matched) setGroupId(matched.id);
  }
  // Default approver = suggested. One-shot.
  if (!approverId && candidates.data?.suggested?.employeeId) {
    setApproverId(candidates.data.suggested.employeeId);
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Tài khoản chưa gắn Employee — không thể tạo đơn.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      toast.error("Chọn loại đơn");
      return;
    }
    if (!approverId) {
      toast.error("Chọn người duyệt");
      return;
    }

    try {
      const created = await create.mutateAsync({
        groupId: selectedGroup.id,
        approverId,
        data,
      });
      toast.success("Đã gửi đơn — chờ duyệt");
      router.push(`/requests?selected=${created.id}`);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Tạo đơn thất bại",
      );
      console.error(err);
    }
  };

  const submitting = create.isPending;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Tạo đơn</CardTitle>
        <CardDescription>
          Chọn loại đơn — biểu mẫu sẽ hiện ra với các trường tương ứng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="group">Loại đơn</Label>
            <Select value={groupId || undefined} onValueChange={setGroupId}>
              <SelectTrigger id="group">
                <SelectValue placeholder="Chọn loại đơn..." />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroup?.description && (
              <p className="text-xs text-muted-foreground">
                {selectedGroup.description}
              </p>
            )}
          </div>

          {selectedGroup && (
            <>
              <DynamicForm
                schema={selectedGroup.fieldsSchema}
                value={data}
                onChange={setData}
                disabled={submitting}
              />

              <div className="grid gap-2">
                <Label htmlFor="approver">Người duyệt</Label>
                <Select
                  value={approverId || undefined}
                  onValueChange={setApproverId}
                  disabled={submitting}
                >
                  <SelectTrigger id="approver">
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
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting || !selectedGroup}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Gửi đơn
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
