import React, { useMemo, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

const Size = Quill.import("attributors/style/size");
Size.whitelist = ["12px", "14px", "16px", "18px", "24px", "32px"];
Quill.register(Size, true);

const BlockEmbed = Quill.import("blots/block/embed");
class DividerBlot extends BlockEmbed {}
DividerBlot.blotName = "divider";
DividerBlot.tagName = "hr";
Quill.register(DividerBlot, true);

// Toolbar icons for the custom buttons, drawn like Quill's own (18x18,
// ql-stroke/ql-fill) so they pick up the same hover/active colours.
const icons = Quill.import("ui/icons");
icons.divider = `<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="2" x2="16" y1="9" y2="9"/><line class="ql-stroke ql-thin" x1="5" x2="13" y1="4" y2="4"/><line class="ql-stroke ql-thin" x1="5" x2="13" y1="14" y2="14"/></svg>`;
icons.unlink = `<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M7.5 10.5l-1.8 1.8a2 2 0 0 1-2.8-2.8l1.8-1.8"/><path class="ql-stroke" d="M10.5 7.5l1.8-1.8a2 2 0 0 1 2.8 2.8l-1.8 1.8"/><line class="ql-stroke" x1="3" x2="15" y1="3" y2="15"/></svg>`;
icons.undo = `<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"/><path class="ql-stroke" d="M8.09 13.91A4.6 4.6 0 0 0 9 14a5 5 0 1 0-5-5"/></svg>`;
icons.redo = `<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"/><path class="ql-stroke" d="M9.91 13.91A4.6 4.6 0 0 1 9 14a5 5 0 1 1 5-5"/></svg>`;

// "www.facebook.com" typed without a scheme is a *relative* URL, so the browser
// resolves it under the current page (/articles/www.facebook.com). Anything that
// is not already absolute, root-relative, an anchor or a mailto/tel gets https://.
function withScheme(url) {
  const str = String(url || "").trim();
  if (!str || /^([a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(str)) return str;
  return `https://${str}`;
}

const Link = Quill.import("formats/link");
const baseSanitize = Link.sanitize;
Link.sanitize = (url) => baseSanitize.call(Link, withScheme(url));

function stripHtml(html) {
  const text = String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  return text;
}

export default function RichTextEditor({ value, onChange, uploadUrl, authHeaders, placeholder = "اكتب محتوى المقال هنا..." }) {
  const quillRef = useRef(null);
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(true);
  const plainText = stripHtml(value);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = plainText.length;

  const applyLinkTargets = (html) => {
    // Links saved before withScheme existed get repaired on the next save.
    const str = String(html || "").replace(
      /(<a\s[^>]*?href=")([^"]*)(")/gi,
      (_m, pre, href, post) => `${pre}${withScheme(href)}${post}`
    );
    if (!openLinksInNewTab) return str;
    // idempotent: drop any existing target/rel before adding, otherwise every
    // onChange would append another pair and re-trigger onChange forever
    return str.replace(/<a(\s[^>]*)?>/gi, (_match, attrs) => {
      const cleaned = String(attrs || "")
        .replace(/\s*target\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s*rel\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return `<a${cleaned} target="_blank" rel="noopener noreferrer">`;
    });
  };

  const emitChange = (html) => {
    const next = applyLinkTargets(html);
    if (next !== (value || "")) onChange(next);
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [false, 1, 2, 3, 4] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "bullet" }, { list: "ordered" }],
        ["blockquote"],
        [{ align: [] }],
        [{ direction: "rtl" }],
        ["link", "unlink", "image"],
        ["divider"],
        ["clean"],
        ["undo", "redo"],
      ],
      handlers: {
        image: async () => {
          const input = document.createElement("input");
          input.setAttribute("type", "file");
          input.setAttribute("accept", "image/*");
          input.click();
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              alert("Please select an image file");
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              alert("Image size must be 5MB or less");
              return;
            }
            const alt = window.prompt("Image alt text", "") || "";
            const payload = new FormData();
            payload.append("image", file);
            const res = await fetch(uploadUrl, { method: "POST", headers: authHeaders(false), body: payload });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              alert(data.message || "Image upload failed");
              return;
            }
            const editor = quillRef.current.getEditor();
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, "image", data.url);
            editor.setSelection(range.index + 1);
            const img = editor.root.querySelector(`img[src="${data.url}"]`);
            if (img && alt) img.setAttribute("alt", alt);
            emitChange(editor.root.innerHTML);
          };
        },
        divider: () => {
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection(true);
          editor.insertEmbed(range.index, "divider", true);
          editor.setSelection(range.index + 1);
        },
        unlink: () => {
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          if (range) editor.format("link", false);
        },
        undo: () => quillRef.current.getEditor().history.undo(),
        redo: () => quillRef.current.getEditor().history.redo(),
      },
    },
    history: { delay: 500, maxStack: 100, userOnly: true },
  }), [uploadUrl, openLinksInNewTab]);

  return (
    <div className="article-editor rounded-md border bg-white">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={emitChange}
        modules={modules}
        formats={[
          "header",
          "bold",
          "italic",
          "underline",
          "strike",
          "list",
          "bullet",
          "blockquote",
          "align",
          "direction",
          "link",
          "divider",
          "image",
          "size",
          "clean",
        ]}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs text-gray-500">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={openLinksInNewTab} onChange={(e) => setOpenLinksInNewTab(e.target.checked)} />
          Open links in new tab
        </label>
        <span>{wordCount} words / {characterCount} characters</span>
      </div>
    </div>
  );
}
