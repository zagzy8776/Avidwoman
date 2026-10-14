# Getting found on Google

This is the practical guide, not a list of tags. If you searched "best fashion
house in Owerri" and did not see the site, read section 1.

---

## 1. The honest answer

Search that phrase and look at the top of the results. You will see a **map with
three businesses** on it. That block is called the local pack, and it sits above
every ordinary website result.

**That block is not filled from your website.** It is filled from your Google
Business Profile. No amount of work on this codebase will put you inside it. Only
a claimed, verified Business Profile can.

That is why the site does not appear yet. The site is not broken. It is indexed
(Google already knows it exists) and it is technically sound. It is simply not
eligible for the position you are looking at.

Three more things are true at once:

1. **The site is new.** Google is cautious with new sites. This takes weeks.
2. **There is no custom domain.** It runs on `avidwoman.vercel.app`, which Google
   treats as a temporary address.
3. **Nothing links to it yet.** Google reads links from other sites as votes.
   Right now there are none.

None of these are fixed by editing code. All of them are fixed by the steps
below, in this order.

---

## 2. Do this first: Google Business Profile

This is free, it takes about an hour, and it is worth more than everything else
on this page combined.

1. Go to **business.google.com** and sign in with a Google account.
2. Add the business as **AVID WOMAN VOGUE**, category **Fashion designer** (you
   can add **Clothing store** and **Tailor** as extra categories).
3. Enter the Owerri address, or set it as a **service area business** if she
   works from a private address and does not want the address public.
4. Verify. Google usually posts a card or sends a code. Do not skip this step;
   an unverified profile does not rank.
5. Add **at least 10 photographs**: the shopfront, the inside, fabric on the
   rail, finished pieces on a model, and the logo. Profiles with photos get
   far more clicks.
6. Fill in opening hours, phone number, WhatsApp link, and the website address.
7. Post an update once a week. Google favours profiles that stay active.

**The category matters more than the description.** "Fashion designer" in Owerri
is the field you are competing in.

---

## 3. Reviews are the ranking factor

For a search like "best fashion house in Owerri", the word **best** means Google
leans on reviews. The businesses already in that map block have dozens. That is
the whole reason they are there.

- Ask every customer who collects an order. In person, right at collection.
- Send a short WhatsApp message with the review link the same day.
- Reply to every review, including the short ones.
- Twenty honest reviews will move you more than any change to this site.

Never buy reviews. Google detects them and it can suspend the profile entirely.

---

## 4. Buy the domain, then tell the site about it

Until this is done, every page tells Google its real home is a `.vercel.app`
address.

1. Buy a domain, for example `avidwomanvogue.com`.
2. In Vercel: **Project, Settings, Domains**, add it and follow the DNS steps.
3. In Vercel: **Settings, Environment Variables**, add

   ```
   NEXT_PUBLIC_SITE_URL = https://avidwomanvogue.com
   ```

   Then redeploy. This one variable corrects the canonical tags, the sitemap, the
   robots file, the social preview image, and the structured data in one go.
   `lib/server-origin.ts` reads it.
4. Put the domain in the Instagram bio, the TikTok bio, and the Business Profile.

---

## 5. Google Search Console

The verification file `public/googled5d9608a15a99b85.html` is already in place,
so the property should already be verified. Confirm it, then:

1. Open **Search Console, Sitemaps**.
2. Submit `sitemap.xml`.
3. Open **URL Inspection**, paste the homepage, and press **Request indexing**.
4. Come back in a week and read **Pages** to confirm the pages were indexed.

Search Console is also where you will first see the queries that actually bring
people in, which is how you learn what to write about next.

---

## 6. Links from places that already have authority

Each one of these is a vote:

- Instagram bio and TikTok bio (both already exist, point them at the domain)
- A Facebook business page
- WhatsApp Business profile
- Nigerian directories: VConnect, Finelib, BusinessList.com.ng, Nairaland
- Any supplier, fabric merchant or event you work with. Ask for a link.

A directory listing is how the sites currently outranking you got there in the
first place. Look at the results for your own search: most of them are
directories, not actual fashion houses.

---

## 7. What the site is already doing right

So you know this part is not the problem.

| Done | Where |
| --- | --- |
| Homepage title names Owerri and the phrase | `app/layout.tsx` |
| 46 location pages, each with its own delivery windows, measuring routes, local notes and FAQs | `app/locations` |
| Structured data naming the business, phone, hours and service area | `app/layout.tsx` |
| Sitemap generated from the live catalogue, 60 URLs | `app/sitemap.ts` |
| Robots file allowing crawling, blocking `/admin` and `/login` | `app/robots.ts` |
| Canonical URLs that follow the domain actually serving the page | `lib/server-origin.ts` |
| One pin shared by the map, the directions link and the structured data | `lib/studio-location.ts` |

### Two mistakes this document used to contain

- It said the business address was **Lagos**. It is Owerri. Google compares the
  address on your site against the address on your Business Profile, and a
  mismatch weakens both.
- It described `public/robots.txt` and `public/sitemap.xml`. Neither file exists,
  and neither should: a static file in `public/` would shadow the generated
  `app/robots.ts` and `app/sitemap.ts`, and the sitemap would go stale.

---

## 8. What to expect, honestly

**This week:** nothing changes in Google. The Business Profile verification has
to finish first.

**Two to four weeks:** the Business Profile appears on Maps. Searches for the
business by name start working.

**One to three months:** the profile can enter the local pack for narrower
searches, such as "fashion designer Owerri" or "thrift store Owerri", especially
once reviews build up.

**Longer:** the head phrase "best fashion house in Owerri" is held by businesses
with years of reviews. The location pages are the better bet in the meantime,
because "fashion designer in Orlu" and "tailor in Mbaise" are far less contested
and the site has a genuine, specific page for each.

The fastest wins are the specific ones. A woman in Orlu searching "tailor near
me" is ready to buy. Aim there first.

---

## 9. The one thing left to fill in

`lib/studio-location.ts` holds one empty value:

```ts
export const STUDIO_PIN = ''
```

Fill it with the studio's exact coordinates as `"lat,lng"` and three things
correct themselves at once: the map embed centres on the gate, the Get
directions button routes to the gate, and the structured data carries the same
coordinates. Until it is filled in, all three fall back to an Owerri name search.

To get the numbers: open Google Maps, long-press the exact spot, and copy the
pair of numbers that appears.

There is also `STUDIO_LANDMARK`, one optional line of help for the last stretch,
for example "Opposite the filling station on Wetheral Road". It renders under the
map and on the booking page when set. It is the polite way to help a driver
arrive: a landmark and a phone number, and nothing on the site ever needs to
mention the state of any road.
