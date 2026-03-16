import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
  | "admin_new_registration";

interface StatusEmailRequest {
  vendor_id: string;
  email_type: EmailType;
  reason?: string;
}

// ── Shared template parts ──────────────────────────────────

const logoUrl =
  "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/project-files/Logo_White.png";

function baseHeader(badge: string, badgeBg: string, badgeBorder: string, badgeColor: string): string {
  return `
  <tr>
    <td align="center" style="background:linear-gradient(180deg,#04081a 0%,#0a1628 100%);padding:32px 32px 24px;">
      <img src="${logoUrl}" alt="Half Lens" width="160" style="display:block;margin:0 auto 16px auto;border:0;max-width:160px;height:auto;" />
      <div style="margin-top:16px;">
        <span style="display:inline-block;padding:6px 18px;background:${badgeBg};border:1px solid ${badgeBorder};border-radius:20px;font-size:13px;font-weight:700;color:${badgeColor};">${badge}</span>
      </div>
    </td>
  </tr>`;
}

function baseFooter(): string {
  return `
  <tr>
    <td align="center" style="background:#040910;padding:24px 32px;border-top:1px solid rgba(255,255,255,0.05);">
      <img src="${logoUrl}" alt="Half Lens" width="100" style="display:block;margin:0 auto;border:0;max-width:100px;height:auto;opacity:0.35;" />
      <div style="margin-top:12px;font-size:11px;color:rgba(200,215,255,0.3);line-height:2;">
        <a href="https://halflens.com" style="color:rgba(200,215,255,0.4);text-decoration:none;margin:0 8px;">الموقع الالكتروني</a>
        <a href="https://halflens.com/privacy" style="color:rgba(200,215,255,0.4);text-decoration:none;margin:0 8px;">سياسة الخصوصية</a>
        <a href="https://halflens.com/terms" style="color:rgba(200,215,255,0.4);text-decoration:none;margin:0 8px;">الشروط والأحكام</a>
      </div>
      <p style="font-size:10px;color:rgba(200,215,255,0.2);margin:8px 0 0;">Half Lens &copy; 2026 — جميع الحقوق محفوظة</p>
    </td>
  </tr>`;
}

function wrapTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#030b1a;font-family:'Cairo',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#030b1a;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#060d1e;border-radius:8px;overflow:hidden;">
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
        <td style="padding:12px 18px;${i < rows.length - 1 ? "border-bottom:1px solid rgba(255,255,255,0.05);" : ""}font-size:12px;color:rgba(200,215,255,0.5);font-weight:600;width:140px;">
          ${r.label}
        </td>
        <td style="padding:12px 18px;${i < rows.length - 1 ? "border-bottom:1px solid rgba(255,255,255,0.05);" : ""}font-size:12px;color:rgba(200,215,255,0.8);font-weight:600;text-align:left;" dir="rtl">
          ${r.value}
        </td>
      </tr>`
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:24px;">
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${rowsHtml}
        </table>
      </td>
    </tr>
  </table>`;
}

function ctaButton(text: string, url: string, color = "#2563eb"): string {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,${color} 0%,${color}dd 100%);color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;box-shadow:0 4px 15px ${color}4d;">
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
      <td style="padding:32px 32px 0;color:#f0f4ff;">
        <p style="font-size:18px;font-weight:700;color:#f0f4ff;margin:0 0 8px;">مرحباً ${vendorName} &#128075;</p>
        <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">شكراً لتسجيلك في منصة Half Lens. تم استلام طلبك بنجاح وهو الآن قيد المراجعة من قبل فريقنا.</p>
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
      <td style="padding:32px 32px 0;text-align:center;color:#f0f4ff;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);line-height:64px;font-size:28px;margin-bottom:20px;">&#10003;</div>
        <p style="font-size:20px;font-weight:700;color:#f0f4ff;margin:0 0 12px;">تم اعتماد حسابك!</p>
        <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">مرحباً ${vendorName}، يسعدنا إبلاغك بأن حسابك على منصة Half Lens قد تم اعتماده بنجاح.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <p style="font-size:14px;font-weight:600;color:#f0f4ff;margin:0 0 12px;">ما الخطوة التالية؟</p>
        <ul style="margin:0;padding:0 18px;font-size:14px;color:rgba(200,215,255,0.6);line-height:2.2;">
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

