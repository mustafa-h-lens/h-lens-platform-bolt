import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Shared email template helpers (matching vendor email design) ──

const logoWhiteUrl =
  Deno.env.get("EMAIL_LOGO_URL") ||
  "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-white.png";
const logoBlueUrl =
  Deno.env.get("EMAIL_LOGO_BLUE_URL") ||
  "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-blue.png";
const baseUrl = Deno.env.get("APP_BASE_URL") || "https://platform.h-lens.co";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baseHeader(badge: string, badgeBg: string, badgeBorder: string, badgeColor: string): string {
  return `
  <tr>
    <td class="eh" align="center" bgcolor="#07112a" style="background-color:#07112a;padding:32px 32px 24px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 16px auto;">
        <tr>
          <td align="center" style="padding:0;border-radius:14px;">
            <!--[if !mso]><!-->
            <span class="logo-light" style="display:inline-block;line-height:0;">
              <img src="${logoBlueUrl}" alt="Half Lens" width="160" style="display:block;border:0;max-width:160px;height:auto;" />
            </span>
            <span class="logo-dark" style="display:none;line-height:0;mso-hide:all;">
              <img src="${logoWhiteUrl}" alt="Half Lens" width="160" style="display:block;border:0;max-width:160px;height:auto;" />
            </span>
            <!--<![endif]-->
            <!--[if mso]>
            <img src="${logoBlueUrl}" alt="Half Lens" width="160" style="display:block;border:0;max-width:160px;height:auto;" />
            <![endif]-->
          </td>
        </tr>
      </table>
      <div style="margin-top:16px;">
        <span style="display:inline-block;padding:6px 18px;background:${badgeBg};border:1px solid ${badgeBorder};border-radius:20px;font-size:13px;font-weight:700;color:${badgeColor};">${badge}</span>
      </div>
    </td>
  </tr>`;
}

