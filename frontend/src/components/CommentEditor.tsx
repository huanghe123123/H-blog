import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";

interface CommentEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const EMOJI_LIST = [
  "😀","😂","🤣","😊","😍","🥰","😎","🤩","😏","😢","😡","👍","👎","🎉","🔥",
  "❤️","💔","✨","⭐","💯","🙏","💪","👏","🤝","🤔","🙄","😅","🫡","💀","🤖",
];

export function CommentEditor({ value, onChange, placeholder, autoFocus }: CommentEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [, forceUpdate] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const extensions = [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
    }),
    LinkExtension.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: placeholder ?? "写下你的评论..." }),
  ];

  const editor = useEditor({
    extensions,
    content: value ?? "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const cleaned = html === "<p></p>" ? "" : html;
      onChangeRef.current?.(cleaned);
    },
    onTransaction: () => {
      forceUpdate((n) => n + 1);
    },
  });

  // Sync external value changes (e.g. reset after submit)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const target = value ?? "";
    if (current !== target && !(current === "<p></p>" && target === "")) {
      editor.commands.setContent(target);
    }
  }, [value, editor]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && editor) {
      const timer = setTimeout(() => editor.commands.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, editor]);

  if (!editor) return null;

  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setEmojiOpen(false);
  };

  return (
    <div className="comment-editor">
      <div className="comment-editor-toolbar">
        <button type="button" tabIndex={-1}
          className={editor.isActive("bold") ? "is-active" : ""}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          title="加粗"><strong>B</strong></button>
        <button type="button" tabIndex={-1}
          className={editor.isActive("italic") ? "is-active" : ""}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          title="斜体"><em>I</em></button>
        <button type="button" tabIndex={-1}
          className={editor.isActive("strike") ? "is-active" : ""}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          title="删除线"><s>S</s></button>
        <button type="button" tabIndex={-1}
          className={editor.isActive("code") ? "is-active" : ""}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
          title="行内代码">{"</>"}</button>
        <button type="button" tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            const url = window.prompt("链接 URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={editor.isActive("link") ? "is-active" : ""}
          title="插入链接">🔗</button>
        <span className="emoji-btn-wrap">
          <button type="button" tabIndex={-1}
            onClick={() => setEmojiOpen((v) => !v)}
            title="表情">😊</button>
          {emojiOpen && (
            <>
              <div className="emoji-overlay" onClick={() => setEmojiOpen(false)} />
              <div className="emoji-picker">
                {EMOJI_LIST.map((e) => (
                  <button key={e} type="button" tabIndex={-1}
                    onMouseDown={(ev) => { ev.preventDefault(); insertEmoji(e); }}
                    title={e}>{e}</button>
                ))}
              </div>
            </>
          )}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
