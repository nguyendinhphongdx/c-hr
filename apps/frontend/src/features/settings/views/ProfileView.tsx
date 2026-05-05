"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useAuth, useUpdateProfile } from "@/features/auth";

const NO_GENDER = "__none__";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(100),
  title: z.string().max(100).nullable(),
  avatar: z
    .string()
    .url("Phải là một URL hợp lệ")
    .max(500)
    .or(z.literal(""))
    .nullable(),
  dob: z.string().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", NO_GENDER]),
  phone: z.string().max(32).nullable(),
});

type FormValues = z.infer<typeof schema>;

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function buildDefaults(user: ReturnType<typeof useAuth>["user"]): FormValues {
  return {
    name: user?.name ?? "",
    title: user?.title ?? "",
    avatar: user?.avatar ?? "",
    dob: toInputDate(user?.dob),
    gender: user?.gender ?? NO_GENDER,
    phone: user?.phone ?? "",
  };
}

export function ProfileView() {
  const { user } = useAuth();
  const update = useUpdateProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(user),
  });

  useEffect(() => {
    if (user) form.reset(buildDefaults(user));
  }, [user, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({
        name: values.name,
        title: values.title || null,
        avatar: values.avatar || null,
        dob: values.dob || null,
        gender: values.gender === NO_GENDER ? null : values.gender,
        phone: values.phone || null,
      });
      toast.success("Đã cập nhật hồ sơ");
    } catch (err) {
      toast.error("Không cập nhật được hồ sơ", {
        description:
          err instanceof Error ? err.message : "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ cá nhân</CardTitle>
            <CardDescription>
              Thông tin cá nhân của bạn — tên, liên hệ, ảnh đại diện. Các trường
              cấp Org (chức danh chính thức, phòng ban, ngày vào) do HR đặt
              trong hồ sơ nhân viên.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên</FormLabel>
                  <FormControl>
                    <Input placeholder="Nguyễn Văn A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chức danh hiển thị</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: Senior Engineer"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Chức danh bạn tự đặt, hiển thị cho đồng nghiệp. HR sẽ đặt
                    chức danh chính thức trong hồ sơ HR riêng.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đường dẫn ảnh đại diện</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Dán đường dẫn ảnh. Tải ảnh trực tiếp sẽ được hỗ trợ khi có
                    module lưu trữ.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="0901234567"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giới tính</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_GENDER}>—</SelectItem>
                        <SelectItem value="MALE">Nam</SelectItem>
                        <SelectItem value="FEMALE">Nữ</SelectItem>
                        <SelectItem value="OTHER">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày sinh</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="md:max-w-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Liên hệ bộ phận hỗ trợ nếu bạn cần đổi email.
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => form.reset(buildDefaults(user))}
              disabled={!form.formState.isDirty || update.isPending}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={!form.formState.isDirty || update.isPending}
            >
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Lưu thay đổi
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
