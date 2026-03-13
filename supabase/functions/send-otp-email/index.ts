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

// Get Arabic email template matching the provided design exactly
function getEmailTemplate(otp: string, email: string, deviceInfo: string, requestTime: string): string {
  const digits = otp.split('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز التحقق - Half Lens</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #f5f7fa;
      padding: 20px;
      direction: rtl;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: linear-gradient(135deg, #0a0f1e 0%, #1a2332 100%);
      padding: 40px 30px;
      text-align: center;
    }

    .logo {
      width: 120px;
      height: auto;
      margin-bottom: 20px;
    }

    .header-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .header-subtitle {
      color: #94a3b8;
      font-size: 14px;
      font-weight: 400;
    }

    .content {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 16px;
    }

    .message {
      font-size: 15px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .otp-container {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      text-align: center;
    }

    .otp-label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .otp-boxes {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      direction: ltr;
    }

    .otp-box {
      width: 56px;
      height: 64px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .expiry-notice {
      font-size: 13px;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .clock-icon {
      width: 16px;
      height: 16px;
    }

    .info-box {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .info-title {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .info-value {
      font-size: 13px;
      color: #1e293b;
      font-weight: 600;
    }

    .warning-box {
      background-color: #fef3c7;
      border-right: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }

    .warning-text {
      font-size: 13px;
      color: #92400e;
      line-height: 1.5;
    }

    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      transition: transform 0.2s;
    }

    .cta-button:hover {
      transform: translateY(-2px);
    }

    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }

    .footer-text {
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 16px;
    }

    .footer-link {
      font-size: 13px;
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }

    .footer-link:hover {
      text-decoration: underline;
    }

    .copyright {
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <img src="${supabaseUrl.replace('/rest/v1', '')}/storage/v1/object/public/project-files/Logo_White.png" alt="Half Lens" class="logo">
      <h1 class="header-title">رمز التحقق الخاص بك</h1>
      <p class="header-subtitle">نظام إدارة الموردين</p>
    </div>

    <!-- Content -->
    <div class="content">
      <h2 class="greeting">مرحباً</h2>
      <p class="message">
        لقد تلقينا طلباً لتسجيل الدخول إلى حسابك في نظام Half Lens. استخدم رمز التحقق التالي لإتمام عملية الدخول:
      </p>

      <!-- OTP Container -->
      <div class="otp-container">
        <p class="otp-label">رمز التحقق (OTP)</p>
        <div class="otp-boxes">
          <div class="otp-box">${digits[0]}</div>
          <div class="otp-box">${digits[1]}</div>
          <div class="otp-box">${digits[2]}</div>
          <div class="otp-box">${digits[3]}</div>
        </div>
        <p class="expiry-notice">
          <svg class="clock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          صالح لمدة 10 دقائق فقط
        </p>
      </div>

      <!-- Request Info -->
      <div class="info-box">
        <p class="info-title">تفاصيل الطلب:</p>
        <div class="info-row">
          <span class="info-label">الوقت</span>
          <span class="info-value">${requestTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">البريد الإلكتروني</span>
          <span class="info-value">${email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الجهاز</span>
          <span class="info-value">${deviceInfo}</span>
        </div>
      </div>

      <!-- Warning -->
      <div class="warning-box">
        <p class="warning-text">
          ⚠️ إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذه الرسالة. لا تشارك هذا الرمز مع أي شخص للحفاظ على أمان حسابك.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="https://akcpkjzfhtmurtwzyzhn.supabase.co/vendor-login" class="cta-button">
          الانتقال لصفحة تسجيل الدخول
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        هذه رسالة آلية من نظام Half Lens لإدارة الموردين.<br>
        للمساعدة والدعم، يرجى التواصل معنا.
      </p>
      <div class="footer-links">
        <a href="#" class="footer-link">سياسة الخصوصية</a>
        <a href="#" class="footer-link">شروط الاستخدام</a>
        <a href="#" class="footer-link">تواصل معنا</a>
      </div>
      <p class="copyright">
        © 2024 Half Lens. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, deviceInfo = "غير معروف" }: OTPRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, email, full_name")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (vendorError || !vendor) {
      return new Response(
        JSON.stringify({ error: "المورد غير موجود في النظام" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check if OTP was sent in the last 60 seconds
    const { data: recentOTP } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("email", email.toLowerCase())
      .gte("created_at", new Date(Date.now() - 60000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOTP) {
      return new Response(
        JSON.stringify({
          error: "تم إرسال رمز التحقق مؤخراً. يرجى الانتظار دقيقة واحدة قبل طلب رمز جديد"
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get client IP
    const ipAddress = req.headers.get("x-forwarded-for") ||
                     req.headers.get("x-real-ip") ||
                     "unknown";

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        email: email.toLowerCase(),
        code: otp,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        device_info: deviceInfo,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء إنشاء رمز التحقق" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current time in Arabic format
    const now = new Date();
    const requestTime = now.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate email HTML
    const emailHtml = getEmailTemplate(otp, email, deviceInfo, requestTime);

    // Send email using SMTP
    try {
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
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create SMTP transport
      const transporter = createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: false, // use STARTTLS
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      // Send email
      const info = await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFromEmail}>`,
        to: email,
        subject: "رمز التحقق - Half Lens",
        html: emailHtml,
      });

      console.log(`OTP email sent successfully to ${email}. Message ID: ${info.messageId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء إرسال البريد الإلكتروني" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in send-otp-email:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في النظام" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});