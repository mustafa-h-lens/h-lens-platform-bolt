import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { mintSupabaseJWT } from "../_shared/auth/jwt.ts";

// Strict email check — disallows PostgREST filter metacharacters (, ( ) * :)
// so a user-supplied value can never break out of an `eq` filter.
const SAFE_EMAIL = /^[^\s,():*"']+@[^\s,():*"']+\.[^\s,():*"']+$/;

// Vendor statuses that may NOT log in (defence-in-depth; the send side also gates).
const BLOCKED_VENDOR_STATUSES = new Set(["rejected", "inactive", "blocked", "suspended"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyOTPRequest {
  email?: string;
  phone?: string;
  code: string;
  portal_type?: "vendor" | "client";
}

const MAX_FAILED_ATTEMPTS = 5;

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, phone, code, portal_type = "vendor" }: VerifyOTPRequest = await req.json();

    if (!code || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "رمز التحقق يجب أن يكون 6 أرقام" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick channel: phone takes priority if provided, otherwise email.
    let lookupCol: "phone" | "email";
    let lookupVal: string;
    let normalizedEmail = "";
    let normalizedPhoneNine = "";

    if (phone) {
      const nine = saudiNineDigits(phone);
      if (!nine) {
        return new Response(
          JSON.stringify({ error: "رقم الجوال غير صالح" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      normalizedPhoneNine = nine;
      lookupCol = "phone";
      lookupVal = nine;
    } else if (email && SAFE_EMAIL.test(email.trim())) {
      normalizedEmail = email.toLowerCase().trim();
      lookupCol = "email";
      lookupVal = normalizedEmail;
    } else {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني أو رقم الجوال ورمز التحقق مطلوبان" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the most recent unused OTP for this identifier
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq(lookupCol, lookupVal)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "رمز التحقق غير صالح أو منتهي الصلاحية" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Expiry check
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Brute-force protection
    const failedAttempts = otpRecord.failed_attempts || 0;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "تم تجاوز عدد المحاولات المسموحة. يرجى طلب رمز جديد" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the code
    if (otpRecord.code !== code) {
      await supabase
        .from("otp_codes")
        .update({ failed_attempts: failedAttempts + 1 })
        .eq("id", otpRecord.id);

      const remaining = MAX_FAILED_ATTEMPTS - failedAttempts - 1;
      return new Response(
        JSON.stringify({
          error: remaining > 0
            ? `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
            : "رمز التحقق غير صحيح. تم استنفاد المحاولات. يرجى طلب رمز جديد",
          remainingAttempts: remaining,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);

    // Create session
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (portal_type === "client") {
      // Look up client by phone or email depending on which was used
      let client: { id: string; email: string | null; name: string; client_image: string | null; portal_email: string | null } | null = null;

      if (lookupCol === "phone") {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, email, name, client_image, portal_email, phone")
          .not("phone", "is", null);
        client = (clients || []).find((c) => saudiNineDigits((c as { phone: string | null }).phone || "") === normalizedPhoneNine) || null;
      } else {
        const { data } = await supabase
          .from("clients")
          .select("id, email, name, client_image, portal_email")
          .or(`email.eq.${normalizedEmail},portal_email.eq.${normalizedEmail}`)
          .maybeSingle();
        client = data;
      }

      if (!client) {
        return new Response(
          JSON.stringify({ error: "العميل غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: sessionError } = await supabase
        .from("client_sessions")
        .insert({
          token: sessionToken,
          client_id: client.id,
          expires_at: sessionExpiry.toISOString(),
          ip_address: ipAddress,
        });
      if (sessionError) console.error("Client session creation error:", sessionError);

      // Activate on first successful login (pending → active)
      await supabase
        .from("clients")
        .update({ invitation_status: "active" })
        .eq("id", client.id)
        .eq("invitation_status", "pending");

      // Mint a Supabase JWT scoped to this client so RLS gates portal reads.
      const minted = await mintSupabaseJWT({
        sub: client.id,
        portal: "client",
        client_id: client.id,
        email: client.portal_email || client.email,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "تم التحقق بنجاح",
          portal_type: "client",
          client: {
            id: client.id,
            email: client.portal_email || client.email,
            name: client.name,
            client_image: client.client_image,
          },
          session: {
            token: sessionToken,
            access_token: minted.token,
            expiresAt: minted.expiresAt,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Vendor — mirror the format-flexible client lookup so phone-OTP works
      // for existing rows that may store phone as 9-digit, 10-digit with
      // leading 0, or E.164.
      let vendor: { id: string; email: string | null; full_name: string; vendor_type: string | null; phone: string | null; status: string | null } | null = null;

      if (lookupCol === "phone") {
        const { data: candidates, error: vendorError } = await supabase
          .from("vendors")
          .select("id, email, full_name, vendor_type, phone, status, created_at")
          .not("phone", "is", null)
          .order("created_at", { ascending: false });
        if (vendorError) {
          return new Response(
            JSON.stringify({ error: "المورد غير موجود" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        vendor = (candidates || []).find(
          (v) => saudiNineDigits((v as { phone: string | null }).phone || "") === normalizedPhoneNine
        ) || null;
      } else {
        const { data, error: vendorError } = await supabase
          .from("vendors")
          .select("id, email, full_name, vendor_type, phone, status")
          .eq("email", normalizedEmail)
          .maybeSingle();
        if (vendorError) {
          return new Response(
            JSON.stringify({ error: "المورد غير موجود" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        vendor = data;
      }

      if (!vendor) {
        return new Response(
          JSON.stringify({ error: "المورد غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Defence-in-depth: refuse login for blocked/rejected/inactive vendors
      // even if they hold a still-valid code (the send side already gates).
      if (vendor.status && BLOCKED_VENDOR_STATUSES.has(vendor.status)) {
        return new Response(
          JSON.stringify({ error: "لا يمكن تسجيل الدخول لهذا الحساب" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: sessionError } = await supabase
        .from("vendor_sessions")
        .insert({
          token: sessionToken,
          vendor_id: vendor.id,
          expires_at: sessionExpiry.toISOString(),
          ip_address: ipAddress,
        });
      if (sessionError) console.error("Vendor session creation error:", sessionError);

      // Mint a Supabase JWT scoped to this vendor so RLS gates portal reads.
      const minted = await mintSupabaseJWT({
        sub: vendor.id,
        portal: "vendor",
        vendor_id: vendor.id,
        email: vendor.email,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "تم التحقق بنجاح",
          portal_type: "vendor",
          vendor: {
            id: vendor.id,
            email: vendor.email,
            name: vendor.full_name,
            vendor_type: vendor.vendor_type,
          },
          session: {
            token: sessionToken,
            access_token: minted.token,
            expiresAt: minted.expiresAt,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في النظام" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
