"use client";

import {
  Building2,
  CheckCircle2,
  LogOut,
  Plus,
  Search,
  Send,
  Sparkles,
  UserPlus,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  useClearOrphan,
  useOrphanProfile,
  useSearchOrgs,
  useSubmitJoinRequest,
  useSuggestedOrgs,
} from "../hooks/useOrphan";
import type { OrphanOrgSearchResult, OrphanSuggestedOrg } from "../types";

export function NoOrgView() {
  const router = useRouter();
  const me = useOrphanProfile();
  const suggested = useSuggestedOrgs(!!me.data);
  const [query, setQuery] = useState("");
  const search = useSearchOrgs(query, !!me.data);
  const submit = useSubmitJoinRequest();
  const clear = useClearOrphan();

  const [selectedOrg, setSelectedOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  if (me.isLoading) {
    return <Frame><LoaderRow /></Frame>;
  }

  if (me.error || !me.data) {
    return (
      <Frame>
        <Card className="border-rose-200 bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-base">Phiên đăng nhập hết hạn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Trang này yêu cầu phiên SSO Microsoft còn hiệu lực (30 phút).
              Vui lòng đăng nhập Microsoft lại.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Về trang đăng nhập</Link>
            </Button>
          </CardContent>
        </Card>
      </Frame>
    );
  }

  const profile = me.data;
  const initials = (profile.name || profile.email).slice(0, 2).toUpperCase();
  const domain = profile.email.split("@")[1]?.toLowerCase() ?? "";

  const onSubmit = async (org: { id: string; name: string }) => {
    setSelectedOrg(org);
    if (submit.isPending) return;
    try {
      await submit.mutateAsync({
        organizationId: org.id,
        message: message.trim() || undefined,
      });
      setSubmitted(org.name);
      toast.success(`Đã gửi yêu cầu tham gia ${org.name}`);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
          "Gửi yêu cầu thất bại — kiểm tra phiên SSO hoặc thử lại",
      );
    }
  };

  const onLogout = async () => {
    await clear.mutateAsync();
    router.push("/login");
  };

  if (submitted) {
    return (
      <Frame>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Yêu cầu đã gửi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Admin <strong>{submitted}</strong> sẽ xem xét và duyệt yêu cầu
              của bạn. Khi được duyệt, bạn login lại với Microsoft là vào được.
            </p>
            <p className="text-xs text-muted-foreground">
              Bạn có thể đóng tab này. Nếu sau 1-2 ngày chưa thấy hồi âm, liên
              hệ admin tổ chức.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(null);
                  setSelectedOrg(null);
                  setMessage("");
                }}
              >
                Gửi yêu cầu khác
              </Button>
            </div>
          </CardContent>
        </Card>
      </Frame>
    );
  }

  const hasSuggestions = (suggested.data?.length ?? 0) > 0;
  const searchHasQuery = query.trim().length >= 2;

  return (
    <Frame>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-base font-semibold">
                Chào {profile.name ?? profile.email.split("@")[0]}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {profile.email}
              </div>
            </div>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Tài khoản Microsoft của bạn chưa thuộc tổ chức nào trên C-HR. Chọn
            một tổ chức bên dưới để gửi yêu cầu tham gia, hoặc tạo tổ chức mới.
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Suggested */}
          {hasSuggestions && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Đề xuất cho @{domain}
              </h2>
              <ul className="space-y-1.5">
                {suggested.data!.map((org) => (
                  <OrgRow
                    key={org.id}
                    org={org}
                    selected={selectedOrg?.id === org.id}
                    onSelect={() => setSelectedOrg({ id: org.id, name: org.name })}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Search */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tìm tổ chức khác
            </h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tên hoặc slug tổ chức..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            {searchHasQuery && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {search.isLoading ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Đang tìm…
                  </div>
                ) : (search.data?.length ?? 0) === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Không tìm thấy &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <ul className="divide-y">
                    {search.data!.map((org) => (
                      <SearchOrgRow
                        key={org.id}
                        org={org}
                        selected={selectedOrg?.id === org.id}
                        onSelect={() =>
                          setSelectedOrg({ id: org.id, name: org.name })
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Message + submit */}
          {selectedOrg && (
            <section className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="text-sm font-medium">
                Yêu cầu tham gia{" "}
                <span className="text-primary">{selectedOrg.name}</span>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Lời nhắn cho admin (tuỳ chọn) — vd: 'Em là nhân viên mới phòng Engineering'"
                rows={2}
                maxLength={1000}
                disabled={submit.isPending}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSubmit(selectedOrg)}
                  disabled={submit.isPending}
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  Gửi yêu cầu
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedOrg(null)}
                  disabled={submit.isPending}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Huỷ
                </Button>
              </div>
            </section>
          )}

          {/* Create new Org branch */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-card px-2 text-muted-foreground">hoặc</span>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href="/register">
              <Plus className="mr-2 h-4 w-4" />
              Tạo doanh nghiệp mới
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full text-muted-foreground"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </Frame>
  );
}

function OrgRow({
  org,
  selected,
  onSelect,
}: {
  org: OrphanSuggestedOrg;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent/40",
          selected && "border-primary bg-primary/5",
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{org.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {org.memberCount} thành viên
          </div>
        </div>
        <UserPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

function SearchOrgRow({
  org,
  selected,
  onSelect,
}: {
  org: OrphanOrgSearchResult;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40",
          selected && "bg-primary/5",
        )}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{org.name}</div>
          <div className="text-[11px] text-muted-foreground">{org.slug}</div>
        </div>
        <UserPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      {children}
    </div>
  );
}

function LoaderRow() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Đang kiểm tra phiên SSO…
    </div>
  );
}
