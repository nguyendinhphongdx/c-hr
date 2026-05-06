"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FileUpload } from "@/components/shared/FileUpload";
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
import { cn } from "@/lib/utils";

import { useImportEmployees, useParseEmployeeImport } from "../hooks/useEmployees";
import { employeesService } from "../services/employeesService";
import type { EmployeeImportParseResponse, ParsedEmployeeRow } from "../types";

const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function EmployeeImportDialog({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<EmployeeImportParseResponse | null>(null);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const parseMutation = useParseEmployeeImport();
  const importMutation = useImportEmployees();

  const reset = () => {
    setFile(null);
    setProgress(0);
    setParsed(null);
    setDefaultPassword("");
    setShowPassword(false);
  };

  const handleClose = () => {
    if (parseMutation.isPending || importMutation.isPending) return;
    reset();
    onClose();
  };

  const handleSelect = async (selected: File) => {
    setFile(selected);
    setParsed(null);
    setProgress(0);
    try {
      const result = await parseMutation.mutateAsync({
        file: selected,
        onProgress: setProgress,
      });
      setParsed(result);
    } catch (err) {
      toast.error("Không đọc được file", {
        description: err instanceof Error ? err.message : undefined,
      });
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!parsed || !defaultPassword) return;
    const validRows = parsed.rows.filter((r) => r.status === "valid");
    if (validRows.length === 0) {
      toast.error("Không có dòng hợp lệ để tạo");
      return;
    }
    try {
      const result = await importMutation.mutateAsync({
        defaultPassword,
        rows: validRows.map((r) => ({
          employeeCode: r.employeeCode,
          email: r.email,
          name: r.name,
          title: r.title ?? undefined,
        })),
      });
      toast.success(`Tạo xong ${result.created}/${validRows.length} nhân sự`, {
        description: result.failed.length
          ? `${result.failed.length} dòng thất bại — kiểm tra log.`
          : undefined,
      });
      handleClose();
    } catch (err) {
      toast.error("Tạo nhân sự thất bại", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const validCount = parsed?.summary.valid ?? 0;
  const invalidCount = parsed?.summary.invalid ?? 0;
  const submitDisabled =
    !parsed ||
    validCount === 0 ||
    defaultPassword.length < 6 ||
    importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import nhân sự</DialogTitle>
          <DialogDescription>
            Tải file mẫu, điền thông tin và upload. Hệ thống đọc và hiển thị danh
            sách trước khi tạo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3">
            <div>
              <div className="text-sm font-medium">File mẫu</div>
              <div className="text-xs text-muted-foreground">
                Cột: employeeCode, email, name, title (chỗ title có thể trống).
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={employeesService.templateUrl("xlsx")} download>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> XLSX
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={employeesService.templateUrl("csv")} download>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                </a>
              </Button>
            </div>
          </div>

          <FileUpload
            accept=".csv,.xlsx,.xls"
            maxSizeBytes={MAX_BYTES}
            uploading={parseMutation.isPending}
            progress={progress}
            selectedFile={file}
            onSelect={handleSelect}
            onClear={reset}
          />

          {parsed && (
            <>
              <SummaryBanner
                total={parsed.summary.total}
                valid={validCount}
                invalid={invalidCount}
                rows={parsed.rows}
              />

              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-12 px-3 py-2">#</th>
                      <th className="px-3 py-2">Mã</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Tên</th>
                      <th className="px-3 py-2">Chức vụ</th>
                      <th className="w-32 px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((r) => (
                      <RowItem key={r.rowNumber} row={r} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="default-password">
                  Mật khẩu mặc định <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="default-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tối thiểu 6 ký tự"
                    autoComplete="new-password"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ẩn" : "Hiện"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Áp dụng cho toàn bộ {validCount} nhân sự sẽ được tạo. Người dùng
                  có thể đổi mật khẩu sau khi đăng nhập lần đầu.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled}>
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Đang tạo…
              </>
            ) : (
              `Tạo ${validCount} nhân sự`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryBanner({
  total,
  valid,
  invalid,
  rows,
}: {
  total: number;
  valid: number;
  invalid: number;
  rows: ParsedEmployeeRow[];
}) {
  const errorLines = rows
    .filter((r) => r.status === "invalid")
    .slice(0, 5)
    .map((r) => `Dòng ${r.rowNumber}: ${r.errors.join("; ")}`);
  const moreCount = invalid - errorLines.length;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        invalid > 0
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {invalid > 0 ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Đọc được {total} dòng — {valid} hợp lệ, {invalid} lỗi
      </div>
      {errorLines.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {errorLines.map((line, i) => (
            <li key={i}>• {line}</li>
          ))}
          {moreCount > 0 && (
            <li className="text-muted-foreground">… và {moreCount} dòng khác.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function RowItem({ row }: { row: ParsedEmployeeRow }) {
  const isValid = row.status === "valid";
  return (
    <tr
      className={cn(
        "border-t",
        isValid
          ? "bg-card"
          : "bg-rose-50/50 dark:bg-rose-950/20",
      )}
    >
      <td className="px-3 py-2 text-xs text-muted-foreground">{row.rowNumber}</td>
      <td className="px-3 py-2 font-mono text-xs">{row.employeeCode || "—"}</td>
      <td className="px-3 py-2">{row.email || "—"}</td>
      <td className="px-3 py-2 font-medium">{row.name || "—"}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.title || "—"}</td>
      <td className="px-3 py-2">
        {isValid ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Hợp lệ
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-400"
            title={row.errors.join("; ")}
          >
            <XCircle className="h-3 w-3" /> Lỗi
          </span>
        )}
      </td>
    </tr>
  );
}
