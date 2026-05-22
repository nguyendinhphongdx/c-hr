"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";

import { useSendApplicationEmail } from "../../hooks/useApplications";
import type { Application } from "../../types";

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  application: Application | null;
}

const DEFAULT_TEMPLATES: Array<{
  label: string;
  subject: (a: Application) => string;
  body: (a: Application) => string;
}> = [
  {
    label: "Xác nhận đã nhận hồ sơ",
    subject: (a) => `Xác nhận hồ sơ ứng tuyển vị trí ${a.job.title}`,
    body: (a) => `
<p>Chào ${a.candidate.fullName},</p>
<p>Cảm ơn bạn đã quan tâm và ứng tuyển vào vị trí <strong>${a.job.title}</strong> tại công ty chúng tôi.</p>
<p>Chúng tôi đã nhận được hồ sơ của bạn và đang trong quá trình xem xét. Nếu phù hợp, bộ phận Tuyển dụng sẽ liên hệ lại trong 5–7 ngày làm việc.</p>
<p>Trân trọng,<br/>Phòng Tuyển dụng</p>
`.trim(),
  },
  {
    label: "Mời phỏng vấn",
    subject: (a) => `Mời phỏng vấn vị trí ${a.job.title}`,
    body: (a) => `
<p>Chào ${a.candidate.fullName},</p>
<p>Sau khi xem xét hồ sơ, chúng tôi rất vui được mời bạn tham gia buổi phỏng vấn cho vị trí <strong>${a.job.title}</strong>.</p>
<p>Vui lòng phản hồi email này với khung giờ bạn thuận tiện trong tuần tới để chúng tôi sắp xếp.</p>
<p>Trân trọng,<br/>Phòng Tuyển dụng</p>
`.trim(),
  },
  {
    label: "Từ chối nhẹ nhàng",
    subject: (a) => `Thư phản hồi từ Phòng Tuyển dụng — ${a.job.title}`,
    body: (a) => `
<p>Chào ${a.candidate.fullName},</p>
<p>Cảm ơn bạn đã dành thời gian ứng tuyển vào vị trí <strong>${a.job.title}</strong>.</p>
<p>Sau khi cân nhắc kỹ, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn lần này chưa phù hợp với yêu cầu của vị trí. Chúng tôi sẽ lưu hồ sơ và liên hệ lại khi có cơ hội phù hợp hơn trong tương lai.</p>
<p>Chúc bạn nhiều thành công trên hành trình sự nghiệp sắp tới.</p>
<p>Trân trọng,<br/>Phòng Tuyển dụng</p>
`.trim(),
  },
];

export function SendEmailDialog({
  open,
  onClose,
  application,
}: SendEmailDialogProps) {
  const send = useSendApplicationEmail();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open && application) {
      setSubject("");
      setBody("");
    }
  }, [open, application?.id]);

  if (!application) return null;

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  const applyTemplate = (idx: number) => {
    const t = DEFAULT_TEMPLATES[idx];
    setSubject(t.subject(application));
    setBody(t.body(application));
  };

  const handleSend = async () => {
    await send.mutateAsync({
      id: application.id,
      data: { subject: subject.trim(), bodyHtml: body },
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            Gửi email tới {application.candidate.fullName}
          </DialogTitle>
          <DialogDescription>
            Email đi từ địa chỉ hệ thống; Reply-To trỏ về email của bạn để
            ứng viên trả lời trực tiếp về hộp thư cá nhân.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap gap-1 border-b bg-muted/20 px-4 py-2">
          <span className="self-center text-[11px] text-muted-foreground">
            Mẫu nhanh:
          </span>
          {DEFAULT_TEMPLATES.map((t, idx) => (
            <Button
              key={t.label}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => applyTemplate(idx)}
              className="h-7 text-xs"
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div>
            <label className="text-xs text-muted-foreground">Người nhận</label>
            <Input
              value={application.candidate.email}
              readOnly
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Tiêu đề</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1"
              placeholder="Phản hồi từ Phòng Tuyển dụng…"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Nội dung</label>
            <div className="mt-1">
              <RichTextDescriptionField
                value={body}
                onChange={setBody}
                placeholder="Viết nội dung email…"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="button"
            disabled={!canSend || send.isPending}
            onClick={handleSend}
          >
            {send.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Gửi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
