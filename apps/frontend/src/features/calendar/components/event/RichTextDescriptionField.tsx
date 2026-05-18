"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
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

import { Toggle } from "@/components/ui/toggle";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface RichTextDescriptionFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Tiptap-backed richtext editor for description fields. Emits HTML on
 * every change; consumer holds the value in form state.
 *
 * Image paste / drop / picker uploads to `/uploads/inline-image` and
 * inserts the returned URL — mirrors the shared TextEditor behaviour.
 */
export function RichTextDescriptionField({
  value,
  onChange,
  placeholder = "Mô tả cuộc họp...",
  disabled,
}: RichTextDescriptionFieldProps) {
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
      Underline,
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
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-20 px-3 py-2 focus:outline-none",
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
    <div
      className={cn(
        "rounded-md border bg-background",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Đậm"
          disabled={disabled}
        >
          <Bold />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Nghiêng"
          disabled={disabled}
        >
          <Italic />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Gạch chân"
          disabled={disabled}
        >
          <UnderlineIcon />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          aria-label="Danh sách"
          disabled={disabled}
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
          disabled={disabled}
        >
          <ListOrdered />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label="Code"
          disabled={disabled}
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
          disabled={disabled}
        >
          <Quote />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("link")}
          onPressedChange={promptForLink}
          aria-label="Liên kết"
          disabled={disabled}
        >
          <LinkIcon />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={onPickImage}
          disabled={disabled || uploadingImage}
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

      <EditorContent editor={editor} className="text-sm" />
    </div>
  );
}
