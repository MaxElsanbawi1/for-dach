import { toast } from "react-toastify";
import { API } from "./pages/tax/taxApi";

// Adds the signed-in account's token to every request the dashboard makes to
// its API. Pages call fetch() directly (many without an Authorization header),
// and the API refuses every unauthenticated request outside a short public
// list, so this is what keeps those pages working. Imported first in main.jsx.
const originalFetch = window.fetch.bind(window);

// The token goes to our own API server only - never to another site that
// happens to have "/api/" in its address. (URLs are written in full across the
// app, some with a leading space.)
const API_HOST = (() => {
  try {
    return new URL(API.trim()).host.toLowerCase();
  } catch {
    return "";
  }
})();
const isApiUrl = (url) => {
  const u = String(url).trim();
  if (/^\/api\//.test(u)) return true;
  try {
    const parsed = new URL(u);
    return parsed.host.toLowerCase() === API_HOST && parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
};

// When the API refuses a request for lack of permission (403), pages still
// show their own generic error ("فشل حذف الدورة..."). Rather than change every
// page, the first error message shown right after a 403 - by alert() or by
// toast.error() - is replaced with this one.
const NO_PERMISSION = "ليس لديك صلاحية لهذا الإجراء. لو محتاجها في شغلك، اطلبها من مدير النظام.";
let forbiddenAt = 0;
const takeForbidden = () => {
  const recent = Date.now() - forbiddenAt < 4000;
  if (recent) forbiddenAt = 0;
  return recent;
};
const originalAlert = window.alert.bind(window);
window.alert = (message) => originalAlert(takeForbidden() ? NO_PERMISSION : message);
const originalToastError = toast.error;
toast.error = (message, options) => originalToastError(takeForbidden() ? NO_PERMISSION : message, options);

window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url;
  const token = localStorage.getItem("token");

  if (!token || !url || !isApiUrl(url)) {
    return originalFetch(input, init);
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // The page open now, for "المتصلون الآن" (acit-back/services/activityLog.js).
  headers.set("X-Dash-Page", window.location.pathname);

  return originalFetch(input, { ...init, headers }).then((res) => {
    if (res.status === 403) forbiddenAt = Date.now();
    // The session ended (token expired or the account was blocked): back to login.
    if (res.status === 401 && !/\/auth\/login/i.test(url) && !window.location.pathname.startsWith("/login")) {
      // For the activity log if it was a timeout (the API decides; other 401s are ignored).
      originalFetch(`${API}/auth/session-expired`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {});
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    return res;
  });
};
