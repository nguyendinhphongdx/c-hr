"use client";

import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useCandidates, useCreateCandidate } from "../../hooks/useCandidates";
import { useCreateApplication } from "../../hooks/useApplications";

interface ApplyDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: ID;
}

export function ApplyDialog({ open, onClose, jobId }: ApplyDialogProps) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<ID | null>(
    null,
  );
  const [coverLetter, setCoverLetter] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSkills, setNewSkills] = useState("");
  const [newYoe, setNewYoe] = useState("");

  const candidatesQuery = useCandidates(
    { q: search.trim() || undefined },
    open && tab === "existing",
  );
  const createCandidate = useCreateCandidate();
  const createApplication = useCreateApplication();

  const candidates = candidatesQuery.data ?? [];
  const submitting =
    createCandidate.isPending || createApplication.isPending;

  const canSubmit = useMemo(() => {
    if (tab === "existing") return !!selectedCandidateId;
    return newFullName.trim().length > 0 && newEmail.trim().length > 0;
  }, [tab, selectedCandidateId, newFullName, newEmail]);

  const handleSubmit = async () => {
    let candidateId = selectedCandidateId;
    if (tab === "new") {
      const skills = newSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const yoe = newYoe.trim();
      const created = await createCandidate.mutateAsync({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        skills: skills.length > 0 ? skills : undefined,
        yearsOfExperience: yoe === "" ? undefined : Number(yoe),
      });
      candidateId = created.id;
    }
    if (!candidateId) return;
    await createApplication.mutateAsync({
      candidateId,
      jobId,
      coverLetter: coverLetter.trim() || undefined,
    });
    reset();
    onClose();
  };

  const reset = () => {
    setSelectedCandidateId(null);
    setCoverLetter("");
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewSkills("");
    setNewYoe("");
    setSearch("");
    setTab("existing");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Thêm ứng viên vào job</DialogTitle>
          <DialogDescription>
            Chọn ứng viên có sẵn hoặc tạo mới. Sau khi thêm, ứng viên xuất
            hiện ở cột "Tìm nguồn" của pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 gap-1 border-b bg-muted/20 px-4 py-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "existing" ? "default" : "ghost"}
            onClick={() => setTab("existing")}
          >
            Từ database
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "new" ? "default" : "ghost"}
            onClick={() => setTab("new")}
          >
            Tạo mới
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {tab === "existing" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm tên / email / phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {candidatesQuery.isLoading && (
                  <li className="py-6 text-center text-xs text-muted-foreground">
                    Đang tải…
                  </li>
                )}
                {!candidatesQuery.isLoading && candidates.length === 0 && (
                  <li className="py-6 text-center text-xs text-muted-foreground">
                    Không có ứng viên — thử tab Tạo mới.
                  </li>
                )}
                {candidates.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => setSelectedCandidateId(c.id)}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-accent/40",
                      selectedCandidateId === c.id &&
                        "border-primary bg-accent",
                    )}
                  >
                    <div className="font-medium">{c.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Họ tên</label>
                <Input
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="a@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Số điện thoại
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(tuỳ chọn)"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Kỹ năng (dùng cho điểm match) — cách nhau bởi dấu phẩy
                </label>
                <Input
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="Node.js, PostgreSQL, Redis"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Số năm kinh nghiệm
                </label>
                <Input
                  type="number"
                  min={0}
                  value={newYoe}
                  onChange={(e) => setNewYoe(e.target.value)}
                  placeholder="(tuỳ chọn)"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="text-xs text-muted-foreground">
              Thư xin việc / Ghi chú (tuỳ chọn)
            </label>
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Thêm vào pipeline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
