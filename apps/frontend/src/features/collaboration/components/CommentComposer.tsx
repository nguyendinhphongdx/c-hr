"use client";

import { toast } from "sonner";

import { TextEditor } from "@/components/shared/TextEditor";

import { useCreateComment } from "../hooks/useObjectComments";

interface CommentComposerProps {
  /** Encoded `objectType:objectId` reference the comment is attached to. */
  objectRef: string;
  /** Show "Nội bộ" checkbox before send. Default false (no toggle). */
  isInternalToggle?: boolean;
  placeholder?: string;
  /** Called after a successful create — useful for invalidating caches the
   *  underlying mutation hook doesn't know about (e.g. parent detail queries
   *  that show comment counts or watchers). */
  onCreated?: () => void;
}

/**
 * Thin wrapper around `<TextEditor>` that wires the comment-create mutation.
 * Keeps domain knowledge (objectRef, mutation hook, success/error toast) out
 * of the generic editor.
 */
export function CommentComposer({
  objectRef,
  isInternalToggle = false,
  placeholder = "Viết bình luận…",
  onCreated,
}: CommentComposerProps) {
  const createComment = useCreateComment(objectRef);

  return (
    <TextEditor
      placeholder={placeholder}
      isInternalToggle={isInternalToggle}
      onSubmit={async (bodyHtml, isInternal) => {
        try {
          await createComment.mutateAsync({ bodyHtml, isInternal });
          onCreated?.();
          toast.success("Đã gửi bình luận");
        } catch (err) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })
              ?.response?.data?.error?.message ?? "Không gửi được bình luận";
          toast.error(msg);
          throw err;
        }
      }}
    />
  );
}
