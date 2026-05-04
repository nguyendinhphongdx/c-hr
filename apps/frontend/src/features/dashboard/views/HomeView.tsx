"use client";

import {
  ArrowRight,
  BookOpen,
  Settings,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { GithubIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import { SITE } from "@/lib/seo";

type IconComponent =
  | LucideIcon
  | ((props: { className?: string }) => React.JSX.Element);

interface QuickAction {
  href: string;
  icon: IconComponent;
  label: string;
  description: string;
  external?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/settings/profile",
    icon: Settings,
    label: "Complete your profile",
    description: "Add a name and avatar so your team recognises you.",
  },
  {
    href: "/settings/security",
    icon: Sparkles,
    label: "Secure your account",
    description: "Set a strong password and review session devices.",
  },
];

const RESOURCES: QuickAction[] = [
  {
    href: SITE.github,
    icon: GithubIcon,
    label: "Browse the source",
    description: "All conventions live in CLAUDE.md and docs/.",
    external: true,
  },
  {
    href: "/docs",
    icon: BookOpen,
    label: "Read the docs",
    description: "Architecture, recipes, and reference material.",
  },
  {
    href: SITE.github,
    icon: Terminal,
    label: "Run the CLI",
    description: "Use `pnpm dev` for hot reload, `pnpm check` for lint+typecheck.",
    external: true,
  },
];

export function HomeView() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-10">
      {/* Hero card */}
      <div className="animate-fade-up rounded-2xl border border-border bg-linear-to-br from-primary/5 via-background to-background p-8">
        <Badge variant="secondary" className="mb-4">
          Welcome
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Welcome back{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          You&apos;re running on the {SITE.name}. Replace this view with your
          actual landing screen — the quick actions below are placeholders.
        </p>
      </div>

      {/* Stats row */}
      <div
        className="animate-fade-up grid gap-4 md:grid-cols-3"
        style={{ animationDelay: "100ms" }}
      >
        <StatCard label="Today" value="0" hint="Items created in the last 24h" />
        <StatCard label="This week" value="0" hint="Activity since Monday" />
        <StatCard label="All time" value="0" hint="Total items in workspace" />
      </div>

      {/* Quick actions */}
      <div
        className="animate-fade-up space-y-4"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-lg font-semibold tracking-tight">Quick start</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <ActionCard key={action.href} {...action} />
          ))}
        </div>
      </div>

      {/* Resources */}
      <div
        className="animate-fade-up space-y-4"
        style={{ animationDelay: "300ms" }}
      >
        <h2 className="text-lg font-semibold tracking-tight">Resources</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {RESOURCES.map((resource) => (
            <ActionCard key={resource.label} {...resource} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function ActionCard({ href, icon: Icon, label, description, external }: QuickAction) {
  const content = (
    <Card className="group h-full transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="flex items-center justify-between text-base">
          {label}
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
