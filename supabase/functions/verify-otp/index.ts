import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyOTPRequest {
  email: string;
  code: string;
}

const MAX_FAILED_ATTEMPTS = 5;

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

    const { email, code }: VerifyOTPRequest = await req.json();

    if (!email || !code || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني ورمز التحقق مطلوبان" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "رمز التحقق يجب أن يكون 6 أرقام" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the most recent unused OTP for this email
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
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

    // Check if OTP has expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      // Mark expired OTP as used
      await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Brute-force protection: check failed attempts
    const failedAttempts = otpRecord.failed_attempts || 0;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      // Invalidate the OTP after too many failed attempts
      await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "تم تجاوز عدد المحاولات المسموحة. يرجى طلب رمز جديد" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the code
    if (otpRecord.code !== code) {
      // Increment failed attempts
      await supabase
        .from("otp_codes")
        .update({ failed_attempts: failedAttempts + 1 })
        .eq("id", otpRecord.id);

      const remaining = MAX_FAILED_ATTEMPTS - failedAttempts - 1;
      return new Response(
        JSON.stringify({
          error: remaining > 0
            ? `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
            : "رمز التحقق غير صحيح. تم استنفاد المحاولات. يرجى طلب رمز جديد"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Get vendor details
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, email, full_name, vendor_type")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (vendorError || !vendor) {
      return new Response(
        JSON.stringify({ error: "المورد غير موجود" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create and persist session token
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabase
      .from("vendor_sessions")
      .insert({
        token: sessionToken,
        vendor_id: vendor.id,
        expires_at: sessionExpiry.toISOString(),
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      });

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      // Fall back to returning vendor data without persistent session
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم التحقق بنجاح",
        vendor: {
          id: vendor.id,
          email: vendor.email,
          name: vendor.full_name,
          vendor_type: vendor.vendor_type,
        },
        session: {
          token: sessionToken,
          expiresAt: sessionExpiry.toISOString(),
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في النظام" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
