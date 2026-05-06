import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

type EmailType =
  | "registration_received"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "resubmitted"
  | "admin_new_registration"
  | "email_changed";

interface RevisionFlags {
  steps: Record<string, { comment: string; fields: string[] }>;
}

interface StatusEmailRequest {
  vendor_id: string;
  email_type: EmailType;
  reason?: string;
  flags?: RevisionFlags;
  new_email?: string;
  old_email?: string;
  // Used only by email_changed — selects which portal the login CTA opens
  // and which table is read for the recipient's full name.
  portal_type?: "vendor" | "client";
}

// Mirrors src/lib/vendorRegistrationSteps.ts — kept in sync manually because
// Edge Functions cannot import from the React app. Update both together.
const STEP_LABELS: Record<string, string> = {
  identity: "الهوية الأساسية",
  contact: "بيانات التواصل",
  documents: "المستندات والصور",
  travel: "وثائق السفر",
  financial: "البيانات المالية",
  fields: "المجالات والأسعار",
  review: "المراجعة النهائية",
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  identity: {
    full_name: "الاسم الكامل",
    nationality: "الجنسية",
    vendor_type: "نوع المورد",
    id_number: "رقم الهوية",
  },
  contact: {
    email: "البريد الإلكتروني",
    phone: "رقم الجوال",
    primary_city: "المدينة الأساسية",
    other_cities: "مدن أخرى",
    portfolio_url: "رابط البورتفوليو",
  },
  documents: {
    profile_image: "الصورة الشخصية",
    id_image: "صورة الهوية",
  },
  travel: {
    passport_number: "رقم جواز السفر",
    passport_issuing_country: "بلد إصدار الجواز",
    passport_expiry_date: "تاريخ انتهاء الجواز",
    passport_file: "صورة جواز السفر",
    visa_country: "بلد التأشيرة",
    visa_file: "مستند التأشيرة",
  },
  financial: {
    bank_id: "البنك",
    account_name: "اسم الحساب",
    iban: "رقم الآيبان (IBAN)",
    price_includes_tax: "الأسعار تشمل ضريبة",
    company_name: "اسم الشركة",
    vat_number: "الرقم الضريبي",
  },
  fields: {
    selected_fields: "المجالات المختارة",
    rates: "نطاقات الأسعار",
  },
  review: {},
};

