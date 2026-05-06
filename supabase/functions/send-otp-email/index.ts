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
  const otpBox = (d) => `<td class="otp" align="center" valign="middle" width="48" height="56" bgcolor="#0a1024" style="width:48px;height:56px;background-color:#0a1024;border:2px solid #3b82f6;border-radius:10px;font-family:'JetBrains Mono',Courier,monospace;font-size:26px;font-weight:800;color:#60a5fa;">${d}</td>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>رمز التحقق - Half Lens</title>
  <style>
    :root { color-scheme: dark only; supported-color-schemes: dark only; }
    body { background-color: #0a1024 !important; }
    @media only screen and (max-width: 600px) {
      .pad  { padding: 18px 16px !important; }
      .otp  { width: 40px !important; height: 48px !important; font-size: 20px !important; }
      .sp   { width: 5px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a1024;font-family:'Cairo','Tajawal',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;">
  <div dir="ltr" style="display:none;font-size:1px;color:#0a1024;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    رمز التحقق الخاص بك: ${otp} — صالح لمدة 10 دقائق
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a1024" style="background-color:#0a1024;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d1428" style="max-width:560px;background-color:#0d1428;">

          <!-- Hero: rounded brand-color logo card -->
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
                <span style="display:inline-block;padding:8px 22px;border-radius:999px;border:1.5px solid rgba(96,165,250,0.5);color:#60a5fa;font-size:13px;font-weight:700;">&#128272; رمز التحقق</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="pad" align="center" style="padding:8px 32px 8px;">
              <h1 style="font-size:22px;font-weight:800;color:#f8fafc;margin:0 0 6px;" dir="rtl">مرحباً ${vendorName} &#128075;</h1>
              <p style="font-size:14px;color:#cbd5e1;line-height:1.85;margin:0 0 6px;" dir="rtl">تم طلب رمز تحقق لتسجيل الدخول إلى منصة هاف لينس.</p>
              <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin:0 0 22px;" dir="ltr">A login verification code has been requested for your account.</p>
            </td>
          </tr>

          <!-- OTP Boxes -->
          <tr>
            <td style="padding:4px 32px 8px;text-align:center;" dir="ltr">
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
            <td style="padding:14px 32px 4px;text-align:center;">
              <p style="font-size:13px;color:#94a3b8;margin:0;" dir="rtl">&#9201;&#65039; ينتهي هذا الرمز خلال <strong style="color:#f8fafc;">10 دقائق</strong></p>
            </td>
          </tr>

          <!-- Info Box -->
          <tr>
            <td class="pad" style="padding:18px 24px 4px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.15);border-radius:12px;">
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:#94a3b8;border-bottom:1px solid rgba(148,163,184,0.10);width:120px;" dir="rtl">&#128338; وقت الطلب</td>
                  <td style="padding:12px 18px;font-size:12px;color:#e2e8f0;font-weight:600;border-bottom:1px solid rgba(148,163,184,0.10);text-align:left;" dir="ltr">${requestTime}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:#94a3b8;border-bottom:1px solid rgba(148,163,184,0.10);" dir="rtl">&#128231; البريد</td>
                  <td style="padding:12px 18px;font-size:12px;color:#e2e8f0;font-weight:600;border-bottom:1px solid rgba(148,163,184,0.10);text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="ltr">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:12px;color:#94a3b8;" dir="rtl">&#128187; الجهاز</td>
                  <td style="padding:12px 18px;font-size:12px;color:#e2e8f0;font-weight:600;text-align:left;" dir="ltr">${deviceInfo}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td class="pad" style="padding:14px 24px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#fbbf24;line-height:1.7;" dir="rtl">
                    &#9888;&#65039; لا تشارك هذا الرمز مع أي شخص. فريق هاف لينس لن يطلب منك رمز التحقق أبداً.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Outlined CTA -->
          <tr>
            <td align="center" style="padding:22px 32px 8px;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 56px;border-radius:12px;border:1.5px solid #60a5fa;color:#60a5fa;font-size:14px;font-weight:700;text-decoration:none;font-family:'Cairo','Tajawal',Arial,sans-serif;">
                صفحة تسجيل الدخول &#9665;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:32px 32px 36px;">
              <div style="font-size:11px;color:#64748b;line-height:1.9;margin-bottom:6px;">
                <a href="${baseUrl}" style="color:#60a5fa;text-decoration:none;margin:0 6px;">الموقع</a>
                <span style="color:#475569;">·</span>
                <a href="${baseUrl}/privacy" style="color:#60a5fa;text-decoration:none;margin:0 6px;">سياسة السرّية</a>
                <span style="color:#475569;">·</span>
                <a href="${baseUrl}/terms" style="color:#60a5fa;text-decoration:none;margin:0 6px;">الشروط</a>
              </div>
              <p style="font-size:11px;color:#64748b;margin:0;" dir="rtl">&copy; ${new Date().getFullYear()} Half Lens Production — جميع الحقوق محفوظة</p>
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
    :root { color-scheme: dark only; supported-color-schemes: dark only; }
    body { background-color: #0a1024 !important; }
    @media only screen and (max-width: 600px) {
      .pad { padding: 18px 16px !important; }
    }
  </style>
</head>
<body bgcolor="#0a1024" style="margin:0;padding:0;background-color:#0a1024;font-family:'Cairo','Tajawal',Arial,sans-serif;direction:rtl;">
  <!-- Preheader -->
  <div dir="rtl" style="display:none;font-size:1px;color:#0a1024;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    أهلاً ${entityName} — تم تفعيل بوابة العميل الخاصة بك
    ${"&zwnj;&nbsp;".repeat(30)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a1024" style="background-color:#0a1024;">
    <tr>
      <td align="center" bgcolor="#0a1024" style="padding:0;background-color:#0a1024;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d1428" style="max-width:560px;background-color:#0d1428;">

          <!-- Hero: rounded brand-color logo card -->
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
                <span style="display:inline-block;padding:8px 22px;border-radius:999px;border:1.5px solid rgba(52,211,153,0.5);color:#34d399;font-size:13px;font-weight:700;">&#127881; دعوة لبوابة العميل</span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="pad" align="center" style="padding:8px 32px 8px;">
              <h1 style="font-size:22px;font-weight:800;color:#f8fafc;margin:0 0 6px;" dir="rtl">أهلاً وسهلاً ${entityName} &#128075;</h1>
              <p style="font-size:14px;color:#cbd5e1;line-height:1.85;margin:0 0 6px;" dir="rtl">يسعدنا دعوتك للانضمام إلى بوابة العملاء الخاصة بنا. تم تفعيل حسابك ويمكنك الآن الاطلاع على كل ما يخص مشاريعك.</p>
              <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin:0 0 22px;" dir="ltr">Welcome ${entityName}! Your client portal is ready — track your projects, invoices, and deliverables in one place.</p>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td class="pad" style="padding:0 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(148,163,184,0.15);border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(148,163,184,0.10);">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" style="width:36px;height:36px;background:rgba(37,99,235,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:16px;">&#128202;</td>
                      <td style="padding-right:14px;font-size:14px;color:#cbd5e1;line-height:1.6;">متابعة حالة المشاريع ومراحل التنفيذ</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(148,163,184,0.10);">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" style="width:36px;height:36px;background:rgba(16,185,129,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:16px;">&#128179;</td>
                      <td style="padding-right:14px;font-size:14px;color:#cbd5e1;line-height:1.6;">الاطلاع على الفواتير وحالة المدفوعات</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" style="width:36px;height:36px;background:rgba(124,58,237,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:16px;">&#127919;</td>
                      <td style="padding-right:14px;font-size:14px;color:#cbd5e1;line-height:1.6;">استعراض المراحل والتسليمات لكل مشروع</td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Outlined CTA -->
          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <a href="${portalUrl}" style="display:inline-block;padding:14px 56px;border-radius:12px;border:1.5px solid #34d399;color:#34d399;font-size:14px;font-weight:700;text-decoration:none;font-family:'Cairo','Tajawal',Arial,sans-serif;">
                &#127760; الدخول إلى بوابة العميل
              </a>
            </td>
          </tr>

          <!-- How to login -->
          <tr>
            <td class="pad" style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(148,163,184,0.15);background:rgba(255,255,255,0.02);border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="font-size:13px;font-weight:700;color:#cbd5e1;margin:0 0 10px;text-align:right;">&#128161; كيفية تسجيل الدخول:</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8;line-height:1.8;text-align:right;">١. اضغط على الزر أعلاه للدخول إلى بوابة العميل</td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8;line-height:1.8;text-align:right;">٢. أدخل بريدك الإلكتروني: <span dir="ltr" style="color:#60a5fa;font-weight:600;">${normalizedEmail}</span></td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8;line-height:1.8;text-align:right;">٣. ستصلك رسالة برمز تحقق مكون من 6 أرقام</td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8;line-height:1.8;text-align:right;">٤. أدخل الرمز وسيتم تسجيل دخولك تلقائياً</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:32px 32px 36px;">
              <div style="font-size:11px;color:#64748b;line-height:1.9;margin-bottom:6px;">
                <a href="${appOrigin}" style="color:#60a5fa;text-decoration:none;margin:0 6px;">الموقع</a>
                <span style="color:#475569;">·</span>
                <a href="${appOrigin}/privacy" style="color:#60a5fa;text-decoration:none;margin:0 6px;">سياسة السرّية</a>
                <span style="color:#475569;">·</span>
                <a href="${appOrigin}/terms" style="color:#60a5fa;text-decoration:none;margin:0 6px;">الشروط</a>
              </div>
              <p style="font-size:11px;color:#64748b;margin:0;">&copy; 2026 Half Lens Production — جميع الحقوق محفوظة</p>
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