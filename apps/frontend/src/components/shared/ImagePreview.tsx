"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PreviewInfo {
  src: string;
  alt?: string;
}

interface ImagePreviewContextValue {
  open: (info: PreviewInfo) => void;
  close: () => void;
}

const ImagePreviewContext = createContext<ImagePreviewContextValue | null>(null);

/**
 * Mount once near the root of the app (inside <Providers>). Hosts the
 * single lightbox dialog used by every caller — no per-image dialog
 * instance, no per-call Dialog plumbing.
 *
 * Three ways to surface an image:
 *  1. `useImagePreview().open(info)` — imperative, from any hook-aware code
 *  2. `<PreviewableImage src=...>` — drop-in <img> with click-to-zoom
 *  3. `<ImageLightboxScope>` — wrap a container of arbitrary HTML
 *     (e.g. `dangerouslySetInnerHTML` for richtext output). Delegates
 *     clicks on descendant <img> tags to open the preview.
 */
export function ImagePreviewProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<PreviewInfo | null>(null);
  const open = useCallback((info: PreviewInfo) => setCurrent(info), []);
  const close = useCallback(() => setCurrent(null), []);

  return (
    <ImagePreviewContext.Provider value={{ open, close }}>
      {children}
      <Dialog open={current !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent
          className="!max-w-[min(95vw,1200px)] gap-0 border-0 bg-background/95 p-2 backdrop-blur"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {current?.alt ?? "Xem ảnh"}
          </DialogTitle>
          {current && (
            <img
              src={current.src}
              alt={current.alt ?? ""}
              className="mx-auto block max-h-[85vh] w-auto rounded object-contain"
              draggable={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </ImagePreviewContext.Provider>
  );
}

export function useImagePreview() {
  const ctx = useContext(ImagePreviewContext);
  if (!ctx) {
    throw new Error("useImagePreview must be used within <ImagePreviewProvider>");
  }
  return ctx;
}

/**
 * Wrap any container that renders untrusted HTML (e.g. Tiptap output
 * via dangerouslySetInnerHTML). Click events on descendant <img> tags
 * open the lightbox; clicks on <img> inside an <a> are left alone so
 * external image links still work.
 *
 * Visual: descendant <img> automatically gets `cursor-zoom-in` via a
 * scoped Tailwind selector — no per-element class needed.
 */
export function ImageLightboxScope({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useImagePreview();
  return (
    <div
      className={cn("[&_img]:cursor-zoom-in", className)}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (!target || target.tagName !== "IMG") return;
        const img = target as HTMLImageElement;
        if (img.closest("a")) return; // wrapped image links — let the link win
        e.preventDefault();
        e.stopPropagation();
        open({ src: img.currentSrc || img.src, alt: img.alt });
      }}
    >
      {children}
    </div>
  );
}

/**
 * Drop-in <img> replacement: click to zoom. Use when you control the
 * markup directly (avatars, attachment thumbnails, etc.).
 */
export function PreviewableImage({
  src,
  alt,
  className,
  onClick,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { open } = useImagePreview();
  if (!src) return null;
  return (
    <img
      {...rest}
      src={src}
      alt={alt ?? ""}
      draggable={false}
      className={cn("cursor-zoom-in", className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        open({ src: String(src), alt });
      }}
    />
  );
}
