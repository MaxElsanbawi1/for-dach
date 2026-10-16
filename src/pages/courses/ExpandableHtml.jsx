import { useState } from "react";

// Renders HTML content with a "show more / show less" toggle once it exceeds a line clamp.
export default function ExpandableHtml({ html, className = "", lines = 4 }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        className={className}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
        dangerouslySetInnerHTML={{ __html: html || "N/A" }}
      />
      {html && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? "عرض أقل" : "عرض المزيد"}
        </button>
      )}
    </div>
  );
}
