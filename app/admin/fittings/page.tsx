import Link from 'next/link'
import { setFittingStatus } from '@/app/admin/actions'
import SetupNotice from '@/components/admin/setup-notice'
import { listFittingRequests } from '@/lib/data/fittings'
import { FITTING_STATUSES } from '@/lib/data/types'
import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * The atelier's appointment book. Mirrors the orders page on purpose — same
 * table styling, same status form — so there is one admin idiom, not two.
 */
export default async function AdminFittingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="fittings" />
      </>
    )
  }

  const statusFilter = params.status ?? ''
  const all = await listFittingRequests()
  const requests = statusFilter ? all.filter((request) => request.status === statusFilter) : all
  const withNotes = requests.filter((request) => request.notes)

  return (
    <>
      <Header />

      <div className="admin-toolbar">
        <Link className={statusFilter ? '' : 'active'} href="/admin/fittings">
          Any status
        </Link>
        {FITTING_STATUSES.map((status) => (
          <Link
            key={status}
            className={statusFilter === status ? 'active' : ''}
            href={`/admin/fittings?status=${encodeURIComponent(status)}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <article className="orders-table expanded-table">
        <div className="table-row table-head">
          <span>Requested</span>
          <span>Client</span>
          <span>Service</span>
          <span>Preferred day</span>
          <span>Status</span>
        </div>

        {requests.map((request) => (
          <div className="table-row" key={request.id}>
            <span>
              {new Date(request.createdAt).toLocaleDateString()}
              <small style={{ display: 'block', color: 'var(--brand-muted)', fontSize: 6 }}>
                {request.notes ? 'Notes attached' : 'No notes'}
              </small>
            </span>
            <span>
              {request.name}
              <small style={{ display: 'block', color: 'var(--brand-muted)', fontSize: 6 }}>
                {request.email}
                {request.phone ? ` · ${request.phone}` : ''}
              </small>
            </span>
            <span>{request.service}</span>
            <span>{request.preferredDate ?? 'Any day'}</span>
            <span>
              <form className="status-form" action={setFittingStatus}>
                <input type="hidden" name="id" value={request.id} />
                <select
                  className="status-select"
                  name="status"
                  defaultValue={request.status}
                  aria-label={`Status for ${request.name}`}
                >
                  {FITTING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button type="submit">Save</button>
              </form>
            </span>
          </div>
        ))}

        {requests.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 18 }}>
            No fitting requests yet. Run <code>node scripts/sql.mjs scripts/sql/fittings.sql</code> if the
            table is missing, then book one from the storefront.
          </div>
        ) : null}
      </article>

      {withNotes.length ? (
        <aside className="management-panel" style={{ marginTop: 22 }}>
          <p className="eyebrow">WHAT THE CLIENTS SAID</p>
          {withNotes.map((request) => (
            <p key={request.id} style={{ marginTop: 10, fontSize: 12 }}>
              <b>{request.name}</b> — {request.notes}
            </p>
          ))}
        </aside>
      ) : null}
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">ATELIER</p>
        <h1>Fittings</h1>
      </div>
    </header>
  )
}
