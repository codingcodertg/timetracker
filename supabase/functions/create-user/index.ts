// Admin-only "create a user directly" Edge Function.
//
// Email delivery is unreliable, so instead of the signUp + confirmation-email
// flow, a manager creates the account server-side with the service-role key and
// a temp password, with the email marked as already confirmed. The new employee
// can sign in immediately and change their password from Settings. The
// on_auth_user_created trigger still fires and creates their profile row.
//
// Deploy:  supabase functions deploy create-user
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Not authenticated' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Identify the caller from their JWT.
    const { data: callerData, error: cErr } = await admin.auth.getUser(jwt);
    if (cErr || !callerData?.user) return json({ error: 'Invalid session' }, 401);

    // Caller must be a manager (admin).
    const { data: me } = await admin
      .from('profiles').select('role').eq('id', callerData.user.id).single();
    if (!me || me.role !== 'admin') return json({ error: 'Managers only' }, 403);

    const { email, name, password } = await req.json().catch(() => ({}));
    if (!email || !String(email).trim()) return json({ error: 'Missing email' }, 400);
    if (!password || String(password).length < 6) {
      return json({ error: 'Password must be at least 6 characters.' }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true, // no confirmation email — they can sign in right away
      user_metadata: { name: String(name || '').trim() },
    });
    if (error) {
      const status = /already( been)? registered/i.test(error.message) ? 409 : 500;
      return json({ error: error.message }, status);
    }

    return json({ ok: true, userId: data.user?.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
