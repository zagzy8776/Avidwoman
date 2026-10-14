import Link from 'next/link'
import { signIn } from './actions'
import PasswordField from '@/components/admin/password-field'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata = { title: 'Sign in — AVID WOMAN VOGUE' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams

  return (
    <main className="admin-shell" style={{ display: 'block', padding: '12vh 6vw' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <p className="eyebrow">ADMINISTRATION</p>
        <h1 style={{ margin: '10px 0 28px', fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 400 }}>
          Sign in
        </h1>

        {!isSupabaseConfigured() ? (
          <div className="setup-notice">
            <h2>Supabase is not configured yet</h2>
            <p>
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, run{' '}
              <code>supabase/schema.sql</code>, then create an admin user.
            </p>
          </div>
        ) : (
          <form className="admin-form" action={signIn}>
            <input type="hidden" name="next" value={params.next ?? '/admin'} />
            <label>
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@avidwomanvogue.com"
              />
            </label>
            <PasswordField />
            {params.error ? (
              <p style={{ color: 'var(--danger)', fontSize: 10 }}>{params.error}</p>
            ) : null}
            <div className="admin-actions">
              <button className="gold-button" type="submit">
                Enter the console
              </button>
            </div>
          </form>
        )}

        <p style={{ marginTop: 28, fontSize: 9, letterSpacing: '0.14em' }}>
          <Link href="/" style={{ color: 'var(--gold)' }}>
            ← Back to the storefront
          </Link>
        </p>
      </div>
    </main>
  )
}
