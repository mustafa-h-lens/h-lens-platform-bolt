// ─────────────────────────────────────────────────────────────
// Native portal session issuance
// ─────────────────────────────────────────────────────────────
// Replaces the old custom-HS256 JWT minting. After our own OTP is verified, we
// ask Supabase to mint a one-time magic-link token for the portal user's Auth
// account. The browser exchanges it via supabase.auth.verifyOtp(...) to get a
// REAL Supabase session — signed with the project's current signing key, with
// refresh tokens, compatible with the asymmetric JWT signing keys.
//
// No email is ever sent: admin.generateLink RETURNS the token (it does not
// deliver it). The synthetic address (v-/c-<id>@portal.h-lens.co) is an internal
// identifier only.

const SYNTH_DOMAIN = "portal.h-lens.co";

type Portal = "vendor" | "client";

export interface PortalSession {
  token_hash: string;
  email: string;
}

/**
 * Ensure the portal user's Auth account exists, then mint a one-time login
 * token for it. Returns null on failure (caller decides how to respond).
 */
export async function issuePortalSession(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: { portal: Portal; rowId: string; table: "vendors" | "clients"; authUserId?: string | null },
): Promise<PortalSession | null> {
  const email = `${opts.portal === "vendor" ? "v" : "c"}-${opts.rowId}@${SYNTH_DOMAIN}`;
  const idClaim = opts.portal === "vendor" ? "vendor_id" : "client_id";

  // Self-heal: if this row has no Auth user yet (e.g. created after the
  // backfill), create one now with the same synthetic email + app_metadata.
  if (!opts.authUserId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(), // never used (login is OTP → session)
      app_metadata: { portal: opts.portal, [idClaim]: opts.rowId },
    });
    if (!error && created?.user?.id) {
      await supabase.from(opts.table).update({ auth_user_id: created.user.id }).eq("id", opts.rowId);
    }
    // If it errored because the user already exists, generateLink below still
    // works (it resolves by email), so we continue either way.
  }

  const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token) {
    console.error("issuePortalSession: generateLink failed:", error);
    return null;
  }
  return { token_hash: data.properties.hashed_token, email };
}
