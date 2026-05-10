import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

import { buildEmail } from "../_shared/email/builder.ts";
import { escapeHtml } from "../_shared/email/escape.ts";
import { STATUS_COLORS, FONT_STACK } from "../_shared/email/theme.ts";

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
  | "email_changed"
  | "account_created";

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

// Render structured revision flags as a clean per-step list. Light-mode safe
// (light backgrounds + dark text, status border highlights). The shared dark
// CSS rules in builder.ts will swap colors automatically.
function renderFlagsHtml(flags: RevisionFlags): string {
  const c = STATUS_COLORS.warning;
  const items: string[] = [];
  for (const [stepId, step] of Object.entries(flags.steps)) {
    const stepLabel = escapeHtml(STEP_LABELS[stepId] || stepId);
    const fieldList = step.fields
      .map((f) => escapeHtml(FIELD_LABELS[stepId]?.[f] || f))
      .join("، ");
    items.push(`
      <li style="margin-bottom:14px;list-style:none;padding:12px 14px;background:${c.pillBgLight};border:1px solid ${c.border};border-radius:10px;">
        <div class="e-h1" style="font-weight:700;color:${c.textLight};font-size:14px;font-family:${FONT_STACK};">${stepLabel}</div>
        ${fieldList ? `<div class="e-mute" style="font-size:12px;color:#475569;margin-top:4px;font-family:${FONT_STACK};">الحقول: ${fieldList}</div>` : ""}
        ${step.comment ? `<div class="e-body" style="font-size:13px;color:#334155;margin-top:8px;line-height:1.7;font-family:${FONT_STACK};white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(step.comment)}</div>` : ""}
      </li>`);
  }
  return `<ul style="margin:0;padding:0;list-style:none;">${items.join("")}</ul>`;
}

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

// ── Email content builders ──────────────────────────────────
// Each builder returns { subject, html } and is a thin wrapper around
// buildEmail() with template-specific Arabic copy and section composition.

function buildRegistrationReceived(
  vendorName: string,
  email: string,
  date: string,
): { subject: string; html: string } {
  return buildEmail({
    subject: "تأكيد استلام طلب التسجيل - Half Lens",
    preheader: "تم استلام طلبك وهو الآن قيد المراجعة من فريقنا.",
    status: "info",
    badge: "&#128230; تم استلام الطلب",
    heroIcon: "&#128230;",
    greeting: `مرحباً ${vendorName} 👋`,
    intro: "شكراً لتسجيلك في منصة هاف لينس. تم استلام طلبك بنجاح وهو الآن قيد المراجعة من قبل فريقنا.",
    sections: [
      {
        kind: "infoBox",
        rows: [
          { label: "📋 حالة الطلب", value: "قيد المراجعة" },
          { label: "📅 تاريخ التقديم", value: date },
          { label: "📧 البريد الإلكتروني", value: email, ltr: true },
        ],
      },
      {
        kind: "alertBox",
        status: "warning",
        text: "⏳ سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك. عادةً ما تتم المراجعة خلال 1-3 أيام عمل.",
      },
    ],
  });
}

function buildApproved(
  vendorName: string,
  loginUrl: string,
): { subject: string; html: string } {
  return buildEmail({
    subject: "تمت الموافقة على طلب التسجيل - Half Lens",
    preheader: "تم اعتماد حسابك! يمكنك الآن تسجيل الدخول.",
    status: "success",
    badge: "&#9989; تمت الموافقة",
    heroIcon: "&#10003;",
    greeting: "تم اعتماد حسابك!",
    intro: `مرحباً ${vendorName}، يسعدنا إبلاغك بأن حسابك على منصة هاف لينس قد تم اعتماده بنجاح.`,
    sections: [
      { kind: "heading", text: "ما الخطوة التالية؟" },
      {
        kind: "list",
        items: [
          "سجّل الدخول عبر بريدك الالكتروني المسجل لاستعراض لوحة التحكم الخاصة بك",
          "أكمل ملفك الشخصي وأضف رابط البورتفوليو لزيادة فرص ترشيحك",
          "تأكد من تحديث خدماتك وأسعارك لاستقبال المشاريع المناسبة",
          "سيتم التواصل معك عند توفر مشاريع تتناسب مع تخصصك",
        ],
      },
    ],
    cta: { text: "الدخول إلى حسابي", url: loginUrl },
  });
}

function buildAccountCreated(
  vendorName: string,
  vendorEmail: string,
  loginUrl: string,
  date: string,
): { subject: string; html: string } {
  return buildEmail({
    subject: "تم إنشاء حسابك على Half Lens",
    preheader: "تم إنشاء حسابك بواسطة فريق الإدارة. سجّل دخولك الآن.",
    status: "success",
    badge: "&#127881; تم إنشاء حسابك",
    heroIcon: "&#127881;",
    greeting: "مرحباً بك في Half Lens!",
    intro: `مرحباً ${vendorName}، تم إنشاء حسابك على منصة هاف لينس بواسطة فريق الإدارة. أصبح بإمكانك الآن الدخول إلى حسابك واستعراض المشاريع المسندة إليك.`,
    sections: [
      {
        kind: "infoBox",
        rows: [
          { label: "📧 البريد الإلكتروني للحساب", value: vendorEmail, ltr: true },
          { label: "📅 تاريخ إنشاء الحساب", value: date },
          { label: "📋 طريقة تسجيل الدخول", value: "رمز تحقق يُرسل إلى بريدك" },
        ],
      },
      { kind: "heading", text: "كيف تسجل الدخول؟" },
      {
        kind: "list",
        items: [
          'اضغط على زر "الدخول إلى حسابي" أدناه',
          "أدخل بريدك الإلكتروني المسجل (الموضح أعلاه)",
          "سيصلك رمز تحقق مكوّن من 6 أرقام، أدخله لإكمال تسجيل الدخول",
          "أكمل ملفك الشخصي بإضافة الصور والبيانات الناقصة",
        ],
      },
    ],
    cta: { text: "الدخول إلى حسابي", url: loginUrl },
  });
}

function buildEmailChanged(
  vendorName: string,
  newEmail: string,
  oldEmail: string,
  loginUrl: string,
  date: string,
): { subject: string; html: string } {
  const rows: Array<{ label: string; value: string; ltr?: boolean; strike?: boolean }> = [];
  if (oldEmail) {
    rows.push({ label: "البريد السابق", value: oldEmail, ltr: true, strike: true });
  }
  rows.push({ label: "البريد الجديد", value: newEmail, ltr: true });
  rows.push({ label: "التاريخ", value: date });

  return buildEmail({
    subject: "تحديث البريد الإلكتروني - Half Lens",
    preheader: `تم تحديث بريدك الإلكتروني إلى ${newEmail}. سجّل دخولك بالبريد الجديد.`,
    status: "info",
    badge: "📧 تحديث البريد الإلكتروني",
    heroIcon: "&#128231;",
    greeting: `مرحباً ${vendorName} 👋`,
    intro: "قام فريق هاف لينس بتحديث البريد الإلكتروني المرتبط بحسابك. هذا هو بريدك الجديد لتسجيل الدخول إلى المنصة.",
    introEn: "Your account email has been updated. Use the new email below to sign in.",
    sections: [
      { kind: "infoBox", rows },
      {
        kind: "alertBox",
        status: "warning",
        text: "🔒 استخدم البريد الجديد أعلاه لتسجيل الدخول. إذا لم تطلب هذا التغيير، تواصل معنا فوراً.",
      },
    ],
    cta: { text: "تسجيل الدخول الآن", url: loginUrl },
  });
}

function buildRejected(
  vendorName: string,
  reason: string,
): { subject: string; html: string } {
  return buildEmail({
    subject: "تحديث بشأن طلب التسجيل - Half Lens",
    preheader: "نأسف لإبلاغك بأن طلب التسجيل الخاص بك لم تتم الموافقة عليه.",
    status: "danger",
    badge: "&#10060; لم تتم الموافقة",
    heroIcon: "&#10060;",
    greeting: "لم تتم الموافقة على طلبك",
    intro: `مرحباً ${vendorName}، نأسف لإبلاغك بأن طلب التسجيل الخاص بك لم تتم الموافقة عليه في الوقت الحالي.`,
    sections: [
      {
        kind: "alertBox",
        status: "danger",
        title: "سبب الرفض",
        text: reason || "لم يتم تحديد سبب.",
      },
      {
        kind: "paragraph",
        muted: true,
        text: "إذا كنت تعتقد أن هذا القرار تم بالخطأ أو لديك استفسار، يرجى التواصل مع فريق الدعم.",
      },
    ],
  });
}

function buildRevisionRequested(
  vendorName: string,
  reason: string,
  loginUrl: string,
  flags?: RevisionFlags,
): { subject: string; html: string } {
  const hasStructured = flags && flags.steps && Object.keys(flags.steps).length > 0;
  const detailSection = hasStructured
    ? { kind: "rawHtml" as const, html: `<tr><td class="e-pad" style="padding:0 32px 16px;">${renderFlagsHtml(flags!)}</td></tr>` }
    : {
        kind: "alertBox" as const,
        status: "warning" as const,
        title: "ملاحظات المراجع",
        text: reason || "—",
      };

  return buildEmail({
    subject: "مطلوب تعديلات على طلب التسجيل - Half Lens",
    preheader: "حسابك يحتاج تعديلات قبل إتمام الموافقة.",
    status: "warning",
    badge: "&#9888;&#65039; تعديلات مطلوبة",
    heroIcon: "&#9888;",
    greeting: "حسابك يحتاج تعديلات",
    intro: `مرحباً ${vendorName}، تمت مراجعة طلبك وهناك بعض البيانات التي تحتاج إلى تعديل قبل إتمام الموافقة.`,
    sections: [
      ...(hasStructured ? [{ kind: "heading" as const, text: "الخطوات التي تحتاج تعديلاً:" }] : []),
      detailSection,
      {
        kind: "paragraph",
        muted: true,
        text: 'بعد إجراء التعديلات المطلوبة، اضغط على "إعادة تقديم الطلب" لإرسال طلبك مرة أخرى للمراجعة.',
      },
    ],
    cta: { text: "تسجيل الدخول وتعديل البيانات", url: loginUrl },
  });
}

function buildResubmitted(
  vendorName: string,
  email: string,
  date: string,
): { subject: string; html: string } {
  return buildEmail({
    subject: "تم إعادة تقديم طلب التسجيل - Half Lens",
    preheader: "تم إعادة تقديم طلب التسجيل وهو الآن قيد المراجعة مرة أخرى.",
    status: "info",
    badge: "🔄 تم إعادة التقديم",
    heroIcon: "🔄",
    greeting: `مرحباً ${vendorName} 👋`,
    intro: "تم إعادة تقديم طلب التسجيل الخاص بك بنجاح وهو الآن قيد المراجعة مرة أخرى.",
    sections: [
      {
        kind: "infoBox",
        rows: [
          { label: "📋 حالة الطلب", value: "قيد المراجعة" },
          { label: "📅 تاريخ إعادة التقديم", value: date },
          { label: "📧 البريد الإلكتروني", value: email, ltr: true },
        ],
      },
      {
        kind: "alertBox",
        status: "warning",
        text: "⏳ سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك.",
      },
    ],
  });
}

function buildAdminNewRegistration(
  vendorName: string,
  vendorType: string,
  city: string,
  date: string,
  adminUrl: string,
): { subject: string; html: string } {
  return buildEmail({
    subject: "طلب تسجيل مورد جديد - Half Lens",
    preheader: "مورد جديد قدّم طلب تسجيل ويحتاج إلى مراجعتك.",
    status: "info",
    badge: "🔔 طلب تسجيل جديد",
    heroIcon: "🔔",
    greeting: "طلب تسجيل مورد جديد",
    intro: "تم استلام طلب تسجيل مورد جديد ويحتاج إلى مراجعتك.",
    sections: [
      {
        kind: "infoBox",
        rows: [
          { label: "👤 اسم المورد", value: vendorName },
          { label: "🏢 نوع المورد", value: vendorType === "company" ? "شركة" : "فرد" },
          { label: "📍 المدينة", value: city || "غير محدد" },
          { label: "📅 تاريخ التقديم", value: date },
        ],
      },
    ],
    cta: { text: "مراجعة الطلب", url: adminUrl },
  });
}

// ── SMTP send with retry ────────────────────────────────────

async function sendWithRetry(
  transporter: any,
  mailOptions: any,
  maxRetries = 3,
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SMTP config
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFromEmail || !smtpFromName) {
      console.error("Missing SMTP configuration");
      return new Response(
        JSON.stringify({ error: "إعدادات البريد الإلكتروني غير مكتملة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        if (!vendor.email) return missingEmail(corsHeaders);
        emailContent = buildRegistrationReceived(vendor.full_name, vendor.email, dateStr);
        recipients = [vendor.email];
        break;

      case "approved":
        if (!vendor.email) return missingEmail(corsHeaders);
        emailContent = buildApproved(vendor.full_name, loginUrl);
        recipients = [vendor.email];
        break;

      case "account_created":
        if (!vendor.email) return missingEmail(corsHeaders);
        emailContent = buildAccountCreated(vendor.full_name, vendor.email, loginUrl, dateStr);
        recipients = [vendor.email];
        break;

      case "rejected":
        if (!vendor.email) return missingEmail(corsHeaders);
        emailContent = buildRejected(vendor.full_name, reason || "");
        recipients = [vendor.email];
        break;

      case "revision_requested":
        if (!vendor.email) return missingEmail(corsHeaders);
        emailContent = buildRevisionRequested(vendor.full_name, reason || "", loginUrl, flags);
        recipients = [vendor.email];
        break;

      case "resubmitted":
        if (!vendor.email) return missingEmail(corsHeaders);
        emailContent = buildResubmitted(vendor.full_name, vendor.email, dateStr);
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
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const targetLoginUrl = portal_type === "client" ? clientLoginUrl : loginUrl;
        emailContent = buildEmailChanged(
          vendor.full_name,
          new_email,
          old_email || "",
          targetLoginUrl,
          dateStr,
        );
        recipients = [new_email];
        break;
      }

      case "admin_new_registration": {
        const { data: admins } = await supabase
          .from("users")
          .select("email")
          .in("role", ["super_admin"]);

        if (!admins || admins.length === 0) {
          console.warn("No super_admin users found for notification");
          return new Response(
            JSON.stringify({ success: true, warning: "No admin recipients found" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        emailContent = buildAdminNewRegistration(
          vendor.full_name,
          vendor.vendor_type || "individual",
          vendor.primary_city || "",
          dateStr,
          adminUrl,
        );
        recipients = admins.map((a: { email: string }) => a.email).filter(Boolean);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email_type: ${email_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
      ),
    );

    const allSucceeded = results.every((r) => r.success);
    const anyFailed = results.some((r) => !r.success);

    if (allSucceeded) {
      return new Response(
        JSON.stringify({ success: true, message: "تم إرسال البريد بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        partial: anyFailed && !allSucceeded,
        error: "email_failed",
        message: "فشل إرسال بعض أو كل رسائل البريد الإلكتروني",
      }),
      { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-vendor-status-email:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في النظام" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function missingEmail(headers: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Vendor has no email address" }),
    { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
  );
}
