import MDEditor from "@uiw/react-md-editor";
import { useCallback, useRef, useState } from "react";
import remarkBreaks from "remark-breaks";
import { ACFUN_IDS, acfunImageUrl } from "../utils/acfun";

const EMOJI_LIST = [
  "😀","😂","🤣","😊","😍","🥰","😎","🤩","😏","😢","😡","👍","👎","🎉","🔥",
  "❤️","💔","✨","⭐","💯","🙏","💪","👏","🤝","🤔","🙄","😅","🫡","💀","🤖",
];

interface BioEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function BioEditor({ value, onChange, height = 200 }: BioEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [acfunOpen, setAcfunOpen] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  const openPicker = useCallback((type: "emoji" | "acfun", btnEl: HTMLElement) => {
    const rect = btnEl.getBoundingClientRect();
    setPickerStyle({ top: rect.bottom + 4, left: rect.left });
    if (type === "emoji") { setEmojiOpen(true); setAcfunOpen(false); }
    else { setAcfunOpen(true); setEmojiOpen(false); }
  }, []);

  const insertText = (text: string) => {
    const ta = containerRef.current?.querySelector("textarea") as HTMLTextAreaElement | null;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + text.length, start + text.length);
      });
    } else {
      onChange(value + text);
    }
    setEmojiOpen(false);
    setAcfunOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        <span className="emoji-btn-wrap">
          <button type="button" tabIndex={-1}
            className="comment-editor-toolbar-btn"
            onClick={(e) => emojiOpen ? setEmojiOpen(false) : openPicker("emoji", e.currentTarget)}
            title="表情">😊</button>
          {emojiOpen && (
            <>
              <div className="emoji-overlay" onClick={() => setEmojiOpen(false)} />
              <div className="emoji-picker" style={pickerStyle}>
                {EMOJI_LIST.map((e) => (
                  <button key={e} type="button" tabIndex={-1}
                    onMouseDown={(ev) => { ev.preventDefault(); insertText(e); }}
                    title={e}>{e}</button>
                ))}
              </div>
            </>
          )}
        </span>
        <span className="emoji-btn-wrap">
          <button type="button" tabIndex={-1}
            className="comment-editor-toolbar-btn"
            onClick={(e) => acfunOpen ? setAcfunOpen(false) : openPicker("acfun", e.currentTarget)}
            title="AC娘表情">AC</button>
          {acfunOpen && (
            <>
              <div className="emoji-overlay" onClick={() => setAcfunOpen(false)} />
              <div className="emoji-picker acfun-picker" style={pickerStyle}>
                {ACFUN_IDS.map((id) => (
                  <button key={id} type="button" tabIndex={-1}
                    className="acfun-emoji-btn"
                    onMouseDown={(ev) => { ev.preventDefault(); insertText(`[ac${id}]`); }}
                    title={`ac${id}`}>
                    <img src={acfunImageUrl(id)} alt={`ac${id}`} loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
        </span>
      </div>
      <div data-color-mode="light" ref={containerRef}>
        <MDEditor
          value={value}
          onChange={(v) => onChange(v || "")}
          height={height}
          previewOptions={{ remarkPlugins: [remarkBreaks] }}
        />
      </div>
    </div>
  );
}
