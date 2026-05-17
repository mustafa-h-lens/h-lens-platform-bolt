import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// ─────────────────────────────────────────────────────────────────────
// SMS-OTP issuer — mirrors send-otp-email structure, channel swapped
// to 4jawaly REST + identifier swapped from email to phone.
// Rate-limit rules + status gates carry over unchanged.
// ─────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OTPRequest {
  phone: string;
  deviceInfo?: string;
  portal_type?: "vendor" | "client";
}

// ── Phone normalization (mirrors src/lib/phoneUtils.ts) ──
const SAUDI_9_DIGIT = /^5\d{8}$/;
const AR_DIGITS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
const toEnDigits = (s: string): string => {
  let r = s || "";
  for (let i = 0; i < 10; i++) r = r.replace(new RegExp(AR_DIGITS[i], "g"), String(i));
  return r;
};
const saudiNineDigits = (input: string): string | null => {
  if (!input) return null;
  let d = toEnDigits(input).replace(/[\s\-()]/g, "");
  if (d.startsWith("+966")) d = d.slice(4);
  else if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return SAUDI_9_DIGIT.test(d) ? d : null;
};

// ── OTP generation ──
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (100000 + (array[0] % 900000)).toString();
}

// ── 4jawaly SMS send ──
async function send4jawalySms(toE164: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = Deno.env.get("FOURJAWALY_API_KEY");
  const apiSecret = Deno.env.get("FOURJAWALY_API_SECRET");
  const sender = Deno.env.get("FOURJAWALY_SENDER") || "HalfLens";

  if (!apiKey || !apiSecret) {
    return { ok: false, error: "4jawaly credentials not configured" };
  }

  // E.164 without leading + (4jawaly expects "9665XXXXXXXX" form).
  const numberForApi = toE164.replace(/^\+/, "");

  try {
    const res = await fetch("https://api-sms.4jawaly.com/api/v1/account/area/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Basic " + btoa(`${apiKey}:${apiSecret}`),
      },
      body: JSON.stringify({
        messages: [{ text: body, numbers: [numberForApi], sender }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("4jawaly error", res.status, text);
      return { ok: false, error: `SMS gateway error (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("4jawaly fetch failed", e);
    return { ok: false, error: "SMS gateway unreachable" };
  }
}

// ── SMS body ──
// The trailing `@<origin> #<otp>` line is Apple's "Origin-Bound One-Time Codes"
// format AND Android's WebOTP API format — both platforms guarantee auto-fill
// recognition with this exact shape. Arabic OTP-keyword heuristics alone aren't
// reliable on iOS (Apple's NLP is closed-source and inconsistent), so the
// explicit origin/otp marker stays as the load-bearing line.
//
// On prod (APP_ORIGIN=https://platform.h-lens.co) the suffix is short and clean.
// On Netlify preview URLs the suffix is long; resolve that by wiring a stable
// staging subdomain (e.g. staging.h-lens.co) when you set up staging DNS.
function buildSmsBody(code: string): string {
  const origin = Deno.env.get("APP_ORIGIN") || "https://platform.h-lens.co";
  const originBare = origin.replace(/^https?:\/\//, "");
  return `رمز التحقق الخاص بك: ${code}

Half Lens — صالح لمدة 10 دقائق ولا تشاركه مع أحد.

@${originBare} #${code}`;
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

    const { phone, deviceInfo = "غير معروف", portal_type = "vendor" }: OTPRequest = await req.json();

    const nineDigit = saudiNineDigits(phone);
    if (!nineDigit) {
      return new Response(
        JSON.stringify({ error: "رقم الجوال غير صالح. يجب أن يبدأ بـ 5 وأن يتكون من 9 أرقام" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const phoneE164 = `+966${nineDigit}`;
    const phoneStored = nineDigit; // matches the format already in vendors.phone / clients.phone

    // Lookup the entity. Vendors store phone as 9-digit; client phones are
    // unstructured text — match by both digits-only and any prefix variant.
    let entityName = "";

    if (portal_type === "client") {
      const { data: clients, error: clientError } = await supabase
        .from("clients")
        .select("id, phone, name, invitation_status")
        .not("phone", "is", null);
      if (clientError) {
        console.error("Client lookup error:", clientError);
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء التحقق من رقم الجوال" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const match = (clients || []).find((c: { phone: string | null }) => saudiNineDigits(c.phone || "") === nineDigit);
      if (!match) {
        return new Response(
          JSON.stringify({ error: "رقم الجوال غير مسجل كعميل في النظام. يرجى التواصل مع مدير المشروع" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (match.invitation_status === "not_invited") {
        return new Response(
          JSON.stringify({ error: "لم يتم تفعيل بوابة العميل لحسابك بعد. يرجى التواصل مع مدير المشروع" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      entityName = match.name;
    } else {
      // Format-flexible vendor lookup: existing rows may store phone as
      // 9-digit "501234001", 10-digit "0501234001", or E.164 "+966501234001".
      // Normalize each stored value and compare against the normalized input.
      const { data: candidates, error: vendorError } = await supabase
        .from("vendors")
        .select("id, phone, full_name, status, created_at")
        .not("phone", "is", null)
        .order("created_at", { ascending: false });
      if (vendorError) {
        console.error("Vendor lookup error:", vendorError);
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء التحقق من رقم الجوال" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const vendor = (candidates || []).find(
        (v: { phone: string | null }) => saudiNineDigits(v.phone || "") === nineDigit,
      );
      if (!vendor) {
        return new Response(
          JSON.stringify({ error: "رقم الجوال غير مسجل في النظام" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const statusGate: Record<string, string> = {
        pending_approval: "طلب التسجيل الخاص بك لا يزال قيد المراجعة.",
        rejected: "لم تتم الموافقة على طلب التسجيل الخاص بك.",
        inactive: "حسابك غير نشط حالياً. يرجى التواصل مع الدعم.",
        blocked: "تم حظر حسابك. يرجى التواصل مع الدعم.",
      };
      if (vendor.status && vendor.status !== "active" && vendor.status !== "revision_requested") {
        return new Response(
          JSON.stringify({ error: statusGate[vendor.status] || "لا يمكنك تسجيل الدخول حالياً." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      entityName = vendor.full_name;
    }

    // Rate limit: 60s cooldown.
    const { data: recentOTP } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("phone", phoneStored)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentOTP) {
      return new Response(
        JSON.stringify({ error: "تم إرسال رمز التحقق مؤخراً. يرجى الانتظار دقيقة واحدة قبل طلب رمز جديد" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Daily cap: 10 per 24h.
    const { count: dailyCount } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", phoneStored)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (dailyCount && dailyCount >= 10) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد الأقصى لطلبات رمز التحقق اليومية. يرجى المحاولة غداً" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Invalidate previous unused OTPs for this phone.
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("phone", phoneStored)
      .eq("used", false);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone: phoneStored,
      code: otp,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      device_info: deviceInfo,
    });
    if (insertError) {
      console.error("OTP insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء إنشاء رمز التحقق" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const smsResult = await send4jawalySms(phoneE164, buildSmsBody(otp));
    if (!smsResult.ok) {
      // Mark the OTP used so it can't be replayed; surface the error.
      await supabase.from("otp_codes").update({ used: true }).eq("phone", phoneStored).eq("code", otp);
      return new Response(
        JSON.stringify({ error: smsResult.error || "تعذّر إرسال الرسالة. حاول مرة أخرى" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال رمز التحقق إلى جوالك", entityName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-otp-sms unexpected error", err);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
