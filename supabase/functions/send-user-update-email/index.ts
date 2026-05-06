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
        <td style="padding:10px 16px;border-bottom:1px solid rgba(148,163,184,0.10);color:#cbd5e1;font-size:13px;text-align:right;">${escapeHtml(fieldLabels[c.field] || c.field)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(148,163,184,0.10);color:#fca5a5;font-size:13px;text-align:right;text-decoration:line-through;">${escapeHtml(c.old_value || "—")}</td>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(148,163,184,0.10);color:#86efac;font-size:13px;text-align:right;">${escapeHtml(c.new_value || "—")}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
</head>
<body style="margin:0;padding:0;background:#0a1024;font-family:'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a1024" style="background-color:#0a1024;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d1428" style="max-width:560px;background-color:#0d1428;">
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
              <span style="display:inline-block;padding:8px 22px;border-radius:999px;border:1.5px solid rgba(96,165,250,0.5);color:#60a5fa;font-size:13px;font-weight:700;">تحديث الحساب</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 32px 8px;">
            <h1 style="font-size:22px;font-weight:800;color:#f8fafc;margin:0 0 6px;" dir="rtl">مرحباً ${escapeHtml(userName)} &#128075;</h1>
            <p style="font-size:14px;color:#cbd5e1;line-height:1.85;margin:0 0 6px;" dir="rtl">
              تم تحديث بيانات حسابك بواسطة <strong style="color:#f8fafc;">${escapeHtml(changedByName)}</strong> بتاريخ ${dateStr}.
            </p>
            <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin:0 0 22px;" dir="ltr">
              Your account has been updated by an administrator.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(148,163,184,0.15);border-radius:12px;overflow:hidden;border-collapse:collapse;background:rgba(148,163,184,0.06);">
              <thead>
                <tr style="background:rgba(148,163,184,0.10);">
                  <th style="padding:10px 16px;font-size:12px;color:#94a3b8;text-align:right;font-weight:700;">الحقل</th>
                  <th style="padding:10px 16px;font-size:12px;color:#94a3b8;text-align:right;font-weight:700;">القيمة السابقة</th>
                  <th style="padding:10px 16px;font-size:12px;color:#94a3b8;text-align:right;font-weight:700;">القيمة الجديدة</th>
                </tr>
              </thead>
              <tbody>${changesRows}</tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 32px 0;">
            <p style="font-size:13px;color:#94a3b8;margin:0;line-height:1.7;">
              إذا لم تكن على علم بهذه التغييرات، يرجى التواصل مع مدير النظام.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:32px 32px 36px;">
            <p style="font-size:11px;color:#64748b;margin:0;line-height:1.7;">© ${new Date().getFullYear()} Half Lens Production — جميع الحقوق محفوظة</p>
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
