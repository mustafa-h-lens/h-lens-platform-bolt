// Reset password for a specific admin user.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function run(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n=== ${label} (HTTP ${res.status}) ===`);
    console.log(text.slice(0, 4000));
    if (!res.ok) throw new Error(`Query failed: ${label}`);
    return text;
  } catch (err) {
    if (attempt < 4) {
      console.log(`\n--- ${label} attempt ${attempt} failed (${err.message || err.code}); retrying ---`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return run(label, query, attempt + 1);
    }
    throw err;
  }
}

await run('find target user', `
  SELECT u.id, u.full_name, u.username, u.email, u.role
  FROM public.users u
  WHERE u.full_name ILIKE '%السويدان%'
     OR u.full_name ILIKE '%تركي%'
     OR u.username ILIKE '%turki%'
     OR u.username ILIKE '%alsuwaidan%'
     OR u.username ILIKE '%suwaidan%'
  ORDER BY u.id
`);

await run('matching auth.users', `
  SELECT au.id, au.email, au.created_at, au.last_sign_in_at
  FROM auth.users au
  JOIN public.users pu ON pu.id = au.id
  WHERE pu.full_name ILIKE '%السويدان%' OR pu.full_name ILIKE '%تركي%'
  ORDER BY au.id
`);

// Reset password to "password123" using bcrypt via pgcrypto.
// Confirm email so the new password takes effect immediately, and
// clear any existing sessions so old tokens stop working.
await run('reset password + clear sessions', `
  WITH target AS (
    SELECT id FROM public.users
    WHERE full_name = 'تركي السويدان'
    LIMIT 1
  )
  UPDATE auth.users SET
    encrypted_password = crypt('password123', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id IN (SELECT id FROM target)
  RETURNING id, email, email_confirmed_at, updated_at;
`);

await run('clear active sessions', `
  DELETE FROM auth.sessions
  WHERE user_id IN (
    SELECT id FROM public.users WHERE full_name = 'تركي السويدان'
  );
`);

await run('clear refresh tokens', `
  DELETE FROM auth.refresh_tokens
  WHERE user_id IN (
    SELECT id::text FROM public.users WHERE full_name = 'تركي السويدان'
  );
`);

await run('verify new password works', `
  SELECT
    pu.full_name,
    au.email,
    (au.encrypted_password = crypt('password123', au.encrypted_password)) AS password_matches,
    au.updated_at
  FROM auth.users au
  JOIN public.users pu ON pu.id = au.id
  WHERE pu.full_name = 'تركي السويدان';
`);
