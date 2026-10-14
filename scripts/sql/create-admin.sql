-- Provisions the first admin account.
-- Supabase's signup endpoint rejects the domain (no MX record), so the
-- account is created directly in the auth schema — email pre-confirmed.
-- Re-runnable: does nothing if the address already exists.
do $$
declare
  uid uuid;
begin
  if exists (select 1 from auth.users where email = 'admin@avidwomanvogue.com') then
    raise notice 'admin already exists';
    return;
  end if;

  uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'admin@avidwomanvogue.com',
    extensions.crypt('Avid-Admin-2025!', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid,
    jsonb_build_object('sub', uid::text, 'email', 'admin@avidwomanvogue.com', 'email_verified', true),
    'email', uid::text, now(), now(), now()
  );
end
$$;

select id, email, email_confirmed_at is not null as confirmed
from auth.users
where email = 'admin@avidwomanvogue.com';
