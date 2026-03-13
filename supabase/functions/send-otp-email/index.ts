import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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

function getEmailTemplate(
  otp: string,
  email: string,
  deviceInfo: string,
  requestTime: string,
): string {
  const digits = otp.padStart(4, "0").slice(0, 4).split("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>رمز التحقق — Half Lens</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0a0f1e;
      font-family: Cairo, Arial, sans-serif;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
      direction: rtl;
    }

    .email-wrap {
      max-width: 640px;
      margin: 0 auto;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    }

    .email-header {
      background: linear-gradient(135deg, #04081a 0%, #0a1628 100%);
      padding: 32px 36px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .email-header::before {
      content: "";
      position: absolute;
      top: -30%;
      left: 50%;
      transform: translateX(-50%);
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(29,78,216,0.15) 0%, transparent 65%);
    }

    .logo-area {
      position: relative;
      z-index: 1;
    }

    .logo-area img {
      height: 42px;
      object-fit: contain;
    }

    .header-badge {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(37,99,235,0.12);
      border: 1px solid rgba(59,130,246,0.2);
      font-size: 12px;
      font-weight: 700;
      color: #93c5fd;
      letter-spacing: .04em;
    }

    .email-body {
      background: #060d1e;
      padding: 36px;
    }

    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 10px;
    }

    .body-text {
      font-size: 14px;
      color: rgba(255,255,255,0.58);
      line-height: 1.9;
      margin-bottom: 22px;
    }

    .otp-container {
      text-align: center;
      margin: 28px 0;
    }

    .otp-label {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255,255,255,0.34);
      letter-spacing: .08em;
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    .otp-boxes {
      direction: ltr;
      text-align: center;
      margin-bottom: 12px;
    }

    .otp-digit {
      display: inline-block;
      width: 58px;
      height: 64px;
      line-height: 64px;
      margin: 0 5px;
      border-radius: 12px;
      background: rgba(37,99,235,0.15);
      border: 2px solid rgba(59,130,246,0.35);
      font-size: 32px;
      font-weight: 900;
      color: #93c5fd;
      font-family: Cairo, Arial, sans-serif;
      box-shadow: 0 0 20px rgba(37,99,235,0.15);
      text-align: center;
    }

    .otp-expiry {
      font-size: 12px;
      color: rgba(255,255,255,0.34);
      margin-top: 12px;
      text-align: center;
    }

    .info-row {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 13px 15px;
      margin: 16px 0;
    }

    .info-title {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.72);
      margin-bottom: 8px;
    }

    .info-item {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 13px;
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .info-label {
      display: inline-block;
      color: rgba(255,255,255,0.38);
      font-weight: 500;
      min-width: 110px;
    }

    .info-value {
      color: rgba(255,255,255,0.78);
      font-weight: 700;
      direction: ltr;
      unicode-bidi: plaintext;
      word-break: break-word;
    }

    .warning-box {
      background: rgba(245,158,11,0.07);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 11px;
      padding: 13px 15px;
      margin: 20px 0;
    }

    .warning-box p {
      font-size: 13px;
      color: rgba(255,255,255,0.52);
      line-height: 1.8;
    }

    .warning-box strong {
      color: rgba(255,255,255,0.82);
    }

    .cta-wrap {
      text-align: center;
      margin: 24px 0;
    }

    .cta-btn {
      display: inline-block;
      padding: 13px 30px;
      border-radius: 11px;
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 20px rgba(37,99,235,0.4);
      letter-spacing: .02em;
    }

    .email-footer {
      background: #040910;
      padding: 22px 36px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .footer-logo {
      height: 24px;
      object-fit: contain;
      opacity: .35;
      margin-bottom: 10px;
    }

    .footer-links {
      margin-bottom: 10px;
    }

    .footer-links a {
      display: inline-block;
      margin: 0 8px 8px 8px;
      font-size: 12px;
      color: rgba(255,255,255,0.36);
      text-decoration: none;
      font-weight: 500;
    }

    .footer-copy {
      font-size: 11px;
      color: rgba(255,255,255,0.2);
      line-height: 1.7;
    }

    @media only screen and (max-width: 480px) {
      body {
        padding: 18px 10px;
      }

      .email-header,
      .email-body,
      .email-footer {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      .otp-digit {
        width: 48px !important;
        height: 56px !important;
        line-height: 56px !important;
        font-size: 26px !important;
        margin: 0 3px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrap">
    <div class="email-header">
      <div class="logo-area">
        <img
          src="https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/images/half_lens_logo_-_color.png"
          alt="Half Lens"
        />
        <div class="header-badge">Vendor Portal Access</div>
      </div>
    </div>

    <div class="email-body">
      <div class="greeting">مرحبًا،</div>
      <div class="body-text">
        تلقّينا طلبًا لتسجيل الدخول إلى حسابك في منصة <strong style="color:#ffffff;">Half Lens</strong>.
        استخدم رمز التحقق التالي لإكمال عملية الدخول بشكل آمن.
      </div>

      <div class="otp-container">
        <div class="otp-label">OTP Verification Code</div>
        <div class="otp-boxes">
          <span class="otp-digit">${digits[0]}</span>
          <span class="otp-digit">${digits[1]}</span>
          <span class="otp-digit">${digits[2]}</span>
          <span class="otp-digit">${digits[3]}</span>
        </div>
        <div class="otp-expiry">صالح لمدة 10 دقائق فقط</div>
      </div>

      <div class="warning-box">
        <p>
          <strong>تنبيه أمني:</strong>
          إذا لم تقم أنت بطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان. لا تشارك هذا الرمز مع أي شخص.
        </p>
      </div>

      <div class="info-row">
        <div class="info-title">تفاصيل الطلب</div>
        <div class="info-item">
          <span class="info-label">الوقت</span>
          <span class="info-value">${requestTime}</span>
        </div>
        <div class="info-item">
          <span class="info-label">البريد الإلكتروني</span>
          <span class="info-value">${email}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الجهاز</span>
          <span class="info-value">${deviceInfo}</span>
        </div>
      </div>

      <div class="cta-wrap">
        <a href="https://akcpkjzfhtmurtwzyzhn.supabase.co/vendor-login" class="cta-btn">
          الانتقال إلى صفحة تسجيل الدخول
        </a>
      </div>
    </div>

    <div class="email-footer">
      <img
        class="footer-logo"
        src="https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/images/half_lens_logo_-_color.png"
        alt="Half Lens"
      />
      <div class="footer-links">
        <a href="#">سياسة الخصوصية</a>
        <a href="#">شروط الاستخدام</a>
        <a href="#">تواصل معنا</a>
      </div>
      <div class="footer-copy">
        هذه رسالة آلية من نظام Half Lens لإدارة الموردين.<br />
        © 2024 Half Lens. جميع الحقوق محفوظة.
      </div>
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // TODO: Send email using SMTP service
    // For now, we'll log the OTP (in production, integrate with an email service)
    console.log(\`OTP for \${email}: \${otp}\`);
    console.log("Email HTML generated successfully");

    // In development, return the OTP for testing
    // REMOVE THIS IN PRODUCTION
    const isDevelopment = true;

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        ...(isDevelopment && { otp, email_preview: emailHtml }),
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