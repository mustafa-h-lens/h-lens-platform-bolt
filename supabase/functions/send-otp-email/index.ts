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
<body style="margin:0;padding:0;background-color:#030b1a;font-family:'Cairo',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#030b1a;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#060d1e;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(180deg,#04081a 0%,#0a1628 100%);padding:32px 32px 24px;">
              <img src="${logoUrl}" alt="Half Lens" width="160" style="display:block;margin:0 auto 16px auto;border:0;max-width:160px;height:auto;" />
              <div style="margin-top:16px;">
                <span style="display:inline-block;padding:6px 18px;background:rgba(37,99,235,0.12);border:1px solid rgba(37,99,235,0.25);border-radius:20px;font-size:13px;font-weight:700;color:#60a5fa;">&#128272; رمز التحقق</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 0;color:#f0f4ff;">
              <p style="font-size:18px;font-weight:700;color:#f0f4ff;margin:0 0 8px;">مرحباً &#128075;</p>
              <p style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">تم طلب رمز تحقق لتسجيل الدخول إلى منصة Half Lens. استخدم الرمز التالي:</p>
            </td>
          </tr>

          <!-- OTP Boxes -->
          <tr>
            <td style="padding:0 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" dir="ltr" style="margin:0 auto;">
                <tr>
                  <td align="center" valign="middle" width="58" height="64" style="width:58px;height:64px;background:rgba(37,99,235,0.06);border:1.5px solid rgba(37,99,235,0.3);border-radius:12px;font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#60a5fa;">${digits[0]}</td>
                  <td width="10" style="width:10px;"></td>
                  <td align="center" valign="middle" width="58" height="64" style="width:58px;height:64px;background:rgba(37,99,235,0.06);border:1.5px solid rgba(37,99,235,0.3);border-radius:12px;font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#60a5fa;">${digits[1]}</td>
                  <td width="10" style="width:10px;"></td>
                  <td align="center" valign="middle" width="58" height="64" style="width:58px;height:64px;background:rgba(37,99,235,0.06);border:1.5px solid rgba(37,99,235,0.3);border-radius:12px;font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#60a5fa;">${digits[2]}</td>
                  <td width="10" style="width:10px;"></td>
                  <td align="center" valign="middle" width="58" height="64" style="width:58px;height:64px;background:rgba(37,99,235,0.06);border:1.5px solid rgba(37,99,235,0.3);border-radius:12px;font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#60a5fa;">${digits[3]}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry -->
          <tr>
            <td style="padding:18px 32px 0;text-align:center;">
              <p style="font-size:13px;color:rgba(200,215,255,0.5);margin:0;">&#9201;&#65039; ينتهي هذا الرمز خلال <strong style="color:rgba(200,215,255,0.8);">10 دقائق</strong></p>
            </td>
          </tr>

          <!-- Info Row -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:rgba(200,215,255,0.5);border-bottom:1px solid rgba(255,255,255,0.05);">&#128338; وقت الطلب</td>
                  <td style="padding:12px 18px;font-size:12px;color:rgba(200,215,255,0.8);font-weight:600;text-align:left;border-bottom:1px solid rgba(255,255,255,0.05);" dir="rtl">${requestTime}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:rgba(200,215,255,0.5);border-bottom:1px solid rgba(255,255,255,0.05);">&#128231; البريد</td>
                  <td style="padding:12px 18px;font-size:12px;color:rgba(200,215,255,0.8);font-weight:600;text-align:left;" dir="ltr">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:rgba(200,215,255,0.5);">&#128187; الجهاز</td>
                  <td style="padding:12px 18px;font-size:12px;color:rgba(200,215,255,0.8);font-weight:600;text-align:left;" dir="ltr">${deviceInfo}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:18px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.05);border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#fbbf24;line-height:1.7;">
                    &#9888;&#65039; لا تشارك هذا الرمز مع أي شخص. فريق Half Lens لن يطلب منك رمز التحقق أبداً عبر الهاتف أو البريد.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;box-shadow:0 4px 15px rgba(37,99,235,0.3);">&#127760; الذهاب إلى صفحة تسجيل الدخول</a>
            </td>
          </tr>

          <!-- Footer -->
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