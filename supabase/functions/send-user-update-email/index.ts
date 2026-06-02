import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

import { buildEmail } from "../_shared/email/builder.ts";

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

const FIELD_LABELS: Record<string, string> = {
  full_name: "الاسم الكامل",
  phone: "رقم الجوال",
  role: "الدور",
  username: "اسم المستخدم",
  email: "البريد الإلكتروني",
};

function buildUserUpdateEmail(opts: {
  userName: string;
  changedByName: string;
  changes: ChangeEntry[];
  dateStr: string;
}): { subject: string; html: string } {
  const rows = opts.changes.map((c) => ({
    label: FIELD_LABELS[c.field] || c.field,
    oldValue: c.old_value || "—",
    newValue: c.new_value || "—",
    ltr: c.field === "phone" || c.field === "email" || c.field === "username",
  }));

  return buildEmail({
    subject: "تم تحديث بيانات حسابك — Half Lens",
    preheader: `قام ${opts.changedByName} بتحديث بياناتك بتاريخ ${opts.dateStr}`,
    status: "info",
    badge: "✎ تحديث الحساب",
    heroIcon: "✎",
    greeting: `مرحباً ${opts.userName} 👋`,
    intro: `تم تحديث بيانات حسابك بواسطة ${opts.changedByName} بتاريخ ${opts.dateStr}.`,
    introEn: "Your account has been updated by an administrator.",
    sections: [
      { kind: "heading", text: "التغييرات التي تمت:" },
      { kind: "diffTable", rows },
      {
        kind: "alertBox",
        status: "warning",
        text: "إذا لم تكن على علم بهذه التغييرات، يرجى التواصل مع مدير النظام فوراً.",
      },
    ],
  });
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

    // Authorization: only the system super admin may trigger PII-laden update emails.
    const { data: callerProfile } = await serviceClient
      .from("users")
      .select("role, is_active")
      .eq("id", callerUser.id)
      .maybeSingle();

    const isSuperAdmin =
      callerProfile?.is_active && callerProfile.role === "super_admin";

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, changes } = (await req.json()) as UpdateEmailRequest;

    if (!user_id || !changes || changes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or changes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    const email = buildUserUpdateEmail({
      userName: targetUser.full_name || targetUser.email,
      changedByName,
      changes,
      dateStr,
    });

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: targetUser.email,
      subject: email.subject,
      html: email.html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-user-update-email error:", err);
    return new Response(
      JSON.stringify({
        error: "حدث خطأ غير متوقع",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
