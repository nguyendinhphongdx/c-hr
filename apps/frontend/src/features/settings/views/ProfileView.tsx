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
import { useAuth, useUpdateProfile } from "@/features/auth";

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
  title: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileView() {
  const { user } = useAuth();
  const update = useUpdateProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", title: user?.title ?? "" },
  });

  // Re-sync the form when the user record loads after first paint.
  useEffect(() => {
    if (user) form.reset({ name: user.name ?? "", title: user.title ?? "" });
  }, [user, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({
        name: values.name,
        title: values.title || undefined,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Couldn't update profile", {
        description:
          err instanceof Error ? err.message : "Try again in a moment.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              How others see you across the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ada Lovelace" {...field} />
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
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Engineer" {...field} />
                  </FormControl>
                  <FormDescription>
                    Personal title — shown next to your name. HR sets the
                    formal job title separately.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email.
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                form.reset({
                  name: user?.name ?? "",
                  title: user?.title ?? "",
                })
              }
              disabled={!form.formState.isDirty || update.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={!form.formState.isDirty || update.isPending}
            >
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