function baseFooter(): string {
  return `
  <tr>
    <td class="ef" align="center" bgcolor="#040910" style="background-color:#040910;padding:24px 32px;border-top:1px solid rgba(255,255,255,0.05);">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
        <tr>
          <td align="center" style="padding:0;border-radius:10px;">
            <!--[if !mso]><!-->
            <span class="logo-light" style="display:inline-block;line-height:0;">
              <img src="${logoBlueUrl}" alt="Half Lens" width="100" style="display:block;border:0;max-width:100px;height:auto;opacity:0.7;" />
            </span>
            <span class="logo-dark" style="display:none;line-height:0;mso-hide:all;">
              <img src="${logoWhiteUrl}" alt="Half Lens" width="100" style="display:block;border:0;max-width:100px;height:auto;opacity:0.55;" />
            </span>
            <!--<![endif]-->
            <!--[if mso]>
            <img src="${logoBlueUrl}" alt="Half Lens" width="100" style="display:block;border:0;max-width:100px;height:auto;opacity:0.7;" />
            <![endif]-->
          </td>
        </tr>
      </table>
      <div class="footer-links-dark" style="margin-top:12px;font-size:11px;color:rgba(200,215,255,0.3);line-height:2;">
        <a href="${baseUrl}" style="color:rgba(200,215,255,0.4);text-decoration:none;margin:0 8px;">الموقع الالكتروني</a>
      </div>
      <p style="font-size:10px;color:rgba(200,215,255,0.2);margin:8px 0 0;">هاف لينس &copy; ${new Date().getFullYear()} — جميع الحقوق محفوظة</p>
    </td>
  </tr>`;
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

function wrapTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body, .ew { background-color: #030b1a !important; }
    .ec { background-color: #060d1e !important; }
    .eh { background-color: #07112a !important; }
    .ef { background-color: #040910 !important; }
    .et { color: #f0f4ff !important; }
    .es { color: rgba(200,215,255,0.6) !important; }
    /* Logo dark/light swap — visible whether the email client renders our
       intended dark header or force-inverts it to light. */
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none !important; }
      .logo-dark  { display: inline-block !important; mso-hide: none !important; }
    }
    [data-ogsc] .logo-light { display: none !important; }
    [data-ogsc] .logo-dark  { display: inline-block !important; }
    u + .eb .logo-light { display: none !important; }
    u + .eb .logo-dark  { display: inline-block !important; }
    @media only screen and (max-width: 600px) {
      .ec { border-radius: 0 !important; }
      .ep { padding: 20px 16px !important; }
      .eh { padding: 24px 16px 20px !important; }
      .ef { padding: 20px 16px !important; }
    }
  </style>
</head>
<body class="eb" bgcolor="#030b1a" style="margin:0;padding:0;background-color:#030b1a;font-family:'Cairo',Arial,'Segoe UI',Tahoma,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table class="ew" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#030b1a" style="background-color:#030b1a;margin:0;padding:0;">
    <tr>
      <td align="center" bgcolor="#030b1a" style="padding:24px 12px;background-color:#030b1a;">
        <table class="ec" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#060d1e" style="max-width:600px;background-color:#060d1e;border-radius:8px;overflow:hidden;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildInviteEmail(
  userName: string,
  inviterName: string,
  roleName: string,
  inviteUrl: string,
  dateStr: string,
): { subject: string; html: string } {
  const content = `
    ${baseHeader("&#128100; دعوة للانضمام", "rgba(37,99,235,0.12)", "rgba(37,99,235,0.25)", "#60a5fa")}
    <tr>
      <td class="ep" style="padding:32px 32px 0;color:#f0f4ff;">
        <p class="et" style="font-size:18px;font-weight:700;color:#f0f4ff;margin:0 0 8px;">مرحباً ${escapeHtml(userName)} &#128075;</p>
        <p class="es" style="font-size:14px;color:rgba(200,215,255,0.6);line-height:1.8;margin:0 0 24px;">
          تمت دعوتك للانضمام إلى منصة <strong style="color:#60a5fa;">هاف لينس</strong> بواسطة <strong style="color:#f0f4ff;">${escapeHtml(inviterName)}</strong>.
          يمكنك البدء بتفعيل حسابك من خلال الزر أدناه.
        </p>
      </td>
    </tr>
    <tr>
      <td class="ep" style="padding:0 32px 28px;">
        ${infoBox([
          { label: "&#128100; الاسم", value: escapeHtml(userName) },
          { label: "&#128188; الدور", value: escapeHtml(roleName) },
          { label: "&#128197; تاريخ الدعوة", value: dateStr },
        ])}
        ${ctaButton("تفعيل الحساب والبدء &#8592;", inviteUrl)}
        <p style="font-size:12px;color:rgba(200,215,255,0.35);margin:20px 0 0;text-align:center;line-height:1.6;">
          هذا الرابط صالح لمدة 24 ساعة. إذا لم تقم بتفعيل حسابك خلال هذه المدة، يرجى التواصل مع مدير النظام.
        </p>
      </td>
    </tr>
    ${baseFooter()}`;

  return {
    subject: "دعوة للانضمام إلى منصة هاف لينس — Half Lens",
    html: wrapTemplate(content, "دعوة للانضمام إلى منصة هاف لينس"),
  };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user: callerUser }, error: callerError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await serviceClient
      .from("users")
      .select("role, role_id, is_active, full_name, roles(is_system)")
      .eq("id", callerUser.id)
      .maybeSingle();

    const isAdmin =
      callerProfile?.is_active &&
      (callerProfile.role === "super_admin" ||
        callerProfile.role === "project_manager" ||
        callerProfile.role_id != null);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, username, phone, role_id, role, send_invite } = await req.json();

    if (!email || !password || !full_name || !role_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always create user directly with confirmed email — we handle the invite email ourselves
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get role name for the email
    const { data: roleData } = await serviceClient
      .from("roles")
      .select("name")
      .eq("id", role_id)
      .maybeSingle();

    const { error: profileError } = await serviceClient.from("users").insert({
      id: authData.user.id,
      email,
      full_name,
      username: username || null,
      phone: phone || null,
      role: role || "project_manager",
      role_id,
    });

    if (profileError) {
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send custom invite email if requested
    if (send_invite) {
      try {
        const smtpHost = Deno.env.get("SMTP_HOST");
        const smtpPort = Deno.env.get("SMTP_PORT");
        const smtpUser = Deno.env.get("SMTP_USER");
        const smtpPassword = Deno.env.get("SMTP_PASSWORD");
        const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
        const smtpFromName = Deno.env.get("SMTP_FROM_NAME");

        if (smtpHost && smtpPort && smtpUser && smtpPassword && smtpFromEmail && smtpFromName) {
          // Generate a magic link for the new user
          const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
            type: "magiclink",
            email,
          });

          const siteUrl = Deno.env.get("SITE_URL") || "https://platform.h-lens.co";
          let inviteUrl = siteUrl;

          if (!linkError && linkData?.properties?.action_link) {
            inviteUrl = linkData.properties.action_link;
          }

          const now = new Date();
          const dateStr = now.toLocaleString("ar-SA", {
            timeZone: "Asia/Riyadh",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const inviterName = callerProfile?.full_name || "مدير النظام";
          const roleName = roleData?.name || role || "مستخدم";

          const { subject, html } = buildInviteEmail(
            full_name,
            inviterName,
            roleName,
            inviteUrl,
            dateStr,
          );

          const port = Number(smtpPort);
          const transporter = createTransport({
            host: smtpHost,
            port,
            secure: port === 465,
            auth: { user: smtpUser, pass: smtpPassword },
          });

          await transporter.sendMail({
            from: `"${smtpFromName}" <${smtpFromEmail}>`,
            to: email,
            subject,
            html,
          });
        }
      } catch (emailErr) {
        // User was created successfully — don't fail if email fails
        console.error("Failed to send invite email:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
