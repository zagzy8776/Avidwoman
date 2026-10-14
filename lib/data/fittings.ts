import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type { FittingRequest, FittingRequestInput, FittingStatus } from './types'

const SELECT = 'id, name, email, phone, service, preferred_date, notes, status, created_at'

type FittingRow = {
  id: number
  name: string
  email: string
  phone: string | null
  service: string
  preferred_date: string | null
  notes: string | null
  status: string
  created_at: string
}

function toFitting(row: FittingRow): FittingRequest {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    preferredDate: row.preferred_date,
    notes: row.notes,
    status: row.status as FittingStatus,
    createdAt: row.created_at,
  }
}

/**
 * Store a fitting request sent from the storefront. Shoppers have no account,
 * so `fitting_requests` is the one table the anon role may insert into (see
 * scripts/sql/fittings.sql). The insert deliberately does not call .select():
 * there is no anon read policy, and the form only needs to know it succeeded.
 */
export async function createFittingRequest(input: FittingRequestInput): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('createFittingRequest: Supabase is not configured')
  const supabase = await createClient()
  const { error } = await supabase.from('fitting_requests').insert({
    name: input.name,
    email: input.email,
    phone: input.phone,
    service: input.service,
    preferred_date: input.preferredDate || null,
    notes: input.notes,
  })
  if (error) throw new Error(`createFittingRequest: ${error.message}`)
}

/** Admin feed, newest request first. */
export async function listFittingRequests(): Promise<FittingRequest[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fitting_requests')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listFittingRequests: ${error.message}`)
  return (data as unknown as FittingRow[]).map(toFitting)
}

export async function updateFittingStatus(id: number, status: FittingStatus): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('fitting_requests').update({ status }).eq('id', id)
  if (error) throw new Error(`updateFittingStatus: ${error.message}`)
}
