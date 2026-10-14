import { saveContentBlock } from '@/app/admin/actions'
import SetupNotice from '@/components/admin/setup-notice'
import { contentWithDefaults } from '@/lib/data/content'
import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * Page copy — every hard-coded headline and paragraph on the home and shop
 * pages, as one card per block. Saving writes the row; the storefront reads it
 * back with the shipped copy as the fallback, so a blank field means "keep the
 * default" and never means "render nothing".
 */
export default async function AdminPageCopyPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="page copy" />
      </>
    )
  }

  const content = await contentWithDefaults()
  const blocks = Object.values(content)

  return (
    <>
      <Header />

      <p className="settings-note" style={{ marginBottom: 26 }}>
        The words on the home and shop pages. Leave a field empty to keep the line the site ships
        with. Every save is live immediately — no separate publish step.
      </p>

      <div className="content-blocks">
        {blocks.map((block) => (
          <article className="content-block" key={block.key}>
            <header>
              <h2>{block.label}</h2>
              <small>{block.key}</small>
            </header>
            <form action={saveContentBlock}>
              <input type="hidden" name="key" value={block.key} />
              <label>
                Eyebrow (small line above the title)
                <input name="eyebrow" defaultValue={block.eyebrow} />
              </label>
              <label>
                Title
                <textarea name="title" rows={2} defaultValue={block.title} />
                <small className="admin-hint">
                  Start a new line where the headline should break.
                </small>
              </label>
              <label>
                Body
                <textarea name="body" rows={3} defaultValue={block.body} />
              </label>
              <div className="admin-form-row">
                <label>
                  Button label
                  <input name="ctaLabel" defaultValue={block.ctaLabel} placeholder="Leave empty for no button" />
                </label>
                <label>
                  Button goes to
                  <input name="ctaHref" defaultValue={block.ctaHref} placeholder="shop / about / fitting / a URL" />
                </label>
              </div>
              <div className="admin-actions">
                <button className="gold-button" type="submit">Save block</button>
              </div>
            </form>
          </article>
        ))}
      </div>
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">CONTENT</p>
        <h1>Page copy</h1>
      </div>
    </header>
  )
}
