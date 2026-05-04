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

import { LeaveStatusBadge } from "../components/LeaveStatusBadge";
import { useLeaveRequests } from "../hooks/useLeaveRequests";
import type { LeaveListScope, LeaveType } from "../types";

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: "Phép năm",
  SICK: "Ốm",
  UNPAID: "Không lương",
  MATERNITY: "Thai sản",
  OTHER: "Khác",
};

export function LeaveListView() {
  const isHrmAdmin = useIsAppAdmin("HRM");
  const [scope, setScope] = useState<LeaveListScope>("mine");

  const { data, isLoading } = useLeaveRequests(
    scope === "all" ? {} : { scope },
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Đơn xin nghỉ</CardTitle>
            <CardDescription>
              Quản lý đơn của bạn và các đơn cần bạn duyệt.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/leave/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo đơn
            </Link>
          </Button>
        </div>
        <Tabs
          value={scope}
          onValueChange={(v) => setScope(v as LeaveListScope)}
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
              <TableHead>Loại</TableHead>
              <TableHead>Từ</TableHead>
              <TableHead>Đến</TableHead>
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
                    window.location.href = `/leave/${r.id}`;
                  }}
                >
                  <TableCell>
                    {r.requester.user?.name ?? r.requester.user?.email ?? r.requester.code}
                  </TableCell>
                  <TableCell>{LEAVE_TYPE_LABEL[r.type]}</TableCell>
                  <TableCell>{format(new Date(r.startDate), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{format(new Date(r.endDate), "dd/MM/yyyy")}</TableCell>
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
