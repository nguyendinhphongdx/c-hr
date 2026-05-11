"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { WorkloadAssigneeRow } from "../../types/report";

interface WorkloadByAssigneeProps {
  rows: WorkloadAssigneeRow[];
}

function total(r: WorkloadAssigneeRow): number {
  return r.counts.todo + r.counts.inProgress + r.counts.review + r.counts.done;
}

function initials(name: string | null, userId: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
  }
  return userId ? userId.slice(0, 2).toUpperCase() : "?";
}

export function WorkloadByAssignee({ rows }: WorkloadByAssigneeProps) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="text-sm font-medium">Khối lượng theo người nhận</div>
        <div className="text-xs text-muted-foreground">
          Số task theo trạng thái của từng người
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Dự án này chưa có task nào.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người nhận</TableHead>
                <TableHead className="text-right">Cần làm</TableHead>
                <TableHead className="text-right">Đang làm</TableHead>
                <TableHead className="text-right">Review</TableHead>
                <TableHead className="text-right">Xong</TableHead>
                <TableHead className="text-right">Tổng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const t = total(r);
                return (
                  <TableRow key={r.userId ?? "__unassigned__"}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                          {r.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.avatar}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            initials(r.name, r.userId)
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm",
                            !r.userId && "italic text-muted-foreground",
                          )}
                        >
                          {r.userId ? r.name ?? "(Không tên)" : "Chưa giao"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.counts.todo}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.counts.inProgress}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.counts.review}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.counts.done}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {t}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
