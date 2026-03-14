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

function baseHeader(title: string, subtitle = "نظام إدارة الموردين"): string {
  return `
  <tr>
    <td align="center" style="background:linear-gradient(135deg,#0a0f1e 0%,#1a2332 100%);padding:32px 24px;">
      <img src="${logoUrl}" alt="Half Lens" width="120" style="display:block;margin:0 auto 16px auto;border:0;max-width:120px;height:auto;" />
      <div style="color:#ffffff;font-size:28px;font-weight:700;line-height:1.4;margin-bottom:6px;">
        ${title}
      </div>
      <div style="color:#94a3b8;font-size:14px;line-height:1.6;">
        ${subtitle}
      </div>
    </td>
  </tr>`;
}

function baseFooter(): string {
  return `
  <tr>
    <td align="center" style="background-color:#f8fafc;padding:24px;border-top:1px solid #e2e8f0;">
      <div style="font-size:13px;color:#64748b;line-height:1.8;margin-bottom:12px;">
        هذه رسالة آلية من نظام Half Lens لإدارة الموردين.<br />
        للمساعدة والدعم، يرجى التواصل معنا.
      </div>
      <div style="margin-bottom:12px;">
        <a href="#" style="font-size:13px;color:#2563eb;text-decoration:none;margin:0 8px;">سياسة الخصوصية</a>
        <a href="#" style="font-size:13px;color:#2563eb;text-decoration:none;margin:0 8px;">شروط الاستخدام</a>
        <a href="#" style="font-size:13px;color:#2563eb;text-decoration:none;margin:0 8px;">تواصل معنا</a>
      </div>
      <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
        © 2026 Half Lens Production — جميع الحقوق محفوظة
      </div>
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
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;">
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
        <td style="padding:10px 0;${i < rows.length - 1 ? "border-bottom:1px solid #e2e8f0;" : ""}font-size:13px;color:#64748b;font-weight:600;width:140px;">
          ${r.label}
        </td>
        <td style="padding:10px 0;${i < rows.length - 1 ? "border-bottom:1px solid #e2e8f0;" : ""}font-size:13px;color:#1e293b;font-weight:700;text-align:left;" dir="rtl">
          ${r.value}
        </td>
      </tr>`
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;border-radius:10px;margin-bottom:24px;">
    <tr>
      <td style="padding:18px;">
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
        <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">
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
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${bgColor};border-right:4px solid ${borderColor};border-radius:8px;margin-bottom:24px;">
    <tr>
      <td style="padding:16px;font-size:14px;line-height:1.8;color:${textColor};font-weight:600;">
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
    ${baseHeader("تم استلام طلب التسجيل")}
    <tr>
      <td style="padding:32px 24px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
          مرحباً ${vendorName}
        </div>
        <div style="font-size:15px;color:#475569;line-height:1.9;margin-bottom:28px;">
          شكراً لتسجيلك في نظام Half Lens لإدارة الموردين. تم استلام طلبك بنجاح وهو الآن قيد المراجعة من قبل فريقنا.
        </div>
        ${infoBox([
          { label: "حالة الطلب", value: "قيد المراجعة" },
          { label: "تاريخ التقديم", value: date },
          { label: "البريد الإلكتروني", value: email },
        ])}
        ${alertBox(
          "⏳ سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك. عادةً ما تتم المراجعة خلال 1-3 أيام عمل.",
          "#fef3c7",
          "#f59e0b",
          "#92400e"
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
    ${baseHeader("تمت الموافقة على طلبك")}
    <tr>
      <td style="padding:32px 24px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
          مرحباً ${vendorName}
        </div>
        ${alertBox(
          "✅ مبروك! تمت الموافقة على تسجيلك في نظام Half Lens لإدارة الموردين. يمكنك الآن تسجيل الدخول والوصول إلى حسابك.",
          "#dcfce7",
          "#22c55e",
          "#166534"
        )}
        ${ctaButton("تسجيل الدخول إلى حسابك", loginUrl, "#22c55e")}
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
    ${baseHeader("تحديث حالة طلب التسجيل")}
    <tr>
      <td style="padding:32px 24px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
          مرحباً ${vendorName}
        </div>
        ${alertBox(
          "نأسف لإبلاغك بأن طلب التسجيل الخاص بك لم تتم الموافقة عليه في الوقت الحالي.",
          "#fee2e2",
          "#ef4444",
          "#991b1b"
        )}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;border-radius:10px;margin-bottom:24px;">
          <tr>
            <td style="padding:18px;">
              <div style="font-size:14px;font-weight:700;color:#334155;margin-bottom:8px;">سبب الرفض:</div>
              <div style="font-size:14px;color:#475569;line-height:1.8;">${reason}</div>
            </td>
          </tr>
        </table>
        <div style="font-size:14px;color:#475569;line-height:1.8;">
          إذا كنت تعتقد أن هذا القرار تم بالخطأ أو لديك استفسار، يرجى التواصل مع فريق الدعم.
        </div>
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
    ${baseHeader("مطلوب تعديلات على طلبك")}
    <tr>
      <td style="padding:32px 24px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
          مرحباً ${vendorName}
        </div>
        <div style="font-size:15px;color:#475569;line-height:1.9;margin-bottom:28px;">
          تمت مراجعة طلب التسجيل الخاص بك وهناك بعض البيانات التي تحتاج إلى تعديل قبل إتمام الموافقة.
        </div>
        ${alertBox(
          `<strong>ملاحظات المراجع:</strong><br/>${reason}`,
          "#fef3c7",
          "#f59e0b",
          "#92400e"
        )}
        ${ctaButton("تسجيل الدخول وتعديل البيانات", loginUrl, "#2563eb")}
        <div style="font-size:13px;color:#64748b;line-height:1.8;margin-top:16px;text-align:center;">
          بعد إجراء التعديلات المطلوبة، اضغط على "إعادة تقديم الطلب" لإرسال طلبك مرة أخرى للمراجعة.
        </div>
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
    ${baseHeader("تم إعادة تقديم طلبك")}
    <tr>
      <td style="padding:32px 24px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
          مرحباً ${vendorName}
        </div>
        <div style="font-size:15px;color:#475569;line-height:1.9;margin-bottom:28px;">
          تم إعادة تقديم طلب التسجيل الخاص بك بنجاح وهو الآن قيد المراجعة مرة أخرى.
        </div>
        ${infoBox([
          { label: "حالة الطلب", value: "قيد المراجعة" },
          { label: "تاريخ إعادة التقديم", value: date },
          { label: "البريد الإلكتروني", value: email },
        ])}
        ${alertBox(
          "⏳ سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك.",
          "#fef3c7",
          "#f59e0b",
          "#92400e"
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
    ${baseHeader("طلب تسجيل مورد جديد")}
    <tr>
      <td style="padding:32px 24px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
          طلب تسجيل جديد
        </div>
        <div style="font-size:15px;color:#475569;line-height:1.9;margin-bottom:28px;">
          تم استلام طلب تسجيل مورد جديد ويحتاج إلى مراجعتك.
        </div>
        ${infoBox([
          { label: "اسم المورد", value: vendorName },
          { label: "نوع المورد", value: vendorType === "company" ? "شركة" : "فرد" },
          { label: "المدينة", value: city || "غير محدد" },
          { label: "تاريخ التقديم", value: date },
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
