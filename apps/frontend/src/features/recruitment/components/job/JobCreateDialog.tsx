"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

import { useCreateJob } from "../../hooks/useJobs";

const schema = z.object({
  title: z.string().min(1, "Bắt buộc").max(255),
  description: z.string().min(1, "Bắt buộc"),
  requirements: z.string().min(1, "Bắt buộc"),
  benefits: z.string().optional(),
  jobType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE"]),
  workMode: z.enum(["ONSITE", "REMOTE", "HYBRID"]),
  city: z.string().min(1, "Bắt buộc"),
  headcount: z.string().min(1, "Bắt buộc"),
  requiredSkills: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

interface JobCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (slug: string) => void;
}

export function JobCreateDialog({
  open,
  onClose,
  onCreated,
}: JobCreateDialogProps) {
  const create = useCreateJob();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      requirements: "",
      benefits: "",
      jobType: "FULL_TIME",
      workMode: "HYBRID",
      city: "Hồ Chí Minh",
      headcount: "1",
      requiredSkills: "",
      salaryMin: "",
      salaryMax: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const skills = (values.requiredSkills ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const headcount = Number(values.headcount) || 1;
    const created = await create.mutateAsync({
      title: values.title,
      description: values.description,
      requirements: values.requirements,
      benefits: values.benefits || undefined,
      jobType: values.jobType,
      workMode: values.workMode,
      workAddresses: [{ city: values.city }],
      headcount,
      requiredSkills: skills,
      salaryMin: parseOptionalNumber(values.salaryMin),
      salaryMax: parseOptionalNumber(values.salaryMax),
    });
    onCreated?.(created.slug);
    onClose();
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Tạo job mới</DialogTitle>
          <DialogDescription>
            Job mặc định tạo ở trạng thái Bản nháp. Đăng tin / push job
            board ở bước sau.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Senior Backend Engineer"
                        {...field}
                      />
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
                    <FormLabel>Mô tả công việc</FormLabel>
                    <FormControl>
                      <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yêu cầu</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="benefits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phúc lợi</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="jobType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại hình</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full-time</SelectItem>
                          <SelectItem value="PART_TIME">Part-time</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="INTERN">Intern</SelectItem>
                          <SelectItem value="FREELANCE">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hình thức</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ONSITE">Onsite</SelectItem>
                          <SelectItem value="REMOTE">Remote</SelectItem>
                          <SelectItem value="HYBRID">Hybrid</SelectItem>
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
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thành phố</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="headcount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số lượng</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="requiredSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kỹ năng (cách nhau bởi dấu phẩy)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Node.js, PostgreSQL, Redis"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="salaryMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lương tối thiểu (VND)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="20000000"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salaryMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lương tối đa (VND)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="40000000"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Tạo job
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
