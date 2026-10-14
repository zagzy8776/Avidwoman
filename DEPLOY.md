# Deploying AVID WOMAN VOGUE to Vercel

The site is a standard Next.js 15 app. Vercel detects it automatically — there is
no build command or output directory to configure.

---

## 1. Import the repository

1. Go to **https://vercel.com** and sign in **with GitHub**.
2. Click **Add New… → Project**.
3. Find **`zagzy8776/Avidwoman`** in the list and click **Import**.

If the repo is not listed, click **Adjust GitHub App Permissions** and grant
Vercel access to it.

---

## 2. Leave the build settings alone

Vercel fills these in from `package.json` and they are already correct:

| Setting | Value |
| --- | --- |
| Framework Preset | **Next.js** (auto-detected) |
| Build Command | `next build` |
| Output Directory | `.next` (default) |
| Install Command | `npm install` |
| Node.js Version | **20.x** or 22.x |

> The `-p 3001` in the `dev` / `start` scripts only affects local development.
> Vercel ignores it and serves the app on its own port.

**Do not change anything on this screen.**

---

## 3. Add the environment variables

This is the only step that matters. Expand **Environment Variables** and add the
following. Apply each to **Production, Preview and Development**.

| Name | Value | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon / publishable key | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | the address the site is served from (see below) | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | Only if you run admin scripts |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Only for image uploads |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned preset | Only for image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Only for image uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Only for image uploads |

**Where to find the Supabase values:** Supabase dashboard → your project →
**Project Settings → API**.

**What to put in `NEXT_PUBLIC_SITE_URL`:**

- For the first deploy you do not know the URL yet, so put
  `https://avidwoman.vercel.app` (or leave it as `https://avidwomanvogue.com`).
- Once the real domain is connected, change it to that domain and **redeploy**.

This variable drives the canonical URL, the Open Graph tags, `robots.txt` and
`sitemap.xml`. If it is wrong, Google is told the wrong address for the site.

> The values in your local `.env.local` are exactly what goes in here. Open that
> file and copy them across — it is never committed to GitHub.

---

## 4. Deploy

Click **Deploy**. The first build takes about 2–3 minutes. When it finishes you
get a URL like `https://avidwoman-xxxx.vercel.app`.

---

## 5. Allow the new domain in Supabase (admin login)

Admin sign-in uses cookies, and Supabase only sends those cookies to domains it
trusts. Until this is set, `/login` will appear to work but bounce straight back.

1. Supabase dashboard → **Authentication → URL Configuration**.
2. **Site URL:** set to your live domain, e.g. `https://avidwomanvogue.com`.
3. **Redirect URLs:** add each address you use, one per line:

   ```
   https://avidwomanvogue.com/**
   https://avidwoman.vercel.app/**
   http://localhost:3001/**
   ```

4. Save.

`http://localhost:3001` is included so local development keeps working.

---

## 6. Connect the real domain

1. Vercel → your project → **Settings → Domains**.
2. Add `avidwomanvogue.com` (and `www.avidwomanvogue.com`).
3. Vercel shows either an **A record** or **CNAME** to create at your domain
   registrar (wherever the domain was bought — e.g. Namecheap, GoDaddy, Qservers).
4. Create that DNS record, then wait for it to propagate. Vercel issues the SSL
   certificate automatically once the record resolves.
5. **Update `NEXT_PUBLIC_SITE_URL`** to `https://avidwomanvogue.com` and
   **redeploy** so the canonical URLs and sitemap point at the live domain.

---

## 7. Confirm the deploy is healthy

Open these on the live URL:

| Check | Expected |
| --- | --- |
| `/` | The storefront loads with the catalogue |
| `/robots.txt` | `Sitemap: https://<your-domain>/sitemap.xml` |
| `/sitemap.xml` | The four pages plus one `<url>` per active product |
| `/login` | The sign-in form |
| `/admin` (signed out) | Redirects to `/login` |

Then submit the sitemap to Google:

**Google Search Console → Add property → URL prefix → `https://avidwomanvogue.com`
→ Sitemaps → submit `sitemap.xml`.**

---

## Notes

- **Every push to `main` redeploys automatically.** Pull requests get their own
  preview URL.
- **Content changes do not need a redeploy.** Editing copy, products or settings
  in `/admin` writes to Supabase and appears on the next page load, because the
  storefront is server-rendered per request.
- **Naira pricing.** Prices are stored in NGN and formatted by `lib/format.ts`.
- **`/admin` is protected by `middleware.ts`** and by Supabase row-level
  security. Do not rely on the URL being secret.

---

## Troubleshooting

**Build fails with `DYNAMIC_SERVER_USAGE`**
The DB-backed routes must not be prerendered. `app/page.tsx`,
`app/admin/layout.tsx` and `app/sitemap.ts` each declare
`export const dynamic = 'force-dynamic'`. Keep those in place.

**Site loads but shows no products**
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or
wrong, or the `products` table has no rows. Check the Vercel build/runtime logs.

**Login bounces back to `/login`**
Step 5 was skipped — Supabase does not trust the deployment domain yet.

**Sitemap shows the wrong domain**
`NEXT_PUBLIC_SITE_URL` is not set to the live domain. Change it and redeploy.
