"use client";

import { ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SsoConfigForm } from "../components/SsoConfigForm";

export function SsoSettingsView() {
  return (
    <PageContainer>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">SSO Microsoft Entra</h1>
        <p className="text-sm text-muted-foreground">
          Cấu hình đăng nhập một lần qua tài khoản Microsoft 365 của doanh
          nghiệp. User trong cùng Org có thể bấm &quot;Đăng nhập Microsoft&quot;
          ở trang đăng nhập thay vì nhập mật khẩu.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Cấu hình Entra ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SsoConfigForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hướng dẫn nhanh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Vào{" "}
              <a
                href="https://portal.azure.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Azure portal
              </a>{" "}
              → Microsoft Entra ID → App registrations → New registration.
            </li>
            <li>
              Đặt tên (vd &quot;C-HR&quot;), chọn{" "}
              <strong>Single tenant</strong>, redirect URI <strong>Web</strong>
              {" → "}dán giá trị <em>Redirect URI</em> hiện ở form trên.
            </li>
            <li>
              Sau khi tạo, copy <strong>Application (client) ID</strong> và{" "}
              <strong>Directory (tenant) ID</strong> từ trang Overview vào form.
            </li>
            <li>
              Tab <em>Certificates &amp; secrets</em> → New client secret → copy
              giá trị secret vào form và lưu.
            </li>
            <li>
              Tab <em>API permissions</em>: thêm{" "}
              <strong>Microsoft Graph → User.Read</strong> (delegated). Grant
              admin consent nếu Org bật chế độ này.
            </li>
            <li>Test login từ trang đăng nhập với slug Org của bạn.</li>
          </ol>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
