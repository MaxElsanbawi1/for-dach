// What each dashboard page needs, in one place. The menu (Layout), the page
// guard (ProtectedRoute) and the landing page (RoleBasedRedirect) all read
// this, against the permissions the API returns for the signed-in account
// (/api/permissions/me). Keys are defined in acit-back/config/permissions.js.
//
// need: a permission key, or a list (any of them is enough).
//   "staff"      - any account with at least one permission
//   "superadmin" - the super admin only
//   undefined    - any signed-in account
import {
  Home, FileText, Package, Contact, Users, MessageSquare, UserPlus, CreditCard,
  Receipt, Settings, Percent, Shield, History, Radio,
} from "lucide-react";

export const MENU = [
  { icon: Home, text: "لوحة التحكم", href: "/dashboard", need: "staff" },
  { icon: FileText, text: "التسجيلات", href: "/registrations", subItems: [
    { text: "كل الطلبات", href: "/registrations/all", need: "registrations.view" },
    { text: "الطلبات الجديدة", href: "/registrations/pending", need: "registrations.view" },
    { text: "مسجلين مباشرة", href: "/registrations/direct", need: "registrations.view" },
    { text: "التسجيلات التامة", href: "/registrations/approved", need: "registrations.view" },
    { text: "التسجيل المرفوضة", href: "/registrations/rejected", need: "registrations.view" },
  ]},
  { icon: Package, text: "الدورات", href: "/courses", subItems: [
    { text: "كل الدورات", href: "/courses/all", need: "courses.view" },
    // Same page under two names: overseers see every trainer, a trainer sees their own.
    { text: "دورات المدربين", href: "/allcorcrsestrainer", need: "courses.view", roles: ["admin"] },
    { text: "دوراتي كمدرب", href: "/allcorcrsestrainer", need: "courses.view", roles: ["trainer"] },
    { text: "تقييمات الكورسات", href: "/courses/ratings", need: "courses.ratings" },
    { text: "أضافة دورة ", href: "/courses/addSame", need: "courses.add" },
    { text: "أضافة دورة جديدة", href: "/courses/add", need: "courses.add" },
    { text: "أقسام الدورات", href: "/courses/categories", need: ["categories.add", "categories.edit", "categories.delete"] },
    { text: "أضافة قسم جديد", href: "/courses/categories/add", need: "categories.add" },
    { text: "SEO الأقسام", href: "/courses/categories/seo", need: "categories.edit" },
  ]},
  { icon: Contact, text: "الطلاب", href: "/students", subItems: [
    { text: "كل الطلاب", href: "/students/all", need: "students.view" },
    { text: "QR FORM", href: "/students/qr-form", need: "students.add" },
    { text: "أضافة طالب جديد", href: "/students/add", need: "students.add" },
    { text: "الطلاب المحظورين", href: "/students/blocked", need: "students.block" },
    { text: "كل الطلاب المحظورين", href: "/students/Allblocked", need: "students.block" },
    { text: "الطلاب المسجلون من الكورسات", href: "/students/course-students", need: "students.view" },
    { text: "مسجلين داخل الكورس", href: "/students/paid-course-students", need: ["orders.view", "students.view"] },
  ]},
  { icon: FileText, text: "الاستشارات", href: "/consultations", subItems: [
    { text: "كل الاستشارات", href: "/consultations", need: "consultations.view" },
    { text: "استشارات شبكات", href: "/consultations/networks", need: "consultations.view" },
    { text: "استشارات أخرى", href: "/consultations/other", need: "consultations.view" },
    { text: "البرمجيات والتطبيقات", href: "/consultations/software", need: "consultations.view" },
    { text: "الأمن السيبراني", href: "/consultations/security", need: "consultations.view" },
    { text: "الذكاء الاصطناعي", href: "/consultations/ai", need: "consultations.view" },
    { text: "الحوسبة السحابية", href: "/consultations/cloud", need: "consultations.view" },
    { text: "التسويق الرقمي", href: "/consultations/marketing", need: "consultations.view" },
    { text: "استشارات في التدريب", href: "/consultations/support", need: "consultations.view" },
  ]},
  { icon: FileText, text: "المقالات", href: "/articles", subItems: [
    { text: "كل المقالات", href: "/articles", need: ["articles.view", "articles.add", "articles.edit", "articles.publish", "articles.delete"] },
    { text: "التصنيفات", href: "/articles/categories", need: "articles.categories" },
  ]},
  { icon: Package, text: "العروض", href: "/OffersImageUpload", need: ["offers.add", "offers.edit", "offers.delete"] },
  { icon: Percent, text: "خصم الموقع", href: "/discounts", need: "settings.edit" },
  { icon: Contact, text: "قصم الاكثر طلبا و هدف ", subItems: [
    { text: "  الدورات المدعومه من هدف", href: "/OurPartnersImageUpload", need: ["clients.add", "clients.edit", "clients.delete"] },
    { text: "  الدورات الاكثر طلباّ", href: "/ClientImageUpload", need: ["clients.add", "clients.edit", "clients.delete"] },
  ]},
  { icon: Users, text: "المستخدمين", href: "/users", subItems: [
    { text: "كل المستخدمين", href: "/users", need: "users.view" },
    { text: "إضافة مستخدم", href: "/users/add", need: "users.add" },
    { icon: Shield, text: "الصلاحيات", href: "/users/permissions", need: "superadmin"},
    { icon: History, text: "السجل", href: "/activity", need: "logs.view" },
    { icon: Radio, text: "المتصلون الآن", href: "/online", need: "superadmin" },
    { text: "إضافة مستخدم", href: "/users/add", need: "users.add" },
  ]},

  { icon: UserPlus, text: "العملاء المحتملون", href: "/onboarding", subItems: [
    { text: "الردود والزوّار", href: "/onboarding", need: ["onboarding.view", "onboarding.edit", "onboarding.delete"] },
    { text: "أسئلة التعريف", href: "/onboarding/questions", need: "onboarding.questions" },
    { text: "رسائل تواصل معنا", href: "/complaints", need: ["complaints.view", "complaints.status"]},
  ]},
  { icon: CreditCard, text: "المدفوعات", href: "/payments", subItems: [
    { text: "سجل المدفوعات", href: "/payments", need: "orders.view" },
    { text: "إشعارات Tap", href: "/payments/tap", need: "orders.view" },
    { text: "إشعارات تمارا", href: "/payments/tamara", need: "orders.view" },
    { text: "إشعارات تابي", href: "/payments/tabby", need: "orders.view" },
    { text: "إشعارات PayPal", href: "/payments/paypal", need: "orders.view" },
    { text: "إشعارات PayTabs", href: "/payments/paytabs", need: "orders.view" },
  ]},
  { icon: Receipt, text: "الضرائب", href: "/tax", subItems: [
    { text: "نظرة عامة", href: "/tax", need: "tax.view" },
    { text: "الفواتير الضريبية", href: "/tax/invoices", need: "tax.view" },
    { text: "بانتظار المراجعة", href: "/tax/drafts", need: "tax.view", badge: "pendingInvoices" },
    { text: "أعمار الديون", href: "/tax/aging", need: "tax.view" },
    { text: "الإقرار الضريبي", href: "/tax/vat-return", need: "tax.view" },
    { text: "الإعدادات الضريبية", href: "/tax/settings", need: ["tax.issue", "settings.edit"] },
  ]},
  { icon: Settings, text: "الإعدادات", subItems: [
    { text: "ملفي الشخصي", href: "/ProfilePage" },
    { text: "تحويل الروابط", href: "/settings/redirects", need: ["courses.edit", "categories.edit", "settings.edit"] },
    { text: "نسخة احتياطية لقاعدة البيانات", href: "/settings/database-backup", need: "superadmin" },
    { text: "تنبيهات المحاضرات (تليجرام)", href: "/settings/whatsapp", need: "superadmin" },
    { text: "محادثات المدربين", href: "/trainer-chats", need: "superadmin", badge: "trainerChats" },
    { text: "تسجيل الخروج", action: "logout" },
  ]},
];

