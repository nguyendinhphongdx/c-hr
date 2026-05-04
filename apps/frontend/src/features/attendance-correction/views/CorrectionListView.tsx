"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAppAdmin } from "@/features/auth";
import { LeaveStatusBadge } from "@/features/leave";

import { useCorrections } from "../hooks/useCorrections";
import type { CorrectionListScope } from "../types";

export function CorrectionListView() {
  const isHrmAdmin = useIsAppAdmin("HRM");
  const [scope, setScope] = useState<CorrectionListScope>("mine");

  const { data, isLoading } = useCorrections(
    scope === "all" ? {} : { scope },
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Đơn quên chấm công</CardTitle>
            <CardDescription>
              Khi máy chấm thiếu hoặc bạn quên chấm. Đơn duyệt sẽ tự cập
              nhật log trên timesheet.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/attendance-corrections/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo đơn
            </Link>
          </Button>
        </div>
        <Tabs
          value={scope}
          onValueChange={(v) => setScope(v as CorrectionListScope)}
          className="mt-4"
        >
          <TabsList>
            <TabsTrigger value="mine">Của tôi</TabsTrigger>
            <TabsTrigger value="incoming">Cần duyệt</TabsTrigger>
            {isHrmAdmin && <TabsTrigger value="all">Tất cả Org</TabsTrigger>}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người gửi</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Giờ vào</TableHead>
              <TableHead>Giờ ra</TableHead>
              <TableHead>Người duyệt</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Không có đơn nào.
                </TableCell>
              </TableRow>
            ) : (
              data.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/attendance-corrections/${r.id}`;
                  }}
                >
                  <TableCell>
                    {r.requester.user?.name ?? r.requester.user?.email ?? r.requester.code}
                  </TableCell>
                  <TableCell>{format(new Date(r.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    {r.requestedCheckInAt
                      ? format(new Date(r.requestedCheckInAt), "HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.requestedCheckOutAt
                      ? format(new Date(r.requestedCheckOutAt), "HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.approver?.user?.name ?? r.approver?.user?.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <LeaveStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
