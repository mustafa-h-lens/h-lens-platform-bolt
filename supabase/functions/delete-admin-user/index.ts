import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { data: callerProfile } = await serviceClient
      .from("users")
      .select("role, role_id, is_active")
      .eq("id", callerUser.id)
      .maybeSingle();

    // Only the system super admin may delete admin users.
    const isSuperAdmin =
      callerProfile?.is_active && callerProfile.role === "super_admin";

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-delete
    if (user_id === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "لا يمكنك حذف حسابك الخاص" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Delete from public.users first
    const { error: profileError } = await serviceClient
      .from("users")
      .delete()
      .eq("id", user_id);

    if (profileError) {
      console.error("Failed to delete user profile:", profileError);
      return new Response(JSON.stringify({ error: "تعذر حذف المستخدم" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete from auth.users
    const { error: authError } = await serviceClient.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error("Failed to delete auth user:", authError);
      // Profile already deleted — still report success but log the issue
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-admin-user error:", err);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