// Pages outside the menu (details, edit, ...) and what they need. Matched in
// order; ":x" matches one path segment. A page listed nowhere is open to any
// staff account.
export const PAGE_NEEDS = [
  ["/courses/:x/edit", "courses.edit"],
  ["/courses/:x/details", "courses.view"],
  ["/courses/:x/attendance", "courses.attendance"],
  ["/courses/categories/:x/details", ["categories.edit", "categories.delete"]],
  ["/courses", "courses.view"],
  ["/registrations/:x/details", "registrations.view"],
  ["/registrations", "registrations.view"],
  ["/notifications/:x", "registrations.view"],
  ["/students/:x/details", "students.view"],
  ["/students/invoice", ["tax.view", "students.view"]],
  ["/students", "students.view"],
  ["/tax/invoices/:x", "tax.view"],
  ["/tax/drafts/:x", "tax.view"],
  ["/notifications", undefined],
];

// Partner accounts keep their own small area (their courses only).
export const PARTNER_PAGES = [
  "/CoursesPartner", "/courses/:x/detailsPartner", "/courses/:x/editPartner", "/ProfilePage", "/notifications",
];

const toRegex = (pattern) => new RegExp(`^${pattern.replace(/:x/g, "[^/]+")}/?$`, "i");
export const matchPath = (pattern, path) => toRegex(pattern).test(path);

