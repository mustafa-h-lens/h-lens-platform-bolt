import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.8";

import { buildEmail } from "../_shared/email/builder.ts";

const corsHeaders = {
  // NOTE: ALLOWED_ORIGIN should be set to the real production origin (env-overridable).
  // Falling back to "*" is acceptable for dev only; lock it down in production.
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Strict email validator used to gate values BEFORE they are interpolated into
// any PostgREST filter string (.or(...) / .filter(...)). Disallows PostgREST
// metacharacters ( , ( ) * : " ' ) so a crafted email cannot alter the query.
const SAFE_EMAIL = /^[^\s,():*"']+@[^\s,():*"']+\.[^\s,():*"']+$/;

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

// ── OTP email ──────────────────────────────────────────────

function buildOtpEmail(opts: {
  otp: string;
  email: string;
  deviceInfo: string;
  requestTime: string;
  loginUrl: string;
  vendorName: string;
}): { subject: string; html: string } {
  const code = opts.otp.padStart(6, "0").slice(0, 6);
  return buildEmail({
    subject: "رمز التحقق - Half Lens",
    preheader: `رمز التحقق الخاص بك: ${code} — صالح لمدة 10 دقائق`,
    status: "info",
    badge: "🔐 رمز التحقق",
    heroIcon: "🔐",
    greeting: opts.vendorName ? `مرحباً ${opts.vendorName} 👋` : "مرحباً 👋",
    intro: "تم طلب رمز تحقق لتسجيل الدخول إلى منصة هاف لينس.",
    introEn: "A login verification code has been requested for your account.",
    sections: [
      { kind: "otpRow", code },
      {
        kind: "paragraph",
        muted: true,
        text: `⏱️ ينتهي هذا الرمز خلال 10 دقائق`,
      },
      {
        kind: "infoBox",
        rows: [
          { label: "🕒 وقت الطلب", value: opts.requestTime, ltr: true },
          { label: "📧 البريد", value: opts.email, ltr: true },
          { label: "💻 الجهاز", value: opts.deviceInfo },
        ],
      },
      {
        kind: "alertBox",
        status: "warning",
        text: "⚠️ لا تشارك هذا الرمز مع أي شخص. فريق هاف لينس لن يطلب منك رمز التحقق أبداً.",
      },
    ],
    cta: { text: "صفحة تسجيل الدخول", url: opts.loginUrl },
  });
}

// ── Invite-only client welcome (no OTP, just a welcome with portal link) ──

function buildInviteEmail(opts: {
  clientName: string;
  email: string;
  portalUrl: string;
}): { subject: string; html: string } {
  return buildEmail({
    subject: "دعوة للوصول إلى بوابة العميل - Half Lens",
    preheader: `أهلاً ${opts.clientName} — تم تفعيل بوابة العميل الخاصة بك`,
    status: "success",
    badge: "🎉 دعوة لبوابة العميل",
    heroIcon: "🎉",
    greeting: `أهلاً وسهلاً ${opts.clientName} 👋`,
    intro: "يسعدنا دعوتك للانضمام إلى بوابة العملاء الخاصة بنا. تم تفعيل حسابك ويمكنك الآن الاطلاع على كل ما يخص مشاريعك.",
    introEn: `Welcome ${opts.clientName}! Your client portal is ready — track your projects, invoices, and deliverables in one place.`,
    sections: [
      { kind: "heading", text: "ماذا يمكنك فعله في البوابة؟" },
      {
        kind: "list",
        items: [
          "📊 متابعة حالة المشاريع ومراحل التنفيذ",
          "💳 الاطلاع على الفواتير وحالة المدفوعات",
          "🎯 استعراض المراحل والتسليمات لكل مشروع",
        ],
      },
      { kind: "heading", text: "💡 كيفية تسجيل الدخول:" },
      {
        kind: "list",
        ordered: true,
        items: [
          "اضغط على الزر أدناه للدخول إلى بوابة العميل",
          `أدخل بريدك الإلكتروني: ${opts.email}`,
          "ستصلك رسالة برمز تحقق مكون من 6 أرقام",
          "أدخل الرمز وسيتم تسجيل دخولك تلقائياً",
        ],
      },
    ],
    cta: { text: "🌐 الدخول إلى بوابة العميل", url: opts.portalUrl },
  });
}

// ── Main handler ───────────────────────────────────────────

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

    // Strict validation BEFORE the email is interpolated into any PostgREST
    // filter (see the .or(...) lookup below). Rejects PostgREST metacharacters
    // to prevent filter-string injection that could alter the query.
    if (!SAFE_EMAIL.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Per-IP rate limit: max 20 OTP requests / hour from a single IP. Defends
    // against single-attacker cost-drain spam where the per-email cap is
    // bypassed by spreading requests across many fake addresses. Runs BEFORE
    // the entity lookup so a spammer at the cap can't probe email existence.
    const ipAddr = (req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || req.headers.get("x-real-ip")
      || "unknown");

    if (ipAddr !== "unknown") {
      const { count: ipReqCount } = await supabase
        .from("otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", ipAddr)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (ipReqCount && ipReqCount >= 20) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات من هذا الجهاز. يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

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
        // ENUMERATION TRADEOFF: a distinct 404 reveals whether an email is a
        // registered client. Left as-is because the login UX depends on this
        // specific message to guide users to contact their project manager.
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
        // ENUMERATION TRADEOFF: a distinct 404 reveals whether an email is a
        // registered vendor. Left as-is because the login UX depends on this
        // specific message; unifying it would break the expected frontend flow.
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

    // Read SMTP config once (used by both invite-only and OTP paths).
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
      auth: { user: smtpUser, pass: smtpPassword },
    });

    // Resolve the app base URL once (strip any trailing path).
    const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || Deno.env.get("APP_BASE_URL") || "";
    let appBase = appLoginUrl;
    try { appBase = new URL(appLoginUrl).origin; } catch { appBase = appLoginUrl.replace(/\/[^/]*$/, '') || appLoginUrl; }

    // ── INVITE ONLY MODE: Send welcome email without OTP ──
    if (invite_only && portal_type === "client") {
      const portalUrl = `${appBase}/client`;
      const inviteEmail = buildInviteEmail({
        clientName: entityName,
        email: normalizedEmail,
        portalUrl,
      });

      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFromEmail}>`,
        to: normalizedEmail,
        subject: inviteEmail.subject,
        html: inviteEmail.html,
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

    const loginUrl = portal_type === "client"
      ? `${appBase}/client`
      : `${appBase}/vendor/login`;

    const otpEmail = buildOtpEmail({
      otp,
      email: normalizedEmail,
      deviceInfo,
      requestTime,
      loginUrl,
      vendorName: entityName || "",
    });

    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: normalizedEmail,
      subject: otpEmail.subject,
      html: otpEmail.html,
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
