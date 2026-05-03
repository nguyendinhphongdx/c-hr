import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
