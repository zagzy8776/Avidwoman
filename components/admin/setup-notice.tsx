export default function SetupNotice({ area }: { area: string }) {
  return (
    <div className="setup-notice">
      <h2>Connect Supabase to use {area}</h2>
      <p>
        The console reads and writes real records in Supabase Postgres. There is no SQLite
        fallback, which would not survive deployment, so it is not wired up.
      </p>
      <ol style={{ margin: '12px 0 0 18px' }}>
        <li>Create a Supabase project, then run <code>supabase/schema.sql</code> in the SQL editor.</li>
        <li>Add an admin user under <code>Authentication → Users</code>.</li>
        <li>Copy <code>.env.local.example</code> to <code>.env.local</code> and paste the project URL + anon key.</li>
        <li>Restart the dev server.</li>
      </ol>
    </div>
  )
}
