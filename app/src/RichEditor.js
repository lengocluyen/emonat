import { React, htm, useState, useEffect, useRef, useCallback } from "./vendor.js";
import { useEditor, EditorContent } from "https://esm.sh/@tiptap/react@2?deps=react@18.2.0,react-dom@18.2.0";
import StarterKit from "https://esm.sh/@tiptap/starter-kit@2";
import Underline from "https://esm.sh/@tiptap/extension-underline@2";
import Highlight from "https://esm.sh/@tiptap/extension-highlight@2";
import Link from "https://esm.sh/@tiptap/extension-link@2";
import Image from "https://esm.sh/@tiptap/extension-image@2";
import Youtube from "https://esm.sh/@tiptap/extension-youtube@2";
import TextAlign from "https://esm.sh/@tiptap/extension-text-align@2";
import Placeholder from "https://esm.sh/@tiptap/extension-placeholder@2";

const html = htm.bind(React.createElement);

const EMPTY_RE = /^(\s|<p>\s*<\/p>|<br\s*\/?>)*$/;

function ToolBtn({ onClick, active, title, children }) {
  return html`<button
    type="button"
    className=${"richBtn" + (active ? " active" : "")}
    onMouseDown=${(e) => { e.preventDefault(); onClick(); }}
    title=${title}
  >${children}</button>`;
}

function Divider() {
  return html`<span className="richDivider" />`;
}

export function RichEditor({ defaultContent = "", onChange, placeholder = "Write something…" }) {
  const [urlBar, setUrlBar] = useState(null); // { type: 'link'|'image'|'youtube', value: '' }
  const urlRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Youtube.configure({ width: 480, height: 270, nocookie: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultContent || "",
    editorProps: { attributes: { class: "richContent" } },
    onUpdate({ editor }) {
      const h = editor.getHTML();
      onChange?.(EMPTY_RE.test(h) ? "" : h);
    },
  });

  useEffect(() => {
    if (urlBar) urlRef.current?.focus();
  }, [urlBar?.type]);

  const openLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      const prev = editor.getAttributes("link").href ?? "";
      setUrlBar({ type: "link", value: prev });
    }
  }, [editor]);

  const confirmUrl = useCallback(() => {
    if (!editor || !urlBar) return;
    const { type, value } = urlBar;
    const url = value.trim();
    setUrlBar(null);
    if (!url) return;
    if (type === "link") {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
    } else if (type === "image") {
      editor.chain().focus().setImage({ src: url }).run();
    } else if (type === "youtube") {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor, urlBar]);

  const cancelUrl = useCallback(() => setUrlBar(null), []);

  const handleKey = useCallback((e) => {
    if (e.key === "Enter") { e.preventDefault(); confirmUrl(); }
    if (e.key === "Escape") { e.preventDefault(); cancelUrl(); }
  }, [confirmUrl, cancelUrl]);

  if (!editor) return html`<div className="richEditor" style=${{ minHeight: "160px" }} />`;

  const e = editor;

  return html`
    <div className="richEditor">
      <div className="richToolbar">
        <${ToolBtn} onClick=${() => e.chain().focus().toggleBold().run()} active=${e.isActive("bold")} title="Bold"><b>B</b><//>
        <${ToolBtn} onClick=${() => e.chain().focus().toggleItalic().run()} active=${e.isActive("italic")} title="Italic"><i>I</i><//>
        <${ToolBtn} onClick=${() => e.chain().focus().toggleUnderline().run()} active=${e.isActive("underline")} title="Underline"><u>U</u><//>
        <${ToolBtn} onClick=${() => e.chain().focus().toggleStrike().run()} active=${e.isActive("strike")} title="Strikethrough"><s>S</s><//>
        <${Divider} />
        ${[1, 2, 3].map((level) => html`
          <${ToolBtn}
            key=${level}
            onClick=${() => e.chain().focus().toggleHeading({ level }).run()}
            active=${e.isActive("heading", { level })}
            title=${"Heading " + level}
          >H${level}<//>
        `)}
        <${Divider} />
        <${ToolBtn} onClick=${() => e.chain().focus().toggleBulletList().run()} active=${e.isActive("bulletList")} title="Bullet list">•<//>
        <${ToolBtn} onClick=${() => e.chain().focus().toggleOrderedList().run()} active=${e.isActive("orderedList")} title="Numbered list">1.<//>
        <${ToolBtn} onClick=${() => e.chain().focus().toggleBlockquote().run()} active=${e.isActive("blockquote")} title="Quote">❝<//>
        <${ToolBtn} onClick=${() => e.chain().focus().toggleCodeBlock().run()} active=${e.isActive("codeBlock")} title="Code block">{}<//>
        <${Divider} />
        <${ToolBtn} onClick=${() => e.chain().focus().toggleHighlight().run()} active=${e.isActive("highlight")} title="Highlight text">▌<//>
        <${Divider} />
        <${ToolBtn} onClick=${openLink} active=${e.isActive("link")} title="Insert / remove link">Link<//>
        <${ToolBtn} onClick=${() => setUrlBar({ type: "image", value: "" })} active=${urlBar?.type === "image"} title="Insert image">Img<//>
        <${ToolBtn} onClick=${() => setUrlBar({ type: "youtube", value: "" })} active=${urlBar?.type === "youtube"} title="Embed YouTube video">YT<//>
        <${Divider} />
        <${ToolBtn} onClick=${() => e.chain().focus().setTextAlign("left").run()} active=${e.isActive({ textAlign: "left" })} title="Align left">⇤<//>
        <${ToolBtn} onClick=${() => e.chain().focus().setTextAlign("center").run()} active=${e.isActive({ textAlign: "center" })} title="Center">⇔<//>
        <${ToolBtn} onClick=${() => e.chain().focus().setTextAlign("right").run()} active=${e.isActive({ textAlign: "right" })} title="Align right">⇥<//>
      </div>
      ${urlBar ? html`
        <div className="richUrlBar">
          <input
            ref=${urlRef}
            className="input"
            style=${{ flex: 1, fontSize: "13px", padding: "6px 10px" }}
            placeholder=${urlBar.type === "link" ? "https://…" : urlBar.type === "image" ? "Image URL (https://…)" : "YouTube URL or video ID"}
            value=${urlBar.value}
            onChange=${(ev) => setUrlBar((p) => ({ ...p, value: ev.target.value }))}
            onKeyDown=${handleKey}
          />
          <button className="btn primary" style=${{ padding: "6px 14px" }} onClick=${confirmUrl}>Add</button>
          <button className="btn" style=${{ padding: "6px 10px" }} onClick=${cancelUrl}>✕</button>
        </div>
      ` : null}
      <${EditorContent} editor=${editor} />
    </div>
  `;
}

export function RichViewer({ content, className = "" }) {
  if (!content) {
    return html`<span className="muted" style=${{ fontStyle: "italic" }}>No description</span>`;
  }
  return html`<div
    className=${"richContent richViewer " + className}
    dangerouslySetInnerHTML=${{ __html: content }}
  />`;
}
