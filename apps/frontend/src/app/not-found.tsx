import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Không tìm thấy trang</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã được dời đi.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Đăng nhập</Link>
        </Button>
      </div>
    </div>
  );
}
