import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OTPRequest {
  email: string;
  deviceInfo?: string;
}

// Generate 4-digit OTP
function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Email template
function getEmailTemplate(
  otp: string,
  email: string,
  deviceInfo: string,
  requestTime: string,
  loginUrl: string,
): string {
  const digits = otp.padStart(4, "0").slice(0, 4).split("");
  const logoUrl =
    "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/project-files/Logo_White.png";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>رمز التحقق - Half Lens</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#0a0f1e 0%,#1a2332 100%);padding:32px 24px;">
              <img src="${logoUrl}" alt="Half Lens" width="120" style="display:block;margin:0 auto 16px auto;border:0;max-width:120px;height:auto;" />
              <div style="color:#ffffff;font-size:28px;font-weight:700;line-height:1.4;margin-bottom:6px;">
                رمز التحقق الخاص بك
              </div>
              <div style="color:#94a3b8;font-size:14px;line-height:1.6;">
                نظام إدارة الموردين
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              <div style="font-size:20px;font-weight:700;color:#1e293b;line-height:1.6;margin-bottom:12px;">
                مرحباً
              </div>

              <div style="font-size:15px;color:#475569;line-height:1.9;margin-bottom:28px;">
                لقد تلقينا طلباً لتسجيل الدخول إلى حسابك في نظام Half Lens. استخدم رمز التحقق التالي لإتمام عملية الدخول:
              </div>

              <!-- OTP box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding:28px 16px;">
                    <div style="font-size:14px;color:#64748b;font-weight:600;margin-bottom:18px;">
                      رمز التحقق (OTP)
                    </div>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" dir="ltr" style="margin:0 auto 16px auto;">
                      <tr>
                        <td align="center" valign="middle" width="56" height="64" style="width:56px;height:64px;background:#2563eb;border-radius:10px;color:#ffffff;font-size:30px;font-weight:700;">${digits[0]}</td>
                        <td width="8" style="width:8px;"></td>
                        <td align="center" valign="middle" width="56" height="64" style="width:56px;height:64px;background:#2563eb;border-radius:10px;color:#ffffff;font-size:30px;font-weight:700;">${digits[1]}</td>
                        <td width="8" style="width:8px;"></td>
                        <td align="center" valign="middle" width="56" height="64" style="width:56px;height:64px;background:#2563eb;border-radius:10px;color:#ffffff;font-size:30px;font-weight:700;">${digits[2]}</td>
                        <td width="8" style="width:8px;"></td>
                        <td align="center" valign="middle" width="56" height="64" style="width:56px;height:64px;background:#2563eb;border-radius:10px;color:#ffffff;font-size:30px;font-weight:700;">${digits[3]}</td>
                      </tr>
                    </table>

                    <div style="font-size:13px;color:#64748b;line-height:1.7;">
                      صالح لمدة 10 دقائق فقط
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Request details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 18px 8px 18px;font-size:15px;font-weight:700;color:#334155;">
                    تفاصيل الطلب:
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 18px 18px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;font-weight:600;width:120px;">
                          الوقت
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;font-weight:700;text-align:left;" dir="rtl">
                          ${requestTime}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;font-weight:600;width:120px;">
                          البريد الإلكتروني
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;font-weight:700;text-align:left;" dir="ltr">
                          ${email}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600;width:120px;">
                          الجهاز
                        </td>
                        <td style="padding:10px 0;font-size:13px;color:#1e293b;font-weight:700;text-align:left;" dir="rtl">
                          ${deviceInfo}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fef3c7;border-right:4px solid #f59e0b;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px;font-size:13px;line-height:1.8;color:#92400e;font-weight:600;">
                    ⚠️ إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذه الرسالة. لا تشارك هذا الرمز مع أي شخص للحفاظ على أمان حسابك.
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">
                      الانتقال لصفحة تسجيل الدخول
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
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
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

    const { email, deviceInfo = "غير معروف" }: OTPRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, email, full_name, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (vendorError) {
      console.error("Vendor lookup error:", vendorError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء التحقق من البريد الإلكتروني" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!vendor) {
      return new Response(
        JSON.stringify({ error: "المورد غير موجود في النظام" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gate login by vendor status
    const statusGateMessages: Record<string, string> = {
      pending_approval: "طلب التسجيل الخاص بك لا يزال قيد المراجعة. سيتم إشعارك عبر البريد الإلكتروني عند اكتمال المراجعة.",
      rejected: "لم تتم الموافقة على طلب التسجيل الخاص بك. يرجى مراجعة بريدك الإلكتروني للتفاصيل.",
      inactive: "حسابك غير نشط حالياً. يرجى التواصل مع الدعم.",
      blocked: "تم حظر حسابك. يرجى التواصل مع الدعم.",
    };

    // Allow: active, revision_requested. Block everything else.
    if (vendor.status && vendor.status !== "active" && vendor.status !== "revision_requested") {
      const message = statusGateMessages[vendor.status] || "لا يمكنك تسجيل الدخول حالياً. يرجى التواصل مع الدعم.";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limiting: check if OTP was sent in the last 60 seconds
    const { data: recentOTP, error: recentOtpError } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("email", normalizedEmail)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtpError) {
      console.error("Recent OTP lookup error:", recentOtpError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء التحقق من حالة الرمز" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (recentOTP) {
      return new Response(
        JSON.stringify({
          error: "تم إرسال رمز التحقق مؤخراً. يرجى الانتظار دقيقة واحدة قبل طلب رمز جديد",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get client IP
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        email: normalizedEmail,
        code: otp,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        device_info: deviceInfo,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء إنشاء رمز التحقق" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Current time in Arabic format
    const now = new Date();
    const requestTime = now.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Keep this hardcoded for now to avoid missing secret issues
    const loginUrl = "https://akcpkjzfhtmurtwzyzhn.supabase.co/vendor-login";

    const emailHtml = getEmailTemplate(
      otp,
      normalizedEmail,
      deviceInfo,
      requestTime,
      loginUrl,
    );

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
    if (Number.isNaN(port)) {
      return new Response(
        JSON.stringify({ error: "منفذ SMTP غير صالح" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const transporter = createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: normalizedEmail,
      subject: "رمز التحقق - Half Lens",
      html: emailHtml,
    });

    console.log(`OTP email sent successfully to ${normalizedEmail}. Message ID: ${info.messageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-otp-email:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في النظام" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});