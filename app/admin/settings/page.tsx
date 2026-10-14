import { saveSettings } from '@/app/admin/actions'
import SetupNotice from '@/components/admin/setup-notice'
import { getSettings } from '@/lib/data/settings'
import { hasBankDetails } from '@/lib/data/types'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="store settings" />
      </>
    )
  }

  const settings = await getSettings()

  return (
    <>
      <Header />

      <article className="settings-panel">
        <div>
          <p className="eyebrow">STORE IDENTITY</p>
          <h2>Brand settings</h2>
          <p>
            Manage the customer-facing identity, contact routing, the bank account clients pay into
            and the social links rendered in the storefront footer.
          </p>
        </div>

        <form action={saveSettings}>
          <label>
            Store name
            <input name="storeName" defaultValue={settings.storeName} />
          </label>
          <label>
            Contact email
            <input type="email" name="contactEmail" defaultValue={settings.contactEmail ?? ''} />
          </label>
          <label>
            Order notifications
            <input
              type="email"
              name="orderNotifications"
              defaultValue={settings.orderNotifications ?? ''}
            />
          </label>
          <label>
            Default currency
            <select name="currency" defaultValue={settings.currency}>
              <option value="USD">USD | US Dollar</option>
              <option value="NGN">NGN | Naira</option>
              <option value="GBP">GBP | Pound</option>
              <option value="EUR">EUR | Euro</option>
            </select>
          </label>

          <p className="eyebrow">PAYMENT · BANK TRANSFER</p>
          <p className="settings-note">
            Checkout is paid by bank transfer: the client sees these details on the checkout page and
            again on her order confirmation, and the order waits as <em>Pending payment</em> until
            you mark it paid. Saving here is live immediately, with no approval step.
            {hasBankDetails(settings.bankDetails)
              ? ''
              : ' Until all three fields are filled, checkout tells the client the details are coming by email instead of showing an account to pay into.'}
          </p>
          <label>
            Bank name
            <input name="bankName" defaultValue={settings.bankDetails.bankName} placeholder="Guaranty Trust Bank" />
          </label>
          <label>
            Account number
            <input
              name="accountNumber"
              defaultValue={settings.bankDetails.accountNumber}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0123456789"
            />
          </label>
          <label>
            Account name
            <input name="accountName" defaultValue={settings.bankDetails.accountName} placeholder="AVID WOMAN VOGUE" />
          </label>

          <label>
            Instagram
            <input
              name="instagram"
              defaultValue={settings.social.instagram ?? ''}
              placeholder="https://instagram.com/…"
            />
          </label>
          <label>
            Facebook
            <input
              name="facebook"
              defaultValue={settings.social.facebook ?? ''}
              placeholder="https://facebook.com/…"
            />
          </label>
          <label>
            TikTok
            <input
              name="tiktok"
              defaultValue={settings.social.tiktok ?? ''}
              placeholder="https://tiktok.com/@…"
            />
          </label>

          <button className="gold-button" type="submit">
            Save changes
          </button>
        </form>
      </article>
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>Settings</h1>
      </div>
    </header>
  )
}
