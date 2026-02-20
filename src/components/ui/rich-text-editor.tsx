"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizeBrToParagraphs(html: string): string {
  if (!html) return html;
  return html
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "</p><p>")
    .replace(/<br\s*\/?>/gi, "</p><p>");
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Begin met typen...",
  className,
  disabled = false,
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  // Force re-render on selection change to update active states
  const [, setSelectionUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#193DAB] underline hover:text-[#1F2D58] cursor-pointer",
        },
      }),
    ],
    content: normalizeBrToParagraphs(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      transformPastedHTML(html) {
        // Convert <br> tags to proper paragraph breaks so each line becomes
        // its own block node — this prevents heading toggles from affecting
        // surrounding lines that share the same paragraph block.
        return html
          .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "</p><p>")
          .replace(/<br\s*\/?>/gi, "</p><p>");
      },
      transformPastedText(text) {
        // When pasting plain text, convert newlines to paragraph-wrapped lines
        // so every line becomes its own block node.
        const lines = text.split(/\r?\n/);
        return lines.map((line) => `<p>${line || "<br>"}</p>`).join("");
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      // Trigger re-render to update toolbar active states
      setSelectionUpdate((prev) => prev + 1);
    },
  });

  // Focus input when it becomes visible
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  const [isEditingExistingLink, setIsEditingExistingLink] = useState(false);

  const openLinkInput = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes("link").href || "";
    
    if (previousUrl) {
      // Editing existing link - just show input with current URL
      setIsEditingExistingLink(true);
      setLinkUrl(previousUrl);
    } else {
      // New link - apply placeholder immediately so text gets underlined
      setIsEditingExistingLink(false);
      editor.chain().focus().setLink({ href: "#" }).run();
      setLinkUrl("https://");
    }
    
    setShowLinkInput(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "" || linkUrl === "https://" || linkUrl === "#") {
      // Remove link if empty or placeholder
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      // Ensure URL has https:// prefix if no protocol is present
      const normalizedUrl =
        linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
          ? linkUrl
          : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalizedUrl }).run();
    }
    
    setShowLinkInput(false);
    setLinkUrl("");
    setIsEditingExistingLink(false);
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    if (!editor) return;
    
    // If we were adding a new link (not editing), remove the placeholder
    if (!isEditingExistingLink) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    
    setShowLinkInput(false);
    setLinkUrl("");
    setIsEditingExistingLink(false);
    editor.chain().focus().run();
  }, [editor, isEditingExistingLink]);

  const handleLinkKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyLink();
    } else if (e.key === "Escape") {
      cancelLink();
    }
  }, [applyLink, cancelLink]);

  if (!editor) {
    return (
      <div className={cn(
        "h-[600px] rounded-lg border border-[#1F2D58]/20 bg-[#E8EEF2] p-4",
        className
      )}>
        <span className="text-[#1F2D58]/50">Editor laden...</span>
      </div>
    );
  }

  return (
    <div className={cn("rich-text-editor flex flex-col border border-[#1F2D58]/20 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#1F2D58] focus-within:border-transparent", className)}>
      {/* Toolbar - always visible at top */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#F8F9FA] border-b border-[#1F2D58]/20 flex-shrink-0">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          disabled={disabled}
          title="Vet"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          disabled={disabled}
          title="Cursief"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-[#1F2D58]/20 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          title="Kop 2"
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          title="Kop 3"
        >
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-[#1F2D58]/20 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          disabled={disabled}
          title="Opsomming"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          disabled={disabled}
          title="Genummerde lijst"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-[#1F2D58]/20 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          disabled={disabled}
          title="Citaat"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-[#1F2D58]/20 mx-1" />

        {!showLinkInput ? (
          <>
            <ToolbarButton
              onClick={openLinkInput}
              isActive={editor.isActive("link")}
              disabled={disabled}
              title="Link toevoegen"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </ToolbarButton>

            {editor.isActive("link") && (
              <ToolbarButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={disabled}
                title="Link verwijderen"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" />
                </svg>
              </ToolbarButton>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              placeholder="https://example.com"
              className="flex-1 min-w-[200px] h-8 px-3 text-sm border border-[#1F2D58]/20 rounded-full focus:outline-none focus:ring-1 focus:ring-[#1F2D58]"
            />
            <button
              type="button"
              onClick={applyLink}
              className="h-8 px-4 text-sm font-medium text-white bg-[#1F2D58] rounded-full hover:bg-[#1F2D58]/80"
            >
              Toepassen
            </button>
            <button
              type="button"
              onClick={cancelLink}
              className="h-8 px-3 text-sm font-medium text-[#1F2D58] hover:text-[#1F2D58]/70"
            >
              Annuleren
            </button>
          </div>
        )}
      </div>

      {/* Editor content - scrollable */}
      <EditorContent
        editor={editor}
        className={cn(
          "h-[600px] overflow-y-auto bg-[#E8EEF2] p-4 flex-1",
          "prose prose-sm max-w-none",
          "focus-within:outline-none",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[568px]",
          // Placeholder styling
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#1F2D58]/40",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-sm",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          // Heading styling with proper spacing
          "[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-[#1F2D58] [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:first:mt-0",
          "[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:text-[#1F2D58] [&_.ProseMirror_h3]:mt-5 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:first:mt-0",
          "[&_.ProseMirror_h4]:text-base [&_.ProseMirror_h4]:font-bold [&_.ProseMirror_h4]:text-[#1F2D58] [&_.ProseMirror_h4]:mt-4 [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_h4]:first:mt-0",
          "[&_.ProseMirror_h5]:text-sm [&_.ProseMirror_h5]:font-bold [&_.ProseMirror_h5]:text-[#1F2D58] [&_.ProseMirror_h5]:mt-3 [&_.ProseMirror_h5]:mb-1 [&_.ProseMirror_h5]:first:mt-0",
          // Paragraph styling
          "[&_.ProseMirror_p]:text-[#1F2D58] [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_p]:last:mb-0 [&_.ProseMirror_p]:leading-relaxed",
          // List styling
          "[&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:list-disc",
          "[&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:list-decimal",
          "[&_.ProseMirror_li]:mb-1 [&_.ProseMirror_li]:text-[#1F2D58]",
          // Blockquote styling
          "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#1F2D58]/30 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-[#1F2D58]/80",
          // Strong/em styling
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          // Link styling
          "[&_.ProseMirror_a]:text-[#193DAB] [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:cursor-pointer hover:[&_.ProseMirror_a]:text-[#1F2D58]",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded hover:bg-[#1F2D58]/10 transition-colors",
        isActive && "bg-[#1F2D58]/20 text-[#1F2D58]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
