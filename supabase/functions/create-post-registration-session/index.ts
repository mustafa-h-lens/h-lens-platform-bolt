import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Payload {
  vendor_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "إعدادات قاعدة البيانات غير مكتملة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { vendor_id }: Payload = await req.json();
    if (!vendor_id || !/^[0-9a-f-]{36}$/i.test(vendor_id)) {
      return new Response(JSON.stringify({ error: "معرّف المورد غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow auto-session for vendors created in the last 5 minutes, and only
    // for vendors currently in pending_approval status. This prevents the endpoint
    // from being used as a backdoor to log in as any existing vendor.
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, email, full_name, vendor_type, primary_city, profile_image, nationality, id_number, phone, status, created_at")
      .eq("id", vendor_id)
      .maybeSingle();

    if (vendorError || !vendor) {
      return new Response(JSON.stringify({ error: "المورد غير موجود" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (vendor.status !== "pending_approval") {
      return new Response(JSON.stringify({ error: "الحساب ليس بحالة مراجعة" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const createdAt = new Date(vendor.created_at).getTime();
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "انتهت نافذة الدخول التلقائي" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const { error: sessionError } = await supabase.from("vendor_sessions").insert({
      token: sessionToken,
      vendor_id: vendor.id,
      expires_at: sessionExpiry.toISOString(),
      ip_address: ipAddress,
    });

    if (sessionError) {
      console.error("Vendor session creation error:", sessionError);
      return new Response(JSON.stringify({ error: "تعذر إنشاء الجلسة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendor: {
          id: vendor.id,
          email: vendor.email,
          name: vendor.full_name,
          vendor_type: vendor.vendor_type,
          primary_city: vendor.primary_city,
          profile_image: vendor.profile_image,
          nationality: vendor.nationality,
          id_number: vendor.id_number,
          phone: vendor.phone,
          status: vendor.status,
        },
        session: {
          token: sessionToken,
          expiresAt: sessionExpiry.toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-post-registration-session:", error);
    return new Response(JSON.stringify({ error: "حدث خطأ في النظام" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