/** Does the account satisfy `need`? access = { permissions:Set, isSuperAdmin, role } */
export function allowed(need, access, roles) {
  if (!access) return false;
  if (roles && !roles.includes(access.role) && !access.isSuperAdmin) return false;
  if (need === undefined) return true;
  if (access.isSuperAdmin) return true;
  if (need === "superadmin") return false;
  if (need === "staff") return access.permissions.size > 0;
  const keys = Array.isArray(need) ? need : [need];
  return keys.some((k) => access.permissions.has(k));
}

/** The menu trimmed to what the account may open. */
export function visibleMenu(access) {
  return MENU.map((item) => {
    if (!item.subItems) return allowed(item.need, access, item.roles) ? item : null;
    const seen = new Set();
    const subItems = item.subItems.filter((s) => {
      if (!(s.action || allowed(s.need, access, s.roles))) return false;
      // One entry per page: the first that the account may open.
      if (s.href && seen.has(s.href)) return false;
      if (s.href) seen.add(s.href);
      return true;
    });
    const real = subItems.filter((s) => !s.action);
    return real.length ? { ...item, subItems } : null;
  }).filter(Boolean);
}

/** What a page path needs: its menu entry, else PAGE_NEEDS, else "staff". */
export function needFor(path) {
  for (const item of MENU) {
    // A parent with sub-items only opens its dropdown; its children decide.
    for (const entry of item.subItems || [item]) {
      if (entry.href && matchPath(entry.href, path)) {
        // A page listed under several names (one per role) opens for any of those roles.
        const same = MENU.flatMap((i) => i.subItems || [i]).filter((e) => e.href === entry.href);
        const roles = same.some((e) => !e.roles) ? undefined : [...new Set(same.flatMap((e) => e.roles))];
        return { need: entry.need, roles };
      }
    }
  }
  const hit = PAGE_NEEDS.find(([pattern]) => matchPath(pattern, path));
  return hit ? { need: hit[1] } : { need: "staff" };
}

/** First page the account can open, for the landing redirect. */
export function firstPage(access) {
  for (const item of visibleMenu(access)) {
    const first = item.subItems ? item.subItems.find((s) => s.href) : item;
    if (first?.href) return first.href;
  }
  return "/ProfilePage";
}
