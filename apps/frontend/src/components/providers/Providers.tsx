"use client";

import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ImagePreviewProvider } from "@/components/shared/ImagePreview";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <ImagePreviewProvider>
            {children}
            <Toaster richColors closeButton />
          </ImagePreviewProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
