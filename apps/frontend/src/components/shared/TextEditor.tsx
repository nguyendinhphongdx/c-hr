"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface TextEditorProps {
  /** Receives sanitized-on-BE-side HTML and the isInternal flag. */
  onSubmit: (bodyHtml: string, isInternal: boolean) => Promise<void>;
  placeholder?: string;
  /** Show "Nội bộ" checkbox before send. Default false (no toggle). */
  isInternalToggle?: boolean;
  /** Initial HTML — used when editing existing content. */
  initialHtml?: string;
  submitLabel?: string;
  /** Called when user clicks Cancel (rendered only if provided). */
  onCancel?: () => void;
}

export function TextEditor({
  onSubmit,
  placeholder = "Viết nội dung...",
  isInternalToggle = false,
  initialHtml = "",
  submitLabel = "Gửi",
  onCancel,
}: TextEditorProps) {
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Tiptap v3 `useEditor` doesn't re-render on transactions by default,
  // so `editor.isEmpty` read at render time goes stale. Track it via
  // onUpdate so the submit button reflects the current document state.
  const [isEmpty, setIsEmpty] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiClient.post<{ url: string }>(
        "/uploads/inline-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      editor?.chain().focus().setImage({ src: res.data.url }).run();
    } catch (err) {
      toast.error("Không tải được ảnh", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-md border max-w-full" },
      }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    onCreate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    onUpdate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-24 px-3 py-2 focus:outline-none",
        "data-placeholder": placeholder,
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((i) => i.type.startsWith("image/"));
        if (!imageItem) return false;
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return true;
        void uploadAndInsertImage(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const dt = (event as DragEvent).dataTransfer;
        const files = Array.from(dt?.files ?? []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;
        event.preventDefault();
        void uploadAndInsertImage(imageFile);
        return true;
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
      setIsEmpty(true);
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

  const onPickImage = () => fileInputRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAndInsertImage(file);
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
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={onPickImage}
          disabled={uploadingImage}
          aria-label="Chèn ảnh"
        >
          {uploadingImage ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ImagePlus />
          )}
        </Toggle>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
        />
      </div>

      <EditorContent
        editor={editor}
        className={cn("max-h-72 overflow-y-auto text-sm")}
      />

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
          {uploadingImage ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Đang tải ảnh...
            </span>
          ) : null}
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
            disabled={submitting || isEmpty}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
