import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OTPRequest {
  email: string;
  deviceInfo?: string;
  portal_type?: 'vendor' | 'client';
  invite_only?: boolean;
}

// Generate 6-digit OTP using cryptographically secure random
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (100000 + (array[0] % 900000)).toString();
}

// Email template
function getEmailTemplate(
  otp: string,
  email: string,
  deviceInfo: string,
  requestTime: string,
  loginUrl: string,
  vendorName: string,
): string {
  const digits = otp.padStart(6, "0").slice(0, 6).split("");
  const logoWhiteUrl = Deno.env.get("EMAIL_LOGO_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-white.png";
  const logoBlueUrl = Deno.env.get("EMAIL_LOGO_BLUE_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-blue.png";
  const rawUrl = Deno.env.get("APP_LOGIN_URL") || Deno.env.get("APP_BASE_URL") || "#";
  let baseUrl = rawUrl;
  try { baseUrl = new URL(rawUrl).origin; } catch { baseUrl = rawUrl.replace(/\/[^/]*$/, '') || rawUrl; }

  // Self-contained light theme (solid colors, no RGBA, color-scheme: light only)
  // so Gmail/Outlook dark modes don't auto-invert the OTP boxes into invisible
  // states. Each digit gets its own opaque-bg box with high contrast text — all
  // 6 are guaranteed to render.
  const otpBox = (d) => `<td class="otp" align="center" valign="middle" width="48" height="56" bgcolor="#eff6ff" style="width:48px;height:56px;background-color:#eff6ff;border:2px solid #1e40af;border-radius:10px;font-family:'JetBrains Mono',Courier,monospace;font-size:26px;font-weight:800;color:#1e40af;">${d}</td>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>رمز التحقق - Half Lens</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none !important; }
      .logo-dark  { display: inline-block !important; mso-hide: none !important; }
    }
    [data-ogsc] .logo-light { display: none !important; }
    [data-ogsc] .logo-dark  { display: inline-block !important; }
    @media only screen and (max-width: 600px) {
      .card { border-radius: 0 !important; }
      .pad  { padding: 20px 16px !important; }
      .hdr  { padding: 24px 16px 20px !important; }
      .ftr  { padding: 20px 16px !important; }
      .otp  { width: 40px !important; height: 48px !important; font-size: 20px !important; }
      .sp   { width: 5px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Cairo',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;">
  <div dir="ltr" style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    رمز التحقق الخاص بك: ${otp} — صالح لمدة 10 دقائق
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table class="card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header — dark navy banner card with white logo -->
          <tr>
            <td class="hdr" bgcolor="#ffffff" style="background-color:#ffffff;padding:24px 24px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#0a1024" style="background-color:#0a1024;padding:44px 32px;border-radius:18px;">
                    <img src="${logoWhiteUrl}" alt="Half Lens" width="200" style="display:block;border:0;width:200px;max-width:200px;height:auto;margin:0 auto 16px;" />
                    <span style="display:inline-block;padding:7px 20px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);border-radius:999px;font-size:13px;font-weight:700;color:#ffffff;">&#128272; رمز التحقق</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="pad" style="padding:32px 32px 8px;background-color:#ffffff;">
              <p style="font-size:18px;font-weight:700;color:#111827;margin:0 0 10px;" dir="rtl">مرحباً ${vendorName} &#128075;</p>
              <p style="font-size:14px;color:#4b5563;line-height:1.85;margin:0 0 22px;" dir="rtl">تم طلب رمز تحقق لتسجيل الدخول إلى منصة هاف لينس. استخدم الرمز التالي:</p>
            </td>
          </tr>

          <!-- OTP Boxes (always 6, opaque bg + high contrast) -->
          <tr>
            <td style="padding:4px 32px 8px;text-align:center;background-color:#ffffff;" dir="ltr">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" dir="ltr" style="margin:0 auto;direction:ltr;">
                <tr dir="ltr">
                  ${otpBox(digits[0])}<td class="sp" width="8" style="width:8px;"></td>
                  ${otpBox(digits[1])}<td class="sp" width="8" style="width:8px;"></td>
                  ${otpBox(digits[2])}<td class="sp" width="8" style="width:8px;"></td>
                  ${otpBox(digits[3])}<td class="sp" width="8" style="width:8px;"></td>
                  ${otpBox(digits[4])}<td class="sp" width="8" style="width:8px;"></td>
                  ${otpBox(digits[5])}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry -->
          <tr>
            <td style="padding:14px 32px 4px;text-align:center;background-color:#ffffff;">
              <p style="font-size:13px;color:#6b7280;margin:0;" dir="rtl">&#9201;&#65039; ينتهي هذا الرمز خلال <strong style="color:#111827;">10 دقائق</strong></p>
            </td>
          </tr>

          <!-- Info Box -->
          <tr>
            <td class="pad" style="padding:18px 32px 4px;background-color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9fafb" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:120px;" dir="rtl">&#128338; وقت الطلب</td>
                  <td style="padding:12px 18px;font-size:12px;color:#374151;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:left;" dir="ltr">${requestTime}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;" dir="rtl">&#128231; البريد</td>
                  <td style="padding:12px 18px;font-size:12px;color:#374151;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="ltr">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:#6b7280;" dir="rtl">&#128187; الجهاز</td>
                  <td style="padding:12px 18px;font-size:12px;color:#374151;font-weight:600;text-align:left;" dir="ltr">${deviceInfo}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td class="pad" style="padding:14px 32px 0;background-color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fef3c7" style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#92400e;line-height:1.7;" dir="rtl">
                    &#9888;&#65039; لا تشارك هذا الرمز مع أي شخص. فريق هاف لينس لن يطلب منك رمز التحقق أبداً عبر الهاتف أو البريد.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:22px 32px 28px;background-color:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td bgcolor="#1e40af" style="background-color:#1e40af;border-radius:10px;">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:'Cairo',Arial,sans-serif;">
                      الذهاب إلى صفحة تسجيل الدخول &#9665;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="ftr" align="center" bgcolor="#f9fafb" style="background-color:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:11px;color:#6b7280;line-height:1.7;" dir="rtl">
                هذه الرسالة مرسلة تلقائياً من منصة Half Lens. لا ترد عليها مباشرةً.
              </p>
              <div style="font-size:11px;line-height:2;">
                <a href="${baseUrl}" style="color:#2563eb;text-decoration:none;margin:0 8px;">الموقع الالكتروني</a>
                <a href="${baseUrl}/privacy" style="color:#2563eb;text-decoration:none;margin:0 8px;">سياسة الخصوصية</a>
                <a href="${baseUrl}/terms" style="color:#2563eb;text-decoration:none;margin:0 8px;">الشروط والأحكام</a>
              </div>
              <p style="font-size:10px;color:#9ca3af;margin:6px 0 0;" dir="rtl">هاف لينس &copy; ${new Date().getFullYear()} — جميع الحقوق محفوظة</p>
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

    const { email, deviceInfo = "غير معروف", portal_type = "vendor", invite_only = false }: OTPRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists based on portal type
    let entityName = "";

    if (portal_type === "client") {
      // Client portal: lookup in clients table by email or portal_email
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, email, name, portal_email, invitation_status")
        .or(`email.eq.${normalizedEmail},portal_email.eq.${normalizedEmail}`)
        .maybeSingle();

      if (clientError) {
        console.error("Client lookup error:", clientError);
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء التحقق من البريد الإلكتروني" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!client) {
        return new Response(
          JSON.stringify({ error: "العميل غير موجود في النظام. يرجى التواصل مع مدير المشروع" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (client.invitation_status === "not_invited") {
        return new Response(
          JSON.stringify({ error: "لم يتم تفعيل بوابة العميل لحسابك بعد. يرجى التواصل مع مدير المشروع" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      entityName = client.name;
    } else {
      // Vendor portal: lookup in vendors table
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

      if (vendor.status && vendor.status !== "active" && vendor.status !== "revision_requested") {
        const message = statusGateMessages[vendor.status] || "لا يمكنك تسجيل الدخول حالياً. يرجى التواصل مع الدعم.";
        return new Response(
          JSON.stringify({ error: message }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      entityName = vendor.full_name;
    }

    // ── INVITE ONLY MODE: Send welcome email without OTP ──
    if (invite_only && portal_type === "client") {
      const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || Deno.env.get("APP_BASE_URL") || "";
      let appOrigin = appLoginUrl;
      try { appOrigin = new URL(appLoginUrl).origin; } catch { appOrigin = appLoginUrl.replace(/\/[^/]*$/, '') || appLoginUrl; }
      const portalUrl = `${appOrigin}/client`;

      const smtpHost = Deno.env.get("SMTP_HOST");
      const smtpPort = Deno.env.get("SMTP_PORT");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPassword = Deno.env.get("SMTP_PASSWORD");
      const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
      const smtpFromName = Deno.env.get("SMTP_FROM_NAME");

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFromEmail || !smtpFromName) {
        return new Response(
          JSON.stringify({ error: "إعدادات البريد الإلكتروني غير مكتملة" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const logoW = Deno.env.get("EMAIL_LOGO_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-white.png";

      const logoWhiteUrl = Deno.env.get("EMAIL_LOGO_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-white.png";
      const logoBlueUrl = Deno.env.get("EMAIL_LOGO_BLUE_URL") || "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-blue.png";

      const inviteHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>دعوة لبوابة العميل - Half Lens</title>
  <style>
    :root { color-scheme: light dark; }
    /* Logo dark/light swap so the logo stays visible whether the email client
       renders our intended dark header or force-inverts it to light. */
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none !important; }
      .logo-dark  { display: inline-block !important; mso-hide: none !important; }
    }
    [data-ogsc] .logo-light { display: none !important; }
    [data-ogsc] .logo-dark  { display: inline-block !important; }
    @media only screen and (max-width: 600px) {
      .card { border-radius: 0 !important; }
      .pad { padding: 20px 16px !important; }
      .hdr { padding: 24px 16px 20px !important; }
      .ftr { padding: 20px 16px !important; }
    }
  </style>
</head>
<body bgcolor="#030b1a" style="margin:0;padding:0;background-color:#030b1a;font-family:'Cairo',Arial,sans-serif;direction:rtl;">
  <!-- Preheader -->
  <div dir="rtl" style="display:none;font-size:1px;color:#030b1a;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    أهلاً ${entityName} — تم تفعيل بوابة العميل الخاصة بك
    ${"&zwnj;&nbsp;".repeat(30)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#030b1a" style="background-color:#030b1a;">
    <tr>
      <td align="center" bgcolor="#030b1a" style="padding:24px 12px;background-color:#030b1a;">
        <table class="card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#060d1e" style="max-width:600px;background-color:#060d1e;border-radius:8px;overflow:hidden;">

          <!-- Header — dark navy banner card with white logo -->
          <tr>
            <td class="hdr" bgcolor="#ffffff" style="background-color:#ffffff;padding:24px 24px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#0a1024" style="background-color:#0a1024;padding:44px 32px;border-radius:18px;">
                    <img src="${logoWhiteUrl}" alt="Half Lens" width="200" style="display:block;border:0;width:200px;max-width:200px;height:auto;margin:0 auto 16px;" />
                    <span style="display:inline-block;padding:7px 20px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);border-radius:999px;font-size:13px;font-weight:700;color:#ffffff;">&#127881; دعوة لبوابة العميل</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="pad" style="padding:32px 32px 0;">
              <p style="font-size:20px;font-weight:800;color:#f0f4ff;margin:0 0 10px;text-align:right;">أهلاً وسهلاً ${entityName} &#128075;</p>
              <p style="font-size:14px;color:rgba(200,215,255,0.65);line-height:1.9;margin:0 0 24px;text-align:right;">يسعدنا دعوتك للانضمام إلى بوابة العملاء الخاصة بنا. تم تفعيل حسابك ويمكنك الآن الاطلاع على كل ما يخص مشاريعك في مكان واحد.</p>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td class="pad" style="padding:0 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" style="width:36px;height:36px;background:rgba(37,99,235,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:16px;">&#128202;</td>
                      <td style="padding-right:14px;font-size:14px;color:rgba(200,215,255,0.85);line-height:1.6;">متابعة حالة المشاريع ومراحل التنفيذ</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" style="width:36px;height:36px;background:rgba(16,185,129,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:16px;">&#128179;</td>
                      <td style="padding-right:14px;font-size:14px;color:rgba(200,215,255,0.85);line-height:1.6;">الاطلاع على الفواتير وحالة المدفوعات</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" style="width:36px;height:36px;background:rgba(124,58,237,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:16px;">&#127919;</td>
                      <td style="padding-right:14px;font-size:14px;color:rgba(200,215,255,0.85);line-height:1.6;">استعراض المراحل والتسليمات لكل مشروع</td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:28px 32px;text-align:center;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${portalUrl}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="19%" fillcolor="#2563eb" stroke="f">
                <w:anchorlock/><center style="color:#ffffff;font-family:Cairo,Arial,sans-serif;font-size:15px;font-weight:bold;">الدخول إلى بوابة العميل</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${portalUrl}" style="display:inline-block;padding:15px 48px;background:#2563eb;color:#ffffff !important;font-size:15px;font-weight:800;border-radius:10px;text-decoration:none;box-shadow:0 4px 20px rgba(37,99,235,0.35);mso-hide:all;letter-spacing:0.3px;"><span style="color:#ffffff !important;">&#127760; الدخول إلى بوابة العميل</span></a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- How to login -->
          <tr>
            <td class="pad" style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="font-size:13px;font-weight:700;color:rgba(200,215,255,0.85);margin:0 0 10px;text-align:right;">&#128161; كيفية تسجيل الدخول:</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr><td style="padding:4px 0;font-size:13px;color:rgba(200,215,255,0.6);line-height:1.8;text-align:right;">١. اضغط على الزر أعلاه للدخول إلى بوابة العميل</td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:rgba(200,215,255,0.6);line-height:1.8;text-align:right;">٢. أدخل بريدك الإلكتروني: <span dir="ltr" style="color:#60a5fa;font-weight:600;">${normalizedEmail}</span></td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:rgba(200,215,255,0.6);line-height:1.8;text-align:right;">٣. ستصلك رسالة برمز تحقق مكون من 6 أرقام</td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:rgba(200,215,255,0.6);line-height:1.8;text-align:right;">٤. أدخل الرمز وسيتم تسجيل دخولك تلقائياً</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="ftr" align="center" bgcolor="#f8fafc" style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e5e7eb;">
              <img src="${logoBlueUrl}" alt="Half Lens" width="100" style="display:inline-block;border:0;max-width:100px;height:auto;opacity:0.85;" />
              <div style="margin-top:12px;font-size:11px;color:#3b82f6;line-height:2;">
                <a href="${appOrigin}" style="color:#3b82f6;text-decoration:none;margin:0 8px;">الموقع الالكتروني</a>
                <a href="${appOrigin}/privacy" style="color:#3b82f6;text-decoration:none;margin:0 8px;">سياسة الخصوصية</a>
                <a href="${appOrigin}/terms" style="color:#3b82f6;text-decoration:none;margin:0 8px;">الشروط والأحكام</a>
              </div>
              <p style="font-size:10px;color:#64748b;margin:8px 0 0;">Half Lens &copy; 2026 — جميع الحقوق محفوظة</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const port = Number(smtpPort);
      const transporter = createTransport({
        host: smtpHost, port, secure: port === 465,
        auth: { user: smtpUser, pass: smtpPassword },
      });

      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFromEmail}>`,
        to: normalizedEmail,
        subject: "دعوة للوصول إلى بوابة العميل - Half Lens",
        html: inviteHtml,
      });

      return new Response(
        JSON.stringify({ success: true, message: "تم إرسال دعوة العميل بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // Daily cap: max 10 OTPs per email per 24 hours
    const { count: dailyCount } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (dailyCount && dailyCount >= 10) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد الأقصى لطلبات رمز التحقق اليومية. يرجى المحاولة غداً" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Invalidate all existing unused OTPs for this email
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", normalizedEmail)
      .eq("used", false);

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

    // Current time in English format
    const now = new Date();
    const requestTime = now.toLocaleString("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || Deno.env.get("APP_BASE_URL") || "";
    // Extract base domain (strip any path like /vendor-login)
    let appBase = appLoginUrl;
    try {
      const url = new URL(appLoginUrl);
      appBase = url.origin;
    } catch {
      // If not a valid URL, try stripping last path segment
      appBase = appLoginUrl.replace(/\/[^/]*$/, '') || appLoginUrl;
    }
    const loginUrl = portal_type === "client"
      ? `${appBase}/client`
      : `${appBase}/vendor/login`;

    const emailHtml = getEmailTemplate(
      otp,
      normalizedEmail,
      deviceInfo,
      requestTime,
      loginUrl,
      entityName || "",
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