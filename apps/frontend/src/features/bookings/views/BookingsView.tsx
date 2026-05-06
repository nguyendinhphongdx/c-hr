"use client";

import {
  Building2,
  CalendarDays,
  Car,
  Construction,
  Laptop,
  Plus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RESOURCE_KINDS = [
  { icon: Building2, label: "Phòng họp", count: 0 },
  { icon: Laptop, label: "Thiết bị", count: 0 },
  { icon: Car, label: "Xe / di chuyển", count: 0 },
];

export function BookingsView() {
  return (
    <PageContainer>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đặt lịch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Đặt phòng họp, thiết bị, xe — xem lịch của tôi và theo dõi lịch
            của đồng nghiệp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Construction className="h-3 w-3" />
            Sắp ra mắt
          </Badge>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Đặt mới
          </Button>
        </div>
      </header>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Lịch
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Tài nguyên
          </TabsTrigger>
          <TabsTrigger value="followed" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            Đang theo dõi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch của tôi</CardTitle>
              <CardDescription>
                Tuần / tháng view sẽ hiển thị các lịch đặt phòng, thiết bị, xe
                bạn đã đặt — kèm các lịch của người bạn đang theo dõi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>Chưa có lịch nào</EmptyTitle>
                  <EmptyDescription>
                    Tính năng đang được xây dựng. Sắp tới: tab tuần / tháng,
                    màu theo loại tài nguyên, kéo-thả tạo lịch nhanh.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tài nguyên</CardTitle>
              <CardDescription>
                Thêm phòng họp, thiết bị (laptop, máy chiếu...), xe — gán
                khả dụng theo lịch và cho phép nhân viên đặt.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {RESOURCE_KINDS.map((kind) => {
                const Icon = kind.icon;
                return (
                  <div
                    key={kind.label}
                    className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{kind.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {kind.count} mục
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followed" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đang theo dõi</CardTitle>
              <CardDescription>
                Theo dõi đồng nghiệp để xem lịch của họ trên tab Lịch.
                Hữu ích khi cần biết ai bận / rảnh trước khi đặt cuộc họp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>Chưa theo dõi ai</EmptyTitle>
                  <EmptyDescription>
                    Sắp có ô tìm kiếm nhân viên để gắn vào danh sách theo dõi.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
