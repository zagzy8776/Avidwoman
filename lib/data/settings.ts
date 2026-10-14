import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { DEFAULT_SETTINGS, type StoreSettings } from './types'

const SELECT =
  'store_name, contact_email, order_notifications, currency, bank_name, account_number, account_name, instagram, facebook, tiktok'

type SettingsRow = {
  store_name: string
  contact_email: string | null
  order_notifications: string | null
  currency: string
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
}

function toSettings(row: SettingsRow): StoreSettings {
  return {
    storeName: row.store_name,
    contactEmail: row.contact_email,
    orderNotifications: row.order_notifications,
    currency: row.currency,
    bankDetails: {
      bankName: row.bank_name ?? '',
      accountNumber: row.account_number ?? '',
      accountName: row.account_name ?? '',
    },
    social: {
      instagram: row.instagram,
      facebook: row.facebook,
      tiktok: row.tiktok,
    },
  }
}

/** The storefront footer reads this, so it degrades gracefully during setup. */
export async function getSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS
  const supabase = await createClient()
  const { data, error } = await supabase.from('settings').select(SELECT).eq('id', 1).maybeSingle()
  if (error) throw new Error(`getSettings: ${error.message}`)
  return data ? toSettings(data as unknown as SettingsRow) : DEFAULT_SETTINGS
}

export async function updateSettings(input: Partial<StoreSettings>): Promise<void> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}
  if (input.storeName !== undefined) patch.store_name = input.storeName
  if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail
  if (input.orderNotifications !== undefined) patch.order_notifications = input.orderNotifications
  if (input.currency !== undefined) patch.currency = input.currency
  if (input.bankDetails !== undefined) {
    // Her bank account, live the moment it saves — the checkout page and every
    // new order confirmation read this straight back out.
    patch.bank_name = input.bankDetails.bankName.trim()
    patch.account_number = input.bankDetails.accountNumber.trim()
    patch.account_name = input.bankDetails.accountName.trim()
  }
  if (input.social !== undefined) {
    patch.instagram = input.social.instagram
    patch.facebook = input.social.facebook
    patch.tiktok = input.social.tiktok
  }
  patch.updated_at = new Date().toISOString()
  const { error } = await supabase.from('settings').update(patch).eq('id', 1)
  if (error) throw new Error(`updateSettings: ${error.message}`)
}
