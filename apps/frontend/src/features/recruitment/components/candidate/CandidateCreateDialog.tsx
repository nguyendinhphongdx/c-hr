"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateCandidate } from "../../hooks/useCandidates";
import type { CandidateSource } from "../../types";

const SOURCE_OPTIONS: Array<{ value: CandidateSource; label: string }> = [
  { value: "MANUAL", label: "Nhập tay" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "TOPCV", label: "TopCV" },
  { value: "ITVIEC", label: "ITviec" },
  { value: "TALENT_VN", label: "Talent.vn" },
  { value: "CAREER_PAGE", label: "Trang tuyển dụng" },
  { value: "OTHER", label: "Khác" },
];

interface CandidateCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CandidateCreateDialog({
  open,
  onClose,
}: CandidateCreateDialogProps) {
  const create = useCreateCandidate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState<CandidateSource>("MANUAL");

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0;

  const reset = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setHeadline("");
    setLocation("");
    setLinkedinUrl("");
    setSource("MANUAL");
  };

  const handleSubmit = async () => {
    await create.mutateAsync({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      headline: headline.trim() || undefined,
      location: location.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      source,
    });
    reset();
    onClose();
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm ứng viên</DialogTitle>
          <DialogDescription>
            Email duy nhất trong tổ chức — sẽ dùng để dedup nếu ứng viên
            apply nhiều job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground">Họ tên</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="a@example.com"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Số điện thoại
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nguồn</label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as CandidateSource)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Headline (1 dòng)
            </label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Senior Backend Engineer at FPT"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Địa điểm</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">LinkedIn</label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || create.isPending}
            onClick={handleSubmit}
          >
            {create.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Thêm ứng viên
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
