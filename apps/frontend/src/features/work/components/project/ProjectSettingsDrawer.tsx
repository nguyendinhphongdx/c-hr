"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  useArchiveProject,
  useDeleteProject,
  useUnarchiveProject,
  useUpdateProject,
} from "../../hooks/useProjects";
import type { Project } from "../../types";

import { ProjectMemberList } from "./ProjectMemberList";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(127),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "PAUSED", "DONE"]),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectSettingsDrawerProps {
  project: Project;
  open: boolean;
  onClose: () => void;
}

export function ProjectSettingsDrawer({
  project,
  open,
  onClose,
}: ProjectSettingsDrawerProps) {
  const router = useRouter();
  const updateMut = useUpdateProject();
  const archiveMut = useArchiveProject();
  const unarchiveMut = useUnarchiveProject();
  const deleteMut = useDeleteProject();

  const canEdit = project.view?.canEdit ?? false;
  const canDelete = project.view?.canDelete ?? false;
  const canManageMembers = project.view?.canManageMembers ?? false;
  const canArchive = project.view?.canArchive ?? false;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(project),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(project));
  }, [open, project, form]);

  const [activeTab, setActiveTab] = useState<"info" | "members" | "danger">(
    "info",
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMut.mutateAsync({
        id: project.id,
        data: {
          name: values.name,
          description: values.description ?? null,
          status: values.status,
          visibility: values.visibility,
          startDate: values.startDate || null,
          dueDate: values.dueDate || null,
        },
      });
      toast.success("Đã lưu thay đổi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được");
    }
  });

  const onArchive = async () => {
    try {
      if (project.archivedAt) {
        await unarchiveMut.mutateAsync(project.id);
        toast.success("Đã bỏ lưu trữ");
      } else {
        await archiveMut.mutateAsync(project.id);
        toast.success("Đã lưu trữ");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        `Xoá dự án "${project.name}"? Các tác vụ trong dự án sẽ không truy cập được.`,
      )
    ) {
      return;
    }
    try {
      await deleteMut.mutateAsync(project.id);
      toast.success("Đã xoá dự án");
      onClose();
      router.push("/projects");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xoá được");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Cài đặt dự án</SheetTitle>
          <SheetDescription>{project.name}</SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="mt-4 flex-1 overflow-hidden"
        >
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="members">Thành viên</TabsTrigger>
            <TabsTrigger value="danger">Khác</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 overflow-y-auto p-1">
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trạng thái</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!canEdit}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLANNING">Lên kế hoạch</SelectItem>
                            <SelectItem value="ACTIVE">Đang chạy</SelectItem>
                            <SelectItem value="PAUSED">Tạm dừng</SelectItem>
                            <SelectItem value="DONE">Hoàn thành</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quyền xem</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!canEdit}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                            <SelectItem value="PUBLIC">Công khai</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bắt đầu</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={!canEdit} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hạn</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={!canEdit} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {canEdit && (
                  <Button type="submit" disabled={updateMut.isPending}>
                    {updateMut.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Lưu thay đổi
                  </Button>
                )}
              </form>
            </Form>
          </TabsContent>

          <TabsContent
            value="members"
            className="space-y-3 overflow-y-auto p-1"
          >
            <ProjectMemberList
              projectId={project.id}
              canManage={canManageMembers}
            />
          </TabsContent>

          <TabsContent value="danger" className="space-y-3 p-1">
            {canArchive && (
              <Button
                variant="outline"
                onClick={onArchive}
                disabled={archiveMut.isPending || unarchiveMut.isPending}
                className="w-full justify-start"
              >
                {project.archivedAt ? (
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                {project.archivedAt ? "Bỏ lưu trữ" : "Lưu trữ dự án"}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={deleteMut.isPending}
                className="w-full justify-start"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá dự án
              </Button>
            )}
            {!canArchive && !canDelete && (
              <p className="text-sm text-muted-foreground">
                Bạn không có quyền lưu trữ hoặc xoá dự án này.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function toFormValues(p: Project): FormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    status: p.status,
    visibility: p.visibility,
    startDate: p.startDate ? p.startDate.slice(0, 10) : "",
    dueDate: p.dueDate ? p.dueDate.slice(0, 10) : "",
  };
}
