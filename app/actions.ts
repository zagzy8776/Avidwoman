'use server'

import { revalidatePath } from 'next/cache'
import { createFittingRequest } from '@/lib/data/fittings'
import { FITTING_SERVICES } from '@/lib/data/types'

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

/**
 * Storefront fitting request (the atelier's booking form).
 *
 * Returns a plain result instead of throwing, because the form must never show
 * a success message it cannot back up: if the row cannot be written — the table
 * has not been created yet, or the connection dropped — the visitor gets an
 * honest message plus a pre-filled email so the request still reaches the
 * atelier. Run `node scripts/sql.mjs scripts/sql/fittings.sql` to enable the
 * database path.
 */
export async function requestFitting(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const name = text(formData, 'name')
  const email = text(formData, 'email')
  const service = text(formData, 'service')

  if (!name || !email) {
    return { ok: false, message: 'Add your name and email so the atelier can confirm a time.' }
  }

  try {
    await createFittingRequest({
      name,
      email,
      phone: text(formData, 'phone') || null,
      service: (FITTING_SERVICES as readonly string[]).includes(service) ? service : FITTING_SERVICES[0],
      preferredDate: text(formData, 'preferredDate') || null,
      notes: text(formData, 'notes') || null,
    })
    revalidatePath('/admin/fittings')
    return {
      ok: true,
      message: 'Thank you — your request is with the atelier. We reply within one working day.',
    }
  } catch (error) {
    console.error(
      'requestFitting: could not save the booking. Has scripts/sql/fittings.sql been run?',
      error,
    )
    return {
      ok: false,
      message:
        'We could not save that just now, so it would be lost if you closed this page. Send it by email instead — it is already written out for you.',
    }
  }
}
