// ─────────────────────────────────────────────────────────────
// Portal JWT minting
// ─────────────────────────────────────────────────────────────
// Mints a Supabase-compatible HS256 JWT so that vendor/client portal
// requests authenticate as the `authenticated` role and carry a
// `vendor_id` / `client_id` claim. RLS policies scope every portal read
// and write to that claim (see the *_portal_jwt_rls migration).
//
// REQUIRES the project's *legacy* JWT secret, provided to the function as
// the env var SUPABASE_JWT_SECRET. Get it from:
//   Supabase dashboard → Project Settings → API → JWT Settings → JWT Secret
// then set it as a function secret:
//   supabase secrets set SUPABASE_JWT_SECRET=<the-secret>
//
// NOTE: projects created with the new *asymmetric* JWT signing keys
// (ES256/RS256) do NOT expose a shared HS256 secret. If your project uses
// asymmetric keys, this HS256 token will be rejected by PostgREST and you
// must sign with the project's private key instead. Verify during testing.

function base64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PortalClaims {
  /** Stable subject = the vendor.id / client.id (also exposed as auth.uid()). */
  sub: string;
  portal: "vendor" | "client";
  vendor_id?: string;
  client_id?: string;
  email?: string | null;
  /** Token lifetime in seconds. Defaults to 24h. */
  expSeconds?: number;
}

export interface MintedToken {
  token: string;
  expiresAt: string;
}

/**
 * Sign a Supabase-compatible JWT for a portal user.
 * Throws if SUPABASE_JWT_SECRET is not configured.
 */
export async function mintSupabaseJWT(claims: PortalClaims): Promise<MintedToken> {
  const secret = Deno.env.get("SUPABASE_JWT_SECRET");
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is not configured for this function");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const lifetime = claims.expSeconds ?? 24 * 60 * 60;
  const exp = nowSec + lifetime;

  const header = { alg: "HS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    sub: claims.sub,
    role: "authenticated",
    aud: "authenticated",
    iat: nowSec,
    exp,
    portal: claims.portal,
  };
  if (claims.email) payload.email = claims.email;
  if (claims.vendor_id) payload.vendor_id = claims.vendor_id;
  if (claims.client_id) payload.client_id = claims.client_id;

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  const signature = base64url(new Uint8Array(sigBuf));

  return { token: `${signingInput}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
}
