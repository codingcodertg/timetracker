# create-user Edge Function

Admin-only direct user creation that bypasses the confirmation email. The
account is created server-side with the service-role key, the email is marked
confirmed, and the temp password the manager typed works immediately. The
`on_auth_user_created` trigger still creates the profile row (pending until a
manager activates it).

## Deploy — Option A: Supabase dashboard (no CLI)
1. Dashboard → **Edge Functions** → **Create a function** → name it exactly
   `create-user`.
2. Paste the contents of `index.ts` and **Deploy**.
3. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — no
   secrets to set.

## Deploy — Option B: Supabase CLI
```bash
supabase link --project-ref qklsxhzmbnglgzufdbmz
supabase functions deploy create-user
```

## Notes
- JWT verification stays ON (default). The app sends the manager's session token
  automatically via `supabase.functions.invoke`.
- Only managers can call it; duplicate emails return a clear error.
- Tell the employee their temp password out-of-band and have them change it in
  Settings after first login.
