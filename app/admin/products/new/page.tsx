import Link from 'next/link'
import ProductForm from '@/components/admin/product-form'
import SetupNotice from '@/components/admin/setup-notice'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default function NewProductPage() {
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">CATALOGUE</p>
          <h1>New product</h1>
        </div>
        <Link className="text-link" href="/admin/products">
          ← Back to products
        </Link>
      </header>

      {isSupabaseConfigured() ? (
        <ProductForm />
      ) : (
        <SetupNotice area="product creation" />
      )}
    </>
  )
}