function renderFlagsHtml(flags: RevisionFlags): string {
  const items: string[] = [];
  for (const [stepId, step] of Object.entries(flags.steps)) {
    const stepLabel = escapeHtml(STEP_LABELS[stepId] || stepId);
    const fieldList = step.fields
      .map((f) => escapeHtml(FIELD_LABELS[stepId]?.[f] || f))
      .join("، ");
    items.push(`
      <li style="margin-bottom:14px;">
        <div style="font-weight:700;color:#fbbf24;font-size:13px;">${stepLabel}</div>
        ${fieldList ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">الحقول: ${fieldList}</div>` : ""}
        ${step.comment ? `<div style="font-size:13px;color:#e2e8f0;margin-top:6px;line-height:1.7;">${escapeHtml(step.comment)}</div>` : ""}
      </li>`);
  }
  return `<ul style="margin:0;padding:0 20px 0 0;list-style:disc;">${items.join("")}</ul>`;
}

// ── Shared template parts ──────────────────────────────────

const logoWhiteUrl =
  Deno.env.get("EMAIL_LOGO_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-white.png";
const logoBlueUrl =
  Deno.env.get("EMAIL_LOGO_BLUE_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-blue.png";

// Reject malformed addresses before SMTP handoff (e.g., "name+@host")
const EMAIL_REGEX = /^(?!\.)(?!.*\.\.)(?!.*\+\+)[A-Za-z0-9_'%=?^{|}~.\-]+(?:\+[A-Za-z0-9_'%=?^{|}~.\-]+)?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length === 0 || v.length > 254) return false;
  const [local] = v.split("@");
  if (!local || local.length > 64 || local.endsWith("+") || local.endsWith(".")) return false;
  return EMAIL_REGEX.test(v);
}

// HTML-escape user input to prevent injection in email templates
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const baseUrl = Deno.env.get("APP_BASE_URL") || "#";

// Centered "logo block" hero — a rounded brand-color card with the big white
// logo inside, plus a small accent badge below. Sits centered on the email
// body (which is dark by default and switches to light via prefers-color-scheme).
function baseHeader(badge: string, _badgeBg: string, badgeBorder: string, badgeColor: string): string {
  void _badgeBg;
  return `
  <tr>
    <td align="center" style="padding:48px 24px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
        <tr>
          <td align="center" bgcolor="#0a1024" style="background-color:#0a1024;padding:44px 36px;border-radius:24px;">
            <img src="${logoWhiteUrl}" alt="Half Lens" width="200" style="display:block;border:0;width:200px;max-width:200px;height:auto;margin:0 auto;" />
          </td>
        </tr>
      </table>
      <div style="margin-top:20px;">
        <span style="display:inline-block;padding:8px 22px;border-radius:999px;border:1.5px solid ${badgeBorder};color:${badgeColor};font-size:13px;font-weight:700;letter-spacing:0.02em;">${badge}</span>
      </div>
    </td>
  </tr>`;
}

function baseFooter(): string {
  return `
  <tr>
    <td align="center" style="padding:32px 32px 36px;">
      <div class="ed" style="font-size:11px;color:#64748b;line-height:1.9;margin-bottom:6px;">
        <a href="${baseUrl}" style="color:#60a5fa;text-decoration:none;margin:0 6px;">الموقع</a>
        <span style="color:#94a3b8;">·</span>
        <a href="${baseUrl}/privacy" style="color:#60a5fa;text-decoration:none;margin:0 6px;">سياسة السرّية</a>
        <span style="color:#94a3b8;">·</span>
        <a href="${baseUrl}/terms" style="color:#60a5fa;text-decoration:none;margin:0 6px;">الشروط</a>
      </div>
      <p class="ed" style="font-size:11px;color:#64748b;margin:0;">&copy; 2026 Half Lens Production — جميع الحقوق محفوظة</p>
    </td>
  </tr>`;
}

function wrapTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    :root { color-scheme: dark only; supported-color-schemes: dark only; }
    /* Full-dark email — premium brand look matching the app's dark-mode UI.
       Centered logo card, outlined CTAs, soft slate body text. Locked to
       dark-only so no client (Gmail iOS / Outlook) can auto-invert it. */
    body, .eb, .ew { background-color: #0a1024 !important; }
    .ec { background-color: #0d1428 !important; }
    .et { color: #f8fafc !important; }
    .es { color: #cbd5e1 !important; }
    .ed { color: #64748b !important; }
    @media only screen and (max-width: 600px) {
      .ec { border-radius: 0 !important; }
      .ep { padding: 18px 16px !important; }
    }
  </style>
</head>
<body class="eb" bgcolor="#0a1024" style="margin:0;padding:0;background-color:#0a1024;font-family:'Cairo','Tajawal',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table class="ew" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a1024" style="background-color:#0a1024;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:0;">
        <table class="ec" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d1428" style="max-width:560px;background-color:#0d1428;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoBox(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r, i) => `
      <tr>
        <td style="padding:12px 18px;${i < rows.length - 1 ? "border-bottom:1px solid rgba(148,163,184,0.10);" : ""}font-size:12px;color:#64748b;font-weight:600;width:140px;">
          ${r.label}
        </td>
        <td style="padding:12px 18px;${i < rows.length - 1 ? "border-bottom:1px solid rgba(148,163,184,0.10);" : ""}font-size:12px;color:#e2e8f0;font-weight:600;text-align:left;" dir="rtl">
          ${r.value}
        </td>
      </tr>`
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(148,163,184,0.15);border-radius:10px;margin-bottom:24px;">
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${rowsHtml}
        </table>
      </td>
    </tr>
  </table>`;
}

function ctaButton(text: string, url: string, color = "#60a5fa"): string {
  // Outlined CTA — transparent bg, brand-color border + text. Renders cleanly
  // on any dark email body without depending on rendered shadows or
  // gradients (which Outlook strips).
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;padding:14px 56px;border:1.5px solid ${color};color:${color};font-size:14px;font-weight:700;border-radius:12px;text-decoration:none;font-family:'Cairo','Tajawal',Arial,sans-serif;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

function alertBox(
  text: string,
  bgColor: string,
  borderColor: string,
  textColor: string
): string {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;margin-bottom:24px;">
    <tr>
      <td style="padding:14px 18px;font-size:12px;line-height:1.7;color:${textColor};">
        ${text}
      </td>
    </tr>
  </table>`;
}

// ── Email content builders ──────────────────────────────────

function buildRegistrationReceived(
  vendorName: string,
  email: string,
  date: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#128230; تم استلام الطلب", "rgba(37,99,235,0.12)", "rgba(37,99,235,0.25)", "#60a5fa")}
    <tr>
      <td style="padding:32px 32px 0;color:#f8fafc;">
        <p style="font-size:18px;font-weight:700;color:#f8fafc;margin:0 0 8px;">مرحباً ${vendorName} &#128075;</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.8;margin:0 0 24px;">شكراً لتسجيلك في منصة هاف لينس. تم استلام طلبك بنجاح وهو الآن قيد المراجعة من قبل فريقنا.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        ${infoBox([
          { label: "&#128203; حالة الطلب", value: "قيد المراجعة" },
          { label: "&#128197; تاريخ التقديم", value: date },
          { label: "&#128231; البريد الإلكتروني", value: email },
        ])}
        ${alertBox(
          "&#9203;&#65039; سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك. عادةً ما تتم المراجعة خلال 1-3 أيام عمل.",
          "rgba(245,158,11,0.05)",
          "rgba(245,158,11,0.3)",
          "#fbbf24"
        )}
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "تأكيد استلام طلب التسجيل - Half Lens",
    html: wrapTemplate(content, "تأكيد استلام طلب التسجيل - Half Lens"),
  };
}

function buildApproved(
  vendorName: string,
  loginUrl: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#9989; تمت الموافقة", "rgba(16,185,129,0.12)", "rgba(16,185,129,0.25)", "#34d399")}
    <tr>
      <td style="padding:32px 32px 0;text-align:center;color:#f8fafc;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);line-height:64px;font-size:28px;margin-bottom:20px;">&#10003;</div>
        <p style="font-size:20px;font-weight:700;color:#f8fafc;margin:0 0 12px;">تم اعتماد حسابك!</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.8;margin:0 0 24px;">مرحباً ${vendorName}، يسعدنا إبلاغك بأن حسابك على منصة هاف لينس قد تم اعتماده بنجاح.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <p style="font-size:14px;font-weight:600;color:#f8fafc;margin:0 0 12px;">ما الخطوة التالية؟</p>
        <ul style="margin:0;padding:0 18px;font-size:14px;color:#94a3b8;line-height:2.2;">
          <li>سجّل الدخول عبر بريدك الالكتروني المسجل لاستعراض لوحة التحكم الخاصة بك</li>
          <li>أكمل ملفك الشخصي وأضف رابط البورتفوليو لزيادة فرص ترشيحك</li>
          <li>تأكد من تحديث خدماتك وأسعارك لاستقبال المشاريع المناسبة</li>
          <li>سيتم التواصل معك عند توفر مشاريع تتناسب مع تخصصك</li>
        </ul>
        ${ctaButton("الدخول إلى حسابي", loginUrl, "#10b981")}
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "تمت الموافقة على طلب التسجيل - Half Lens",
    html: wrapTemplate(content, "تمت الموافقة على طلب التسجيل - Half Lens"),
  };
}

function buildEmailChanged(
  vendorName: string,
  newEmail: string,
  oldEmail: string,
  loginUrl: string,
  date: string
): { subject: string; html: string } {
  // Self-contained light-theme template. The shared dark-theme wrapper renders
  // poorly in Gmail mobile dark mode (Gmail strips most of the swap CSS, so the
  // email can come through as light text on a near-white auto-inverted card,
  // making content unreadable). Here we use solid opaque colors only — no RGBA,
  // no prefers-color-scheme tricks — so the email looks identical and legible
  // in every client whether dark mode is on or off.
  const subject = "تحديث البريد الإلكتروني - Half Lens";
  const oldRow = oldEmail ? `
        <tr>
          <td style="padding:14px 18px 6px;font-size:12px;color:#6b7280;font-weight:600;" dir="rtl">البريد السابق</td>
        </tr>
        <tr>
          <td style="padding:0 18px 14px;border-bottom:1px solid rgba(148,163,184,0.10);font-size:14px;color:#dc2626;font-weight:700;text-decoration:line-through;text-decoration-color:#dc2626;text-decoration-thickness:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="ltr">${oldEmail}</td>
        </tr>` : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${subject}</title>
  <style>
    /* Logo dark/light swap so it stays visible whether the email client renders
       our intended dark header or force-inverts it to light. */
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none !important; }
      .logo-dark  { display: inline-block !important; mso-hide: none !important; }
    }
    [data-ogsc] .logo-light { display: none !important; }
    [data-ogsc] .logo-dark  { display: inline-block !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a1024;font-family:'Cairo','Tajawal',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a1024" style="background-color:#0a1024;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d1428" style="max-width:560px;background-color:#0d1428;">
          <tr>
            <td align="center" style="padding:48px 24px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#0a1024" style="background-color:#0a1024;padding:44px 36px;border-radius:24px;">
                    <img src="${logoWhiteUrl}" alt="Half Lens" width="200" style="display:block;border:0;width:200px;max-width:200px;height:auto;margin:0 auto;" />
                  </td>
                </tr>
              </table>
              <div style="margin-top:20px;">
                <span style="display:inline-block;padding:8px 22px;border-radius:999px;border:1.5px solid rgba(96,165,250,0.5);color:#60a5fa;font-size:13px;font-weight:700;">تحديث البريد الإلكتروني</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 8px;">
              <h1 style="font-size:22px;font-weight:800;color:#f8fafc;margin:0 0 6px;" dir="rtl">مرحباً ${vendorName} &#128075;</h1>
              <p style="font-size:14px;color:#cbd5e1;line-height:1.85;margin:0 0 6px;" dir="rtl">
                قام فريق هاف لينس بتحديث البريد الإلكتروني المرتبط بحسابك. هذا هو بريدك الجديد لتسجيل الدخول إلى المنصة.
              </p>
              <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin:0 0 22px;" dir="ltr">
                Your account email has been updated. Use the new email below to sign in.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.15);border-radius:12px;">
                ${oldRow}
                <tr>
                  <td style="padding:14px 18px 6px;font-size:12px;color:#94a3b8;font-weight:600;" dir="rtl">البريد الجديد</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 14px;border-bottom:1px solid rgba(148,163,184,0.10);font-size:15px;color:#60a5fa;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="ltr">${newEmail}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px 6px;font-size:12px;color:#94a3b8;font-weight:600;" dir="rtl">التاريخ</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 14px;font-size:14px;color:#e2e8f0;font-weight:600;" dir="rtl">${date}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;line-height:1.75;color:#fbbf24;" dir="rtl">
                    &#128274; استخدم البريد الجديد أعلاه لتسجيل الدخول. إذا لم تطلب هذا التغيير، تواصل معنا فوراً.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 56px;border-radius:12px;border:1.5px solid #60a5fa;color:#60a5fa;font-size:14px;font-weight:700;text-decoration:none;font-family:'Cairo','Tajawal',Arial,sans-serif;">
                تسجيل الدخول الآن &#9665;
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 32px 36px;">
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.7;" dir="rtl">
                &copy; ${new Date().getFullYear()} Half Lens Production — جميع الحقوق محفوظة
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function buildRejected(
  vendorName: string,
  reason: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#10060; لم تتم الموافقة", "rgba(239,68,68,0.1)", "rgba(239,68,68,0.25)", "#f87171")}
    <tr>
      <td style="padding:32px 32px 0;text-align:center;color:#f8fafc;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);line-height:64px;font-size:28px;margin-bottom:20px;">&#10060;</div>
        <p style="font-size:20px;font-weight:700;color:#f8fafc;margin:0 0 12px;">لم تتم الموافقة على طلبك</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.8;margin:0 0 24px;">مرحباً ${vendorName}، نأسف لإبلاغك بأن طلب التسجيل الخاص بك لم تتم الموافقة عليه في الوقت الحالي.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="font-size:13px;font-weight:700;color:#dc2626;margin:0 0 8px;">سبب الرفض:</p>
              <p style="font-size:14px;color:#cbd5e1;line-height:1.8;margin:0;white-space:pre-wrap;">${escapeHtml(reason)}</p>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#94a3b8;line-height:1.8;margin:0;">إذا كنت تعتقد أن هذا القرار تم بالخطأ أو لديك استفسار، يرجى التواصل مع فريق الدعم.</p>
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "تحديث بشأن طلب التسجيل - Half Lens",
    html: wrapTemplate(content, "تحديث بشأن طلب التسجيل - Half Lens"),
  };
}

function buildRevisionRequested(
  vendorName: string,
  reason: string,
  loginUrl: string,
  flags?: RevisionFlags
): { subject: string; html: string } {
  const hasStructured = flags && flags.steps && Object.keys(flags.steps).length > 0;
  const detailsBlock = hasStructured
    ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.3);border-radius:10px;margin-bottom:24px;">
          <tr>
            <td style="padding:18px 20px;">
              <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:12px;">الخطوات التي تحتاج تعديلاً:</div>
              ${renderFlagsHtml(flags!)}
            </td>
          </tr>
        </table>`
    : alertBox(
        `<strong>ملاحظات المراجع:</strong><br/><span style="white-space:pre-wrap;">${escapeHtml(reason)}</span>`,
        "rgba(245,158,11,0.05)",
        "rgba(245,158,11,0.3)",
        "#fbbf24"
      );

  const content = `
    ${baseHeader("&#9888;&#65039; تعديلات مطلوبة", "rgba(245,158,11,0.1)", "rgba(245,158,11,0.25)", "#fbbf24")}
    <tr>
      <td style="padding:32px 32px 0;text-align:center;color:#f8fafc;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);line-height:64px;font-size:28px;margin-bottom:20px;">&#9888;</div>
        <p style="font-size:20px;font-weight:700;color:#f8fafc;margin:0 0 12px;">حسابك يحتاج تعديلات</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.8;margin:0 0 24px;">مرحباً ${vendorName}، تمت مراجعة طلبك وهناك بعض البيانات التي تحتاج إلى تعديل قبل إتمام الموافقة.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        ${detailsBlock}
        ${ctaButton("تسجيل الدخول وتعديل البيانات", loginUrl, "#2563eb")}
        <p style="font-size:13px;color:#94a3b8;line-height:1.8;margin:16px 0 0;text-align:center;">
          بعد إجراء التعديلات المطلوبة، اضغط على "إعادة تقديم الطلب" لإرسال طلبك مرة أخرى للمراجعة.
        </p>
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "مطلوب تعديلات على طلب التسجيل - Half Lens",
    html: wrapTemplate(content, "مطلوب تعديلات على طلب التسجيل - Half Lens"),
  };
}

function buildResubmitted(
  vendorName: string,
  email: string,
  date: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#128260; تم إعادة التقديم", "rgba(37,99,235,0.12)", "rgba(37,99,235,0.25)", "#60a5fa")}
    <tr>
      <td style="padding:32px 32px 0;color:#f8fafc;">
        <p style="font-size:18px;font-weight:700;color:#f8fafc;margin:0 0 8px;">مرحباً ${vendorName} &#128075;</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.8;margin:0 0 24px;">تم إعادة تقديم طلب التسجيل الخاص بك بنجاح وهو الآن قيد المراجعة مرة أخرى.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        ${infoBox([
          { label: "&#128203; حالة الطلب", value: "قيد المراجعة" },
          { label: "&#128197; تاريخ إعادة التقديم", value: date },
          { label: "&#128231; البريد الإلكتروني", value: email },
        ])}
        ${alertBox(
          "&#9203;&#65039; سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك.",
          "rgba(245,158,11,0.05)",
          "rgba(245,158,11,0.3)",
          "#fbbf24"
        )}
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "تم إعادة تقديم طلب التسجيل - Half Lens",
    html: wrapTemplate(content, "تم إعادة تقديم طلب التسجيل - Half Lens"),
  };
}

function buildAdminNewRegistration(
  vendorName: string,
  vendorType: string,
  city: string,
  date: string,
  adminUrl: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#128276; طلب تسجيل جديد", "rgba(37,99,235,0.12)", "rgba(37,99,235,0.25)", "#60a5fa")}
    <tr>
      <td style="padding:32px 32px 0;color:#f8fafc;">
        <p style="font-size:18px;font-weight:700;color:#f8fafc;margin:0 0 8px;">طلب تسجيل مورد جديد</p>
        <p style="font-size:14px;color:#94a3b8;line-height:1.8;margin:0 0 24px;">تم استلام طلب تسجيل مورد جديد ويحتاج إلى مراجعتك.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        ${infoBox([
          { label: "&#128100; اسم المورد", value: vendorName },
          { label: "&#127970; نوع المورد", value: vendorType === "company" ? "شركة" : "فرد" },
          { label: "&#128205; المدينة", value: city || "غير محدد" },
          { label: "&#128197; تاريخ التقديم", value: date },
        ])}
        ${ctaButton("مراجعة الطلب", adminUrl, "#2563eb")}
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "طلب تسجيل مورد جديد - Half Lens",
    html: wrapTemplate(content, "طلب تسجيل مورد جديد - Half Lens"),
  };
}

// ── SMTP send with retry ────────────────────────────────────

async function sendWithRetry(
  transporter: any,
  mailOptions: any,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {
  const delays = [2000, 5000, 10000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully. Message ID: ${info.messageId}`);
      return { success: true };
    } catch (error) {
      console.error(`Email send attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  return { success: false, error: "All retry attempts failed" };
}

// ── Main handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "إعدادات قاعدة البيانات غير مكتملة" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {
      vendor_id,
      email_type,
      reason,
      flags,
      new_email,
      old_email,
      portal_type,
    }: StatusEmailRequest = await req.json();

    if (!vendor_id || !email_type) {
      return new Response(
        JSON.stringify({ error: "vendor_id and email_type are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For email_changed with portal_type=client, the id refers to a row in
    // the clients table — fetch from there. Everything else is a vendor.
    const isClientEmailChange =
      email_type === "email_changed" && portal_type === "client";

    let vendor: {
      id: string;
      full_name: string;
      email: string | null;
      vendor_type?: string | null;
      primary_city?: string | null;
    } | null = null;

    if (isClientEmailChange) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("id", vendor_id)
        .maybeSingle();
      if (clientError || !client) {
        console.error("Client lookup error:", clientError);
        return new Response(
          JSON.stringify({ error: "العميل غير موجود", code: "client_not_found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      vendor = { id: client.id, full_name: client.name, email: client.email };
    } else {
      const { data: v, error: vendorError } = await supabase
        .from("vendors")
        .select("id, full_name, email, vendor_type, primary_city")
        .eq("id", vendor_id)
        .maybeSingle();
      if (vendorError || !v) {
        console.error("Vendor lookup error:", vendorError);
        return new Response(
          JSON.stringify({ error: "المورد غير موجود", code: "vendor_not_found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      vendor = v;
    }

    // Guard against malformed vendor emails (e.g. "name+@host") that SMTP
    // will accept but Gmail silently drops. Return 200 with success:false
    // so the supabase-js client delivers the body to the admin UI instead
    // of surfacing only a generic FunctionsHttpError.
    // email_changed sends to the brand-new address (passed in payload), not
    // the row's stored email — skip the row-email validation for that path.
    const vendorEmailRequired =
      email_type !== "admin_new_registration" && email_type !== "email_changed";
    if (vendorEmailRequired && !isValidEmail(vendor.email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_vendor_email",
          message: "البريد الإلكتروني المسجل للمورد غير صالح",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SMTP config
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME");

    if (
      !smtpHost ||
      !smtpPort ||
      !smtpUser ||
      !smtpPassword ||
      !smtpFromEmail ||
      !smtpFromName
    ) {
      console.error("Missing SMTP configuration");
      return new Response(
        JSON.stringify({ error: "إعدادات البريد الإلكتروني غير مكتملة" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const port = Number(smtpPort);
    const transporter = createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    const now = new Date();
    const dateStr = now.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const siteUrl = Deno.env.get("SITE_URL") || "https://platform.h-lens.co";
    const loginUrl = Deno.env.get("VENDOR_LOGIN_URL") || `${siteUrl}/vendor/login`;
    const clientLoginUrl = Deno.env.get("CLIENT_LOGIN_URL") || `${siteUrl}/client`;
    const adminUrl = Deno.env.get("ADMIN_URL") || `${siteUrl}/#vendors`;

    // Build email based on type
    let emailContent: { subject: string; html: string };
    let recipients: string[] = [];

    switch (email_type) {
      case "registration_received":
        if (!vendor.email) {
          return new Response(
            JSON.stringify({ error: "Vendor has no email address" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        emailContent = buildRegistrationReceived(
          vendor.full_name,
          vendor.email,
          dateStr
        );
        recipients = [vendor.email];
        break;

      case "approved":
        if (!vendor.email) {
          return new Response(
            JSON.stringify({ error: "Vendor has no email address" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        emailContent = buildApproved(vendor.full_name, loginUrl);
        recipients = [vendor.email];
        break;

      case "rejected":
        if (!vendor.email) {
          return new Response(
            JSON.stringify({ error: "Vendor has no email address" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        emailContent = buildRejected(vendor.full_name, reason || "");
        recipients = [vendor.email];
        break;

      case "revision_requested":
        if (!vendor.email) {
          return new Response(
            JSON.stringify({ error: "Vendor has no email address" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        emailContent = buildRevisionRequested(
          vendor.full_name,
          reason || "",
          loginUrl,
          flags
        );
        recipients = [vendor.email];
        break;

      case "resubmitted":
        if (!vendor.email) {
          return new Response(
            JSON.stringify({ error: "Vendor has no email address" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        emailContent = buildResubmitted(
          vendor.full_name,
          vendor.email,
          dateStr
        );
        recipients = [vendor.email];
        break;

      case "email_changed": {
        if (!new_email || !isValidEmail(new_email)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "invalid_new_email",
              message: "البريد الإلكتروني الجديد غير صالح",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        const targetLoginUrl =
          portal_type === "client" ? clientLoginUrl : loginUrl;
        emailContent = buildEmailChanged(
          vendor.full_name,
          new_email,
          old_email || "",
          targetLoginUrl,
          dateStr
        );
        recipients = [new_email];
        break;
      }

      case "admin_new_registration": {
        // Fetch all super_admin emails
        const { data: admins } = await supabase
          .from("users")
          .select("email")
          .in("role", ["super_admin"]);

        if (!admins || admins.length === 0) {
          console.warn("No super_admin users found for notification");
          return new Response(
            JSON.stringify({
              success: true,
              warning: "No admin recipients found",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        emailContent = buildAdminNewRegistration(
          vendor.full_name,
          vendor.vendor_type || "individual",
          vendor.primary_city || "",
          dateStr,
          adminUrl
        );
        recipients = admins
          .map((a: { email: string }) => a.email)
          .filter(Boolean);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email_type: ${email_type}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Send to all recipients
    const results = await Promise.all(
      recipients.map((to) =>
        sendWithRetry(transporter, {
          from: `"${smtpFromName}" <${smtpFromEmail}>`,
          to,
          subject: emailContent.subject,
          html: emailContent.html,
        })
      )
    );

    const allSucceeded = results.every((r) => r.success);
    const anyFailed = results.some((r) => !r.success);

    if (allSucceeded) {
      return new Response(
        JSON.stringify({ success: true, message: "تم إرسال البريد بنجاح" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Some or all failed
    return new Response(
      JSON.stringify({
        success: false,
        partial: anyFailed && !allSucceeded,
        error: "email_failed",
        message: "فشل إرسال بعض أو كل رسائل البريد الإلكتروني",
      }),
      {
        status: 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-vendor-status-email:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في النظام" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
