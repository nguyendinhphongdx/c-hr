"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface CommentEditorProps {
  /** Receives sanitized-on-BE-side HTML and the isInternal flag. */
  onSubmit: (bodyHtml: string, isInternal: boolean) => Promise<void>;
  placeholder?: string;
  /** Show "Nội bộ" checkbox before send. Default false (no toggle). */
  isInternalToggle?: boolean;
  /** Initial HTML — used when editing an existing comment. */
  initialHtml?: string;
  submitLabel?: string;
  /** Called when user clicks Cancel (rendered only if provided). */
  onCancel?: () => void;
}

export function CommentEditor({
  onSubmit,
  placeholder = "Viết bình luận...",
  isInternalToggle = false,
  initialHtml = "",
  submitLabel = "Gửi",
  onCancel,
}: CommentEditorProps) {
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-24 px-3 py-2 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
  });

  if (!editor) return null;

  const handleSubmit = async () => {
    const html = editor.getHTML();
    if (editor.isEmpty) return;
    setSubmitting(true);
    try {
      await onSubmit(html, isInternal);
      editor.commands.clearContent();
      setIsInternal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const promptForLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Đậm"
        >
          <Bold />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Nghiêng"
        >
          <Italic />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Gạch chân"
        >
          <UnderlineIcon />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Danh sách"
        >
          <List />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          aria-label="Danh sách số"
        >
          <ListOrdered />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label="Code"
        >
          <Code />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
          aria-label="Trích dẫn"
        >
          <Quote />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("link")}
          onPressedChange={promptForLink}
          aria-label="Liên kết"
        >
          <LinkIcon />
        </Toggle>
      </div>

      <EditorContent editor={editor} className={cn("text-sm")} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
        {isInternalToggle ? (
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={isInternal}
              onCheckedChange={(v) => setIsInternal(v === true)}
            />
            Nội bộ
          </Label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={submitting}
            >
              Huỷ
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || editor.isEmpty}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
