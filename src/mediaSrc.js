// Course/media images are stored in the database as absolute URLs baked in at
// upload time, so older rows still point at hosts this project has moved off
// (localhost:3000, back.businessonuae.com, ...). Anything under /uploads/ is
// re-pointed at the backend we talk to today.
const API_ORIGIN = "http://localhost:3000";

export function mediaSrc(value) {
  const src = String(value || "").trim();
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const uploadsIndex = src.indexOf("/uploads/");
  if (uploadsIndex !== -1) return `${API_ORIGIN}${src.slice(uploadsIndex)}`;
  if (/^https?:\/\//i.test(src)) return src;
  return `${API_ORIGIN}${src.startsWith("/") ? src : `/${src}`}`;
}

export default mediaSrc;
