"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";

import { GithubIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, SITE } from "@/lib/seo";
import { cn } from "@/lib/utils";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-lg"
          : "border-b border-transparent bg-background/0",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">{SITE.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            <span>Star</span>
          </a>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="ml-1 inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
