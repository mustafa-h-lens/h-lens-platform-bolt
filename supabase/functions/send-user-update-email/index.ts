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
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#475569;font-size:13px;text-align:right;">${escapeHtml(fieldLabels[c.field] || c.field)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-size:13px;text-align:right;text-decoration:line-through;">${escapeHtml(c.old_value || "—")}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-size:13px;text-align:right;">${escapeHtml(c.new_value || "—")}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
</head>
<body style="margin:0;padding:24px 0;background:#f3f4f6;font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#ffffff;padding:24px 24px 0;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="margin:0 auto;">
      <tr>
        <td align="center" bgcolor="#0a1024" style="background-color:#0a1024;padding:44px 32px;border-radius:18px;">
          <img src="${logoWhiteUrl}" alt="Half Lens" width="200" style="display:block;border:0;width:200px;max-width:200px;height:auto;margin:0 auto 16px;" />
          <span style="display:inline-block;padding:7px 20px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);border-radius:999px;font-size:13px;font-weight:700;color:#ffffff;">تحديث الحساب</span>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:28px 32px;background:#ffffff;">
    <p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 8px;">مرحباً ${escapeHtml(userName)}،</p>
    <p style="font-size:14px;color:#475569;margin:0 0 22px;line-height:1.7;">
      تم تحديث بيانات حسابك بواسطة <strong style="color:#0f172a;">${escapeHtml(changedByName)}</strong> بتاريخ ${dateStr}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:collapse;background:#f9fafb;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 16px;font-size:12px;color:#475569;text-align:right;font-weight:700;">الحقل</th>
          <th style="padding:10px 16px;font-size:12px;color:#475569;text-align:right;font-weight:700;">القيمة السابقة</th>
          <th style="padding:10px 16px;font-size:12px;color:#475569;text-align:right;font-weight:700;">القيمة الجديدة</th>
        </tr>
      </thead>
      <tbody>${changesRows}</tbody>
    </table>
    <p style="font-size:13px;color:#64748b;margin:22px 0 0;line-height:1.7;">
      إذا لم تكن على علم بهذه التغييرات، يرجى التواصل مع مدير النظام.
    </p>
  </div>
  <div style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <img src="${logoBlueUrl}" alt="Half Lens" width="80" style="display:inline-block;border:0;max-width:80px;height:auto;opacity:0.85;margin-bottom:6px;" />
    <p style="font-size:11px;color:#94a3b8;margin:6px 0 0;">© ${new Date().getFullYear()} Half Lens — جميع الحقوق محفوظة</p>
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
