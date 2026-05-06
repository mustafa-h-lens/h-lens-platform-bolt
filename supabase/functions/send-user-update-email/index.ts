import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChangeEntry {
  field: string;
  old_value: string;
  new_value: string;
}

interface UpdateEmailRequest {
  user_id: string;
  changes: ChangeEntry[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const logoWhiteUrl =
  Deno.env.get("EMAIL_LOGO_URL") ||
  "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-white.png";
const logoBlueUrl =
  Deno.env.get("EMAIL_LOGO_BLUE_URL") ||
  "https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/email-assets/logo-blue.png";

function buildEmailHtml(
  userName: string,
  changedByName: string,
  changes: ChangeEntry[],
  dateStr: string,
): string {
  const fieldLabels: Record<string, string> = {
    full_name: "الاسم الكامل",
    phone: "رقم الجوال",
    role: "الدور",
    username: "اسم المستخدم",
  };

  const changesRows = changes
    .map(
      (c) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:13px;text-align:right;">${escapeHtml(fieldLabels[c.field] || c.field)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #1e293b;color:#ef4444;font-size:13px;text-align:right;text-decoration:line-through;">${escapeHtml(c.old_value || "—")}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #1e293b;color:#22c55e;font-size:13px;text-align:right;">${escapeHtml(c.new_value || "—")}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0b1437;color:#e2e8f0;}
  .container{max-width:600px;margin:0 auto;background:#0f1b3d;border-radius:12px;overflow:hidden;border:1px solid #1e293b;}
  /* Logo dark/light swap so the brand stays visible whether the client renders
     our intended dark header or force-inverts it to a light/white one. */
  @media (prefers-color-scheme: dark) {
    .logo-light { display: none !important; }
    .logo-dark  { display: inline-block !important; mso-hide: none !important; }
  }
  [data-ogsc] .logo-light { display: none !important; }
  [data-ogsc] .logo-dark  { display: inline-block !important; }
</style>
</head>
<body style="margin:0;padding:24px 0;background:#0b1437;">
<div class="container">
  <div style="background:#07112a;padding:32px 32px 24px;text-align:center;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" style="padding:0;border-radius:14px;">
          <!--[if !mso]><!-->
          <span class="logo-light" style="display:inline-block;line-height:0;">
            <img src="${logoBlueUrl}" alt="Half Lens" width="140" style="display:block;border:0;max-width:140px;height:auto;" />
          </span>
          <span class="logo-dark" style="display:none;line-height:0;mso-hide:all;">
            <img src="${logoWhiteUrl}" alt="Half Lens" width="140" style="display:block;border:0;max-width:140px;height:auto;" />
          </span>
          <!--<![endif]-->
          <!--[if mso]>
          <img src="${logoBlueUrl}" alt="Half Lens" width="140" style="display:block;border:0;max-width:140px;height:auto;" />
          <![endif]-->
        </td>
      </tr>
    </table>
    <div style="margin-top:16px;">
      <span style="display:inline-block;padding:6px 18px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:20px;font-size:13px;font-weight:700;color:#60a5fa;">تحديث الحساب</span>
    </div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;font-weight:700;color:#f1f5f9;margin:0 0 8px;">مرحباً ${escapeHtml(userName)}،</p>
    <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;line-height:1.7;">
      تم تحديث بيانات حسابك بواسطة <strong style="color:#f1f5f9;">${escapeHtml(changedByName)}</strong> بتاريخ ${dateStr}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e293b;border-radius:8px;overflow:hidden;border-collapse:collapse;">
      <thead>
        <tr style="background:#1e293b;">
          <th style="padding:10px 16px;font-size:12px;color:#64748b;text-align:right;font-weight:600;">الحقل</th>
          <th style="padding:10px 16px;font-size:12px;color:#64748b;text-align:right;font-weight:600;">القيمة السابقة</th>
          <th style="padding:10px 16px;font-size:12px;color:#64748b;text-align:right;font-weight:600;">القيمة الجديدة</th>
        </tr>
      </thead>
      <tbody>${changesRows}</tbody>
    </table>
    <p style="font-size:13px;color:#64748b;margin:24px 0 0;line-height:1.7;">
      إذا لم تكن على علم بهذه التغييرات، يرجى التواصل مع مدير النظام.
    </p>
  </div>
  <div style="background:#07112a;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;">
    <p style="font-size:11px;color:#475569;margin:0;">© ${new Date().getFullYear()} Half Lens — جميع الحقوق محفوظة</p>
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
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller is authenticated
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
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const {
      data: { user: callerUser },
      error: callerError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, changes } = (await req.json()) as UpdateEmailRequest;

    if (!user_id || !changes || changes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or changes" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the target user's details
    const { data: targetUser } = await serviceClient
      .from("users")
      .select("email, full_name")
      .eq("id", user_id)
      .maybeSingle();

    if (!targetUser?.email) {
      return new Response(
        JSON.stringify({ error: "User not found or has no email" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the admin's name (who made the change)
    const { data: adminProfile } = await serviceClient
      .from("users")
      .select("full_name")
      .eq("id", callerUser.id)
      .maybeSingle();

    const changedByName = adminProfile?.full_name || "مدير النظام";

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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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

    const html = buildEmailHtml(
      targetUser.full_name || targetUser.email,
      changedByName,
      changes,
      dateStr,
    );

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: targetUser.email,
      subject: "تم تحديث بيانات حسابك — Half Lens",
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-user-update-email error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
