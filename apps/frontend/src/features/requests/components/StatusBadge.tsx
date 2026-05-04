import { Badge } from "@/components/ui/badge";

import type { RequestStatus } from "../types";

const VARIANT: Record<RequestStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Chờ duyệt",
    className: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  },
  APPROVED: {
    label: "Đã duyệt",
    className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  },
  REJECTED: {
    label: "Từ chối",
    className: "bg-rose-100 text-rose-900 hover:bg-rose-100",
  },
  CANCELLED: {
    label: "Đã huỷ",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const v = VARIANT[status];
  return (
    <Badge variant="secondary" className={v.className}>
      {v.label}
    </Badge>
  );
}