function buildRejected(
  vendorName: string,
  reason: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#10060; لم تتم الموافقة", "rgba(239,68,68,0.1)", "rgba(239,68,68,0.25)", "#f87171")}
    <tr>
      <td style="padding:32px 32px 0;text-align:center;color:#f0f4ff;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);line-height:64px;font-size:28px;margin-bottom:20px;">&#10060;</div>
        <p style="font-size:20px;font-weight:700;color:#f0f4ff;margin:0 0 12px;">لم تتم الموافقة على طلبك</p>
        <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">مرحباً ${vendorName}، نأسف لإبلاغك بأن طلب التسجيل الخاص بك لم تتم الموافقة عليه في الوقت الحالي.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="font-size:13px;font-weight:600;color:#f87171;margin:0 0 8px;">سبب الرفض:</p>
              <p style="font-size:14px;color:rgba(200,215,255,0.7);line-height:1.8;margin:0;">${reason}</p>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:rgba(200,215,255,0.4);line-height:1.8;margin:0;">إذا كنت تعتقد أن هذا القرار تم بالخطأ أو لديك استفسار، يرجى التواصل مع فريق الدعم.</p>
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
  loginUrl: string
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#9888;&#65039; تعديلات مطلوبة", "rgba(245,158,11,0.1)", "rgba(245,158,11,0.25)", "#fbbf24")}
    <tr>
      <td style="padding:32px 32px 0;text-align:center;color:#f0f4ff;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);line-height:64px;font-size:28px;margin-bottom:20px;">&#9888;</div>
        <p style="font-size:20px;font-weight:700;color:#f0f4ff;margin:0 0 12px;">حسابك يحتاج تعديلات</p>
        <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">مرحباً ${vendorName}، تمت مراجعة طلبك وهناك بعض البيانات التي تحتاج إلى تعديل قبل إتمام الموافقة.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        ${alertBox(
          `<strong>ملاحظات المراجع:</strong><br/>${reason}`,
          "rgba(245,158,11,0.05)",
          "rgba(245,158,11,0.3)",
          "#fbbf24"
        )}
        ${ctaButton("تسجيل الدخول وتعديل البيانات", loginUrl, "#2563eb")}
        <p style="font-size:13px;color:rgba(200,215,255,0.4);line-height:1.8;margin:16px 0 0;text-align:center;">
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
      <td style="padding:32px 32px 0;color:#f0f4ff;">
        <p style="font-size:18px;font-weight:700;color:#f0f4ff;margin:0 0 8px;">مرحباً ${vendorName} &#128075;</p>
        <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">تم إعادة تقديم طلب التسجيل الخاص بك بنجاح وهو الآن قيد المراجعة مرة أخرى.</p>
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
      <td style="padding:32px 32px 0;color:#f0f4ff;">
        <p style="font-size:18px;font-weight:700;color:#f0f4ff;margin:0 0 8px;">طلب تسجيل مورد جديد</p>
        <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">تم استلام طلب تسجيل مورد جديد ويحتاج إلى مراجعتك.</p>
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
    const { vendor_id, email_type, reason }: StatusEmailRequest =
      await req.json();

    if (!vendor_id || !email_type) {
      return new Response(
        JSON.stringify({ error: "vendor_id and email_type are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch vendor data
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, full_name, email, vendor_type, primary_city")
      .eq("id", vendor_id)
      .maybeSingle();

    if (vendorError || !vendor) {
      console.error("Vendor lookup error:", vendorError);
      return new Response(
        JSON.stringify({ error: "المورد غير موجود", code: "vendor_not_found" }),
        {
          status: 404,
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

    const loginUrl = Deno.env.get("VENDOR_LOGIN_URL") || `${supabaseUrl.replace('.supabase.co', '')}/vendor-login`;
    const adminUrl = Deno.env.get("ADMIN_URL") || `${supabaseUrl.replace('.supabase.co', '')}/#vendors`;

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
          loginUrl
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
