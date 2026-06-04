import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { issuePortalSession } from "../_shared/auth/native_session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Payload {
  vendor_id: string;
  nonce: string;
}

// Real UUID shape (v4-ish): 8-4-4-4-12 hex. The old /^[0-9a-f-]{36}$/i accepted
// strings like "------------------------------------".
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const { vendor_id, nonce }: Payload = await req.json();
    if (!vendor_id || !UUID_RE.test(vendor_id) || !nonce || !UUID_RE.test(nonce)) {
      return new Response(JSON.stringify({ error: "طلب غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The session is bound to the one-time registration_nonce that the
    // registering browser stored on the vendor row. Without it, knowing the
    // vendor_id is not enough to mint a session. We also keep the original
    // guards: pending_approval status, created in the last 5 minutes.
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, email, full_name, vendor_type, profile_image, status, created_at, registration_nonce, auth_user_id")
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

    // Constant-ish nonce check. Reject if missing or mismatched.
    if (!vendor.registration_nonce || vendor.registration_nonce !== nonce) {
      return new Response(JSON.stringify({ error: "رمز التحقق غير صالح" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Burn the nonce so this can only ever succeed once.
    await supabase.from("vendors").update({ registration_nonce: null }).eq("id", vendor.id);

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

    // Issue a NATIVE Supabase session (one-time token → real session in browser).
    const portalSession = await issuePortalSession(supabase, {
      portal: "vendor",
      rowId: vendor.id,
      table: "vendors",
      authUserId: vendor.auth_user_id,
    });

    // Return only what the portal shell needs to render — NO id_number /
    // nationality / phone in the response body.
    return new Response(
      JSON.stringify({
        success: true,
        vendor: {
          id: vendor.id,
          email: vendor.email,
          name: vendor.full_name,
          vendor_type: vendor.vendor_type,
          profile_image: vendor.profile_image,
          status: vendor.status,
        },
        auth: portalSession, // native session bootstrap { token_hash, email }
        session: { token: sessionToken, expiresAt: sessionExpiry.toISOString() },
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
