"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Mail, Phone, Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CandidateCreateDialog } from "../components/candidate/CandidateCreateDialog";
import { useCandidates } from "../hooks/useCandidates";
import type { CandidateSource } from "../types";

const SOURCE_LABEL: Record<CandidateSource, string> = {
  MANUAL: "Nhập tay",
  REFERRAL: "Giới thiệu",
  TOPCV: "TopCV",
  ITVIEC: "ITviec",
  TALENT_VN: "Talent.vn",
  CAREER_PAGE: "Career page",
  OTHER: "Khác",
};

export function CandidateListView() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<CandidateSource | "ALL">(
    "ALL",
  );
  const [createOpen, setCreateOpen] = useState(false);

  const candidatesQuery = useCandidates({
    q: search.trim() || undefined,
    source: sourceFilter !== "ALL" ? sourceFilter : undefined,
  });

  const rows = candidatesQuery.data ?? [];

  return (
    <PageContainer variant="bleed" className="h-full p-3!">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Tuyển dụng — Ứng viên
            </h1>
            <p className="text-xs text-muted-foreground">
              Database ứng viên cross-job — dedup theo email mỗi tổ chức.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Thêm ứng viên
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên / email / phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-72 pl-8 text-sm"
            />
          </div>
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as CandidateSource | "ALL")}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả nguồn</SelectItem>
              {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {candidatesQuery.isLoading
              ? "Đang tải…"
              : `${rows.length} ứng viên`}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {candidatesQuery.error && (
            <p className="text-sm text-destructive">
              Lỗi: {(candidatesQuery.error as Error).message}
            </p>
          )}

          {!candidatesQuery.isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Chưa có ứng viên</p>
              <p className="text-xs text-muted-foreground">
                Thêm ứng viên đầu tiên hoặc đợi candidate apply qua job board.
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Liên hệ</TableHead>
                    <TableHead className="w-40">Nguồn</TableHead>
                    <TableHead className="w-28 text-right">Đơn</TableHead>
                    <TableHead className="w-32">Thêm lúc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.fullName}</div>
                        {c.headline && (
                          <div className="text-[11px] text-muted-foreground">
                            {c.headline}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </div>
                        {c.phone && (
                          <div className="inline-flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {SOURCE_LABEL[c.source]}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {c._count.applications}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(c.createdAt), "dd/MM/yyyy", {
                          locale: vi,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <CandidateCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </PageContainer>
  );
}
