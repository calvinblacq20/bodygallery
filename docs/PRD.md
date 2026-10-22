# PRD — Body Gallery website (v1)

|                       |                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| **Status**            | Draft, 22 Oct 2026. Built on the assumptions in §11 because the owner hasn't answered yet                |
| **Source research**   | Client research dossier, 22 Oct 2026 (kept private, not in this repo)                                    |
| **Key decision**      | [ADR-0001: Static site with WhatsApp booking](decisions/0001-static-site-whatsapp-booking.md) (Accepted) |
| **Owner of this doc** | Calvin                                                                                                   |

---

## 1. Understanding summary (Phase 0)

| Question                            | Answer                                                                                                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System type**                     | A static content site: a brochure plus price list that hands bookings off to WhatsApp. **Not** an app, a SaaS, or a shop                                                                                                                                  |
| **Core user action**                | _A woman in or near Kasoa picks a treatment and sends Body Gallery a ready-written booking message on WhatsApp._                                                                                                                                          |
| **Stage**                           | MVP. This is the business's first website, and right now nothing about it shows up in web search                                                                                                                                                          |
| **Data**                            | Content only: services, prices, packages, results, team, FAQs, business settings. Kept as typed files in the repo. **No visitor data is stored**                                                                                                          |
| **Money / personal data / uploads** | Money: no (deposits stay manual via MoMo in v1). Personal data: none server-side, because the booking message goes straight from the visitor's phone to WhatsApp. Public uploads: none                                                                    |
| **Realtime**                        | No                                                                                                                                                                                                                                                        |
| **Done means**                      | Live on the custom domain over HTTPS. Lighthouse mobile ≥ 90 in all four categories. Tested on a low-end Android over 3G and inside the TikTok in-app browser. SHIP-CHECKLIST passed. Linked from Google Business Profile, TikTok, Instagram and WhatsApp |

## 2. Goal & success metrics

**Goal:** Make Body Gallery easy to find, trust and book from Kasoa and nearby areas, and turn the TikTok audience and Google Maps searchers into WhatsApp bookings.

| Metric (first 90 days after launch)         | How it's measured                                                                                       | Target (assumed; revisit with owner) |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Booking taps                                | Analytics event `book_whatsapp`                                                                         | ≥ 15 / week by week 8                |
| Attributed bookings                         | Every pre-filled message starts with "Hi Body Gallery (from website)", and the owner counts them weekly | ≥ 20% of new-client bookings         |
| Local search                                | GBP Insights: website clicks and direction requests; Maps rank                                          | Top 3 for "spa in Kasoa"             |
| Speed                                       | Lighthouse CI, mobile                                                                                   | ≥ 90 ×4; home ≤ 400 KB on first load |
| Reviews _(launch plan, not a site feature)_ | Google Business Profile                                                                                 | 50 reviews                           |

## 3. Users & what they need

**Primary: "Self-care Abena"**, a woman aged 20–40 in Kasoa, Millennium City, Weija or Gomoa. She'll usually arrive from a TikTok bio link inside TikTok's in-app browser, on a mid-range or budget Android phone with patchy data. She pays with MoMo.

What she needs to know **before** she messages:

1. What do you offer, and **how much** is it?
2. Is it **safe**, especially on my skin, and who does it?
3. Does it **work**? Show me real results.
4. **Where** are you exactly, and are you open?
5. How do I book, and what's the catch (deposit, appointment-only)?

**Secondary:** men and couples booking massages, people buying a gift, and bridal parties. All of them use the same booking flow; nothing extra is built for them in v1.

## 4. Pages & screens

The header is the logo, Menu and a **Book** button. The footer holds the business name, address and phone, hours, socials and legal links. **Book**, **Call** and **WhatsApp** stay on screen everywhere: a bar across the bottom on phones (within thumb reach) and a pill in the bottom-right corner on larger screens. On /book, which is the booking flow itself, only Call and WhatsApp show.

| Route                                 | What the visitor does                             | What the system does                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` **Home**                          | Decides in 5 seconds whether this is for her      | Hero with a real photo of the space and "Spa & body care in Kasoa". A trust strip: RN-led advanced treatments (once A1 is verified), **open-now status**, location. Featured treatments (spa, stretch marks, brows & lips), the Sunday special, a preview of results, and a short Visit block |
| `/services` **Menu**                  | Scans prices and picks a treatment                | Treatments grouped by category with prices. Each row has a **Book** button, which is a plain `wa.me` link with the treatment already filled in, so it works without JavaScript. Category chips jump to sections                                                                               |
| `/services/[slug]` **Treatment page** | Checks safety, results and cost for one treatment | What it is, who it suits and who it doesn't, how it works, sessions and downtime, price (or "on consultation"), consented before/afters, aftercare, FAQ and a Book button. Advanced treatments say **"Book a consultation"**                                                                  |
| `/packages` **Packages**              | Picks a deal                                      | Package 1 and Package 2, plus the Sunday special (choose any 3). The "choose 3" picker fills in the WhatsApp message and only offers Sundays                                                                                                                                                  |
| `/results` **Results**                | Sees real outcomes                                | Gallery filtered by concern. Sensitive images stay **blurred until tapped**. Each one links to its treatment                                                                                                                                                                                  |
| `/about` **About**                    | Decides whether to trust them                     | Story, vision, team (with credentials shown only once verified), photos of the space, and their standards (hygiene, consultation, consent)                                                                                                                                                    |
| `/visit` **Visit**                    | Finds the place                                   | Address, Plus Code, step-by-step directions (from KFC Kasoa and from Nyanyano Rd), a storefront photo, an **"Open in Google Maps"** button, a map that only loads when tapped, hours, and call/WhatsApp links                                                                                 |
| `/book` **Booking helper**            | Sends a complete request                          | Treatment (pre-selected via `?service=` or `?package=`), day picked from chips for the next 14 days, time window, name and an optional note. **Open WhatsApp** sends the full message. Fallbacks: _Call_ and _Copy message_                                                                   |
| `/faq` **FAQ & policies**             | Gets objections answered                          | Appointment-only rules, deposit, lateness, cancellation, consultation, pregnancy and skin-type questions, payment methods                                                                                                                                                                     |
| `/privacy`, `/terms`                  | Legal                                             | Privacy notice (Act 843). Terms, including the booking, cancellation and refund policy and the treatment disclaimer                                                                                                                                                                           |
| `404`                                 | Lost                                              | A friendly page with links to Menu and Book                                                                                                                                                                                                                                                   |

## 5. The core flow: WhatsApp booking

```
Book button (any page) ──► wa.me link with treatment filled in            [works with no JS]
        or
/book helper ──► treatment → day → time window → name (+ note) ──► wa.me/233540185528?text=…
                                                         └─► fallbacks: Call · Copy message
```

**Message format** (plain text, URL-encoded, ≤ 1,000 characters):

```
Hi Body Gallery (from website), I'd like to book:
Treatment: Deep tissue massage (1 hr) - GH₵250
Day: Sat 25 Oct
Time: Afternoon (12-4pm)
Name: Ama
Note: First visit
```

- For advanced treatments the first line is _"I'd like to book a consultation for:"_.
- For the Sunday special it reads _"Package: Sunday special (choose 3) - GH₵350: Facial, Pedicure, Massage"_.

**Rules**

- **Days:** the next 14 days, minus closures. Sunday-only packages show Sundays only.
- **Time windows** come from `settings.bookingWindows`. Mon–Sat: Morning 9–12, Afternoon 12–4, Evening 4–7. Sunday: 12–3, 3–6. For **today**, a window is hidden if it ends within 60 minutes of now (Africa/Accra time).
- **Name:** required, 1–60 characters. **Note:** optional, ≤ 300 characters, with the hint _"Please don't share medical details here; we'll ask at your consultation."_
- **Validation** happens inline when a field loses focus, next to the field, and the message says how to fix it ("Pick a day", "Add your name"). The submit button stays enabled and focuses the first problem.
- The message is built **only from content values plus the visitor's own typed name and note**. Query parameters are only ever matched against known slugs and are never copied into the message text.
- The analytics event `book_whatsapp` records `{service, page}` only, **never the name or note**.

## 6. Content model (typed collections, validated at build)

Content lives in `src/content/` and is checked with Zod at build time. If the content breaks a rule, **the build fails and nothing ships**.

| Collection                 | Key fields                                                                                                                                                                                                                                                                                                                                                                                       | Integrity rules                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `settings` _(single file)_ | business name, tagline, `whatsappE164`, phones[], address, plus code, geo, `directions[]`, `hours` per weekday, `timezone: Africa/Accra`, `closures[]`, `bookingWindows`, socials, booking and deposit policy text, `pricesUpdatedAt`                                                                                                                                                            | One WhatsApp number used everywhere. Every day has hours or is marked closed                                                   |
| `services`                 | `slug`, `name`, `category` (`spa` / `body-skin` / `brows-lips` / `smile`), `summary` (≤ 160), body (MDX), `durationMin?`, **`priceGHS?` (integer)**, `priceLabel?` ("from", "per session"), `consultationRequired`, `sessions?`, `downtime?`, `notSuitableFor[]`, `aftercare[]`, `faqs[]`, `hero {src, alt}`, `hasDetailPage`, `featured`, `order`, `status` (`live` / `hidden` / `coming-soon`) | **No price shows "Price on consultation". Prices are never invented.** `hidden` services are left out of pages and the sitemap |
| `packages`                 | `slug`, `name`, `priceGHS`, `kind` (`fixed` / `choose`), `includes[]` → `services`, or `choose {count, from[] → services}`, `availableDays?`, `notes`, `status`                                                                                                                                                                                                                                  | The build fails if a package points to a missing or hidden service                                                             |
| `results`                  | `service` → `services`, `concern`, `before {src, alt}`, `after {src, alt}`, `sessions?`, `interval?`, **`consentRef` (required)**, `faceVisible` (default false; true needs `faceConsentRef`), `sensitive` (blur until tap), `caption`                                                                                                                                                           | **No consent reference means the build fails.** Missing alt text means the build fails                                         |
| `team`                     | `name`, `role`, `photo`, `bio`, `credentials[] {title, issuer, verified}`                                                                                                                                                                                                                                                                                                                        | Only `verified: true` credentials are shown                                                                                    |
| `faqs`                     | `q`, `a`, `topic` (`booking` / `treatments` / `safety` / `payments` / `visit`), `order`                                                                                                                                                                                                                                                                                                          | n/a                                                                                                                            |

**Seed content (from the research):** massages at GH₵100/200/250/300. Package 1, Package 2 and the Sunday special at GH₵350. Advanced treatments (laser tattoo removal, microneedling, fibroblast, lip blush, ombré brows, teeth whitening) start as "Price on consultation" until the owner gives prices.

**Who owns each row:** everything is public, read-only content edited only through the repo. There are no visitor records, so there's no row-level security to design in v1. Phase 2 tables are sketched in §14.

## 7. Edge cases (designed first)

| Situation                                                   | Behaviour                                                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visitor is in the **TikTok or Instagram in-app browser**    | `wa.me` links must open the WhatsApp app from inside these browsers. This is tested on real devices before launch. If one fails, the message falls back to _Copy message_ plus the phone numbers |
| **Desktop, or WhatsApp not installed**                      | `wa.me` opens WhatsApp Web or its install page. The helper always shows **Copy message** and both phone numbers                                                                                  |
| **JavaScript off, or Opera Mini**                           | All content renders. Every Book button is a static `wa.me` link and phone numbers are `tel:` links. Open-now falls back to the static hours table. The map is just a link                        |
| **Slow 3G**                                                 | Page-weight budgets (§8). Images are AVIF/WebP and responsive. Only the hero image loads eagerly. The map and any video load only on tap                                                         |
| **Price not confirmed**                                     | Shows "Price on consultation". Never a guess                                                                                                                                                     |
| **Prices change**                                           | One source in content. A "Prices updated {date}" line on the menu. The owner confirms the price on WhatsApp                                                                                      |
| **Sunday special picked for a non-Sunday**                  | Only Sundays appear in the day chips. The static Book link on the package says "Sundays only" in its message                                                                                     |
| **Unknown or crafted `?service=` / `?package=`**            | Ignored: the selector starts empty. A crafted link can never put arbitrary text into the message                                                                                                 |
| **Double tap on "Open WhatsApp"**                           | Harmless (no server). The analytics event is debounced for 2 s so it isn't double-counted                                                                                                        |
| **Booking "today" after windows have passed**               | Those windows are hidden. If none are left, "Today" is disabled with "Fully past opening hours, pick another day"                                                                                |
| **Public holiday or closure**                               | `settings.closures[]` removes the day from the chips and shows a banner on Home and Visit                                                                                                        |
| **Visitor's phone set to another time zone** (diaspora)     | Open-now and the time windows are worked out in Africa/Accra time using `Intl`, not the device's local time                                                                                      |
| **A treatment is temporarily off** (e.g. a machine is down) | `status: coming-soon` shows the page with "Back soon, message us to join the list". No Book button                                                                                               |
| **No results for a concern yet**                            | Empty state: "Results coming soon. Ask us on WhatsApp for examples."                                                                                                                             |
| **No reviews yet**                                          | No testimonials section. Just a "See us on Google" link. Never fake or "sample" reviews                                                                                                          |
| **Client withdraws photo consent**                          | The image is removed from content and the CDN cache is purged within 48 h. The process is written into the privacy notice                                                                        |
| **Sensitive images in search**                              | Results pages get `noimageindex`, so intimate-area photos never show up in image search                                                                                                          |
| **Map embed blocked or slow**                               | The map doesn't load until tapped. Text directions and "Open in Google Maps" always work                                                                                                         |
| **Long names, or 0 / 1 / many items**                       | Every list is tested with 0, 1 and 50 entries using the longest real names                                                                                                                       |
| **The owner's number changes**                              | Changed once in `settings`. Every link updates at build                                                                                                                                          |

## 8. Non-functional requirements

**Stack (accepted, see ADR-0001)**

- **Astro 7** (static output; 7.3.8+ for the 2026 security fixes, runs on Node 22.12+), **TypeScript strict**, content collections with Zod, **Tailwind CSS** on design tokens.
- **One small script for motion and widgets.** Smooth scrolling (**Lenis**), scroll reveals, carousel arrows and the open-now badge are vanilla TypeScript in a single deferred module. Everything works without it.
- One in-house component set (Astro components). No UI framework runtime. Native `popover` for the mobile menu.

**Hosting & delivery**

- **Vercel** static hosting (Calvin's choice at deploy time, 22 Oct 2026; Cloudflare was the original plan), deployed from GitHub `main`, with security headers in `vercel.json`.
- Every PR gets a preview deployment with `noindex`, protected behind **Cloudflare Access**.
- **Domain:** a custom `.com` (A7). HTTPS forced, HSTS on.

**Performance budgets** (enforced by Lighthouse CI)

- Home transfer ≤ 400 KB on first load. LCP ≤ 2.5 s on Lighthouse mobile. CLS < 0.1.
- No more than 2 font families, self-hosted woff2, subset to Latin, `font-display: swap`.
- JS: ≤ 15 KB gzipped site-wide for motion and widgets (6.7 KB at M1), plus analytics. Reveals only hide content once JS has confirmed it can show it again, so JS-off visitors see everything.

**Accessibility**

- WCAG 2.2 AA. Touch targets ≥ 44 px. Visible focus. Honours `prefers-reduced-motion`.
- `lang="en-GH"`. Alt text is required by the content schema.

**Design**

- **Look and motion follow the client-approved reference** (a Framer skincare-clinic template, recorded 21 Oct 2026): uppercase grotesk labels paired with serif-italic accents, giant full-width wordmark, oval portrait with floating cards, carousels, staggered pricing cards, letter-drop page titles, smooth scroll and fade-up reveals. The reference's layout and motion patterns are matched; none of its images, copy or code are used. Motion is resolved once per visit into full, calm or off: calm (reduced motion requested, which iPhones also do in Low Power Mode) keeps fades and the looping treatment band and drops parallax, sliding and zooming; off is the no-JavaScript default. `?motion=full|calm|off` overrides it for testing, and `/motion-check` reports what a phone actually does.
- Type: **Instrument Sans** (variable, OFL) and **Instrument Serif Italic** (OFL), self-hosted. Neither font has the cedi sign, so ₵ falls back to the phone's system font (Roboto/SF).
- Tokens follow the reference's neutral palette: ink `#0B0B0B`, snow `#FCFCFB`, paper, cream `#F6F0EA`, blush `#FBE8E6`. Body Gallery burgundy `#4F1724` is kept as the `brand` token (hover and selection) and can replace ink in one place.
- Motion honours `prefers-reduced-motion`; scroll-linked parallax uses CSS scroll-driven animations where supported and is simply static elsewhere.
- **Photos (decided 22 Oct 2026):** until the owner's shoot, every image slot uses a licensed Pexels photo of Black women in spa and skincare settings (35 photos, listed with their sources in `src/assets/photos/sources.json`). Stock is **never** used for results or before/afters, the team, testimonials, or anything presented as a Body Gallery client, and alt text describes the image without claiming it (Pexels forbids implying endorsement). Real photos replace stock slot by slot as they arrive. No AI-generated people. Icons are line icons, not emoji.
- **Logo:** the owner's logo (`src/assets/brand/logo-original.png`). The header uses a side-by-side version made from its figure and name so the name stays readable at small sizes; the footer uses the full logo with tagline; favicons use the figure on cream.
- Fonts are open-licensed (OFL). Photos are owned by Body Gallery or commissioned with written usage rights.
- Every screen gets a design review against the playbook's Phase 16 bar and the credibility checklist before it's called done.

**SEO / GEO**

- A title and description for every page, plus canonical, Open Graph and a branded OG image generated at build.
- JSON-LD:
  - `DaySpa` (name, address, phone, geo, `openingHoursSpecification`, `priceRange`, `sameAs` for TikTok, Instagram and Maps)
  - `Service` and `Offer` for each treatment
  - `FAQPage` and `BreadcrumbList`
- `sitemap.xml`, `robots.txt` and `llms.txt` (a plain facts summary for AI engines).
- Search Console and Bing Webmaster, plus IndexNow through Cloudflare Crawler Hints.
- Business name, address and phone **identical** to Google Business Profile.
- Target queries: "spa in Kasoa", "massage Kasoa", "stretch marks treatment Kasoa", "tattoo removal Kasoa", "ombre brows Kasoa", "lip blush Kasoa".

**Security**

- No secrets exist, since there's no server and no keys.
- Headers from `templates/SECURITY-HEADERS.md`, tuned:
  - `script-src 'self'` plus the analytics origin
  - `frame-src https://www.google.com`, for the tap-to-load map only
  - `form-action 'self'`, `frame-ancestors 'none'`
- CSP ships in **Report-Only** first, then is enforced.
- `npm audit` runs in CI and dependencies are updated monthly.
- v1 has **no endpoints, auth, uploads or database**, so the rate-limiting, IDOR, CORS, row-level-security and logout gates don't apply yet. They become mandatory the moment Phase 2 adds a backend.
- **Backups:** the git repo is the system of record for content and images. It's mirrored to a second git host monthly. Signed consent forms stay with the owner, not in the repo.

**Privacy & legal (Ghana Data Protection Act 843)**

- Analytics are **cookieless**, so no consent banner is needed. The privacy notice explains this.
- The privacy notice covers:
  - what analytics collects (no personal data)
  - that the booking happens on WhatsApp and is handled by Body Gallery
  - photo consent and how to withdraw it
  - how to make a data request
- Terms cover the booking, deposit, cancellation and refund policy and a treatment disclaimer.
- Owner action: register with the **Data Protection Commission** as a data controller. They hold client photos and health information off-site.

**Analytics & monitoring**

- **Umami Cloud** (cookieless, free tier, custom events), or Cloudflare Web Analytics for page views only as a fallback.
- Events: `book_whatsapp`, `call_click`, `directions_click`, `copy_message`. None carry personal data.
- An uptime monitor (free tier, 5-minute checks) alerts Calvin.
- Error tracking (Sentry) is deferred until there's server code. The static site has no runtime to watch.

**Browsers & devices**

- Android Chrome and Samsung Internet from the last 3 years, iOS Safari 16+, and the TikTok, Instagram and Facebook in-app browsers.
- Opera Mini: content and links must work.
- Reference device: a budget Android (2–3 GB RAM) on throttled 3G.

**Content operations (v1)**

- Calvin edits content through PRs. The owner sends changes on WhatsApp, and price changes go live within 48 h.
- The owner editing content herself is Phase 2 (§14).

## 9. Content & claims rules

- **No guaranteed results**, and no "cure" or "permanent". Use "reduces the appearance of" and "results vary". Session counts come from the owner, not from us.
- **No body-enhancement product claims and no product sales.** That includes the MACA mixture (FDA advertising approval risk; see research §6).
- Each before/after has a `consentRef`. Faces are only shown with separate face consent. Intimate areas are blurred until tapped. **No bleeding or in-progress treatment footage** on the site.
- Avoid "clinic" and "medical" wording until licensing is confirmed (A2). Credentials are shown only when verified.
- Use British English and format prices as **GH₵250**. Phone numbers are displayed local-style (`054 018 5528`) and linked in international format (`+233540185528`).

## 10. Out of scope (v1)

- Online payments or deposits.
- A real-time availability calendar or booking engine.
- Client accounts or logins.
- An owner admin dashboard or CMS.
- A product shop (including MACA).
- A blog.
- Twi or other languages.
- On-site reviews.
- A chatbot or AI assistant.
- A newsletter or WhatsApp broadcast opt-in.
- Loyalty programme.
- Buying gift vouchers online. (v1 has a "Gift a package: message us" link instead.)
- TikTok or Instagram feed embeds. Their scripts are heavy on 3G, so v1 links to the profiles instead.
- Intake or consultation forms that collect health data.
- Staff scheduling or a till system.

## 11. Assumptions (until the owner answers research §9)

| #   | Assumption                                                                                     | If it turns out wrong                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Charity (RN) performs or supervises the advanced treatments                                    | Change the trust strip and team page. Advanced pages stay "consultation required"                                               |
| A2  | HeFRA licensing status is unknown, so copy avoids "clinic" and "medical"                       | If they're licensed, show the licence. If a licence is required and they don't have one, **pause** the advanced treatment pages |
| A3  | "Monaco junction, off Nyanyano Rd" and "Kakraba Road" are the same site, reached via KFC Kasoa | Rewrite the directions and fix the GBP pin                                                                                      |
| A4  | Spa prices from the Oct 2026 TikTok videos are still current                                   | Update `services`                                                                                                               |
| A5  | The MACA product isn't sold or promoted on the site                                            | Only add a shop after FDA registration is confirmed (new PRD)                                                                   |
| A6  | Advanced bookings need a **MoMo deposit, amount to be confirmed**, paid manually on WhatsApp   | Policy text changes. Online deposits move up the Phase 2 list                                                                   |
| A7  | Domain is `bodygalleryaesthetics.com` (the folder name), pending an availability check         | Change it in config                                                                                                             |
| A8  | Calvin maintains the content for v1                                                            | Bring Keystatic forward from Phase 2                                                                                            |
| A9  | One location, English only                                                                     | n/a                                                                                                                             |
| A10 | Hours are the WhatsApp ones: Mon–Sat 9–7, Sun 12–6                                             | Update `settings`                                                                                                               |
| A11 | 054 018 5528 is the booking line (WhatsApp); 054 494 4820 is a second call line                | Update `settings`                                                                                                               |
| A12 | The owner can provide real photos (shoot in M0) and **signed consent** for every before/after  | Launch with space and team photos only. The results page starts in its empty state                                              |
| A13 | Most traffic comes from TikTok's in-app browser on Android                                     | The analytics referrer data after launch will show                                                                              |

## 12. Decision log

| #   | Decision                                          | Alternatives considered                                        | Why                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Static Astro site**                             | Next.js + Supabase; WordPress; Wix/Webflow                     | It's a content site. No server means no database, auth or row-level security to secure, and close to $0/month to run. It's the fastest option on 3G, and it's typed and lives in git, which matches the playbook. The others add runtime, cost or lock-in with no v1 benefit. **ADR-0001** |
| D2  | **WhatsApp hand-off for booking**                 | A booking engine with a calendar; a form that emails the owner | Clients already book on WhatsApp, and the owner lives there. No personal data passes through our systems. A form would need a backend, spam protection and an inbox the owner wouldn't check                                                                                               |
| D3  | **Cloudflare hosting**                            | Vercel (the playbook default)                                  | Accra point of presence, unlimited free bandwidth, Access for protected previews, Crawler Hints for IndexNow. Vercel would work too                                                                                                                                                        |
| D4  | **Content in the repo, validated by schema**      | A headless CMS now                                             | YAGNI. The schema enforces consent, alt text and price integrity. Keystatic can be added later without rewriting anything                                                                                                                                                                  |
| D5  | **Cookieless analytics (Umami)**                  | GA4; no analytics                                              | We need the booking-tap metric. GA4 needs a consent banner, adds weight and gives less privacy                                                                                                                                                                                             |
| D6  | **No product shop**                               | Selling MACA online                                            | FDA advertising risk, and it would make the brand look like a product reseller                                                                                                                                                                                                             |
| D7  | **Vanilla TypeScript + Lenis for motion**         | React + shadcn islands; GSAP                                   | The reference's motion needs smooth scroll and reveals, not a framework. Lenis plus IntersectionObserver and CSS scroll-driven animations cost 6.7 KB gzipped in total; GSAP or React would add several times that on 3G                                                                   |
| D8  | **Blur-until-tap and `noimageindex` on results**  | Showing everything openly                                      | Protects clients' privacy and keeps first-time visitors from being shocked                                                                                                                                                                                                                 |
| D9  | **Map loads on tap**                              | Always-on Google Maps embed                                    | Saves about 500 KB and third-party scripts on 3G. Text directions are clearer in Kasoa anyway                                                                                                                                                                                              |
| D10 | **Licensed stock photos until the owner's shoot** | Warm placeholder blocks; AI-generated people                   | The reference design depends on big photos, so placeholders made the site look unfinished. Pexels photos of Black women are free for commercial use; AI people would read as fake. Stock stays out of results, team and testimonials                                                       |

## 13. Testing & definition of done

- **Unit tests (Vitest):** `buildWhatsAppMessage()` covering encoding, the 1,000-character cap, consultation wording, choose-3 validation, Sunday-only, and today's past windows. Also `isOpenNow()` in Africa/Accra time across midnight and Sunday hours, `formatGHS()`, phone formatting, and closures.
- **Content tests:** fixtures prove the build **fails** on a missing `consentRef`, missing alt text, a dangling package reference, or a non-integer price.
- **E2E smoke (Playwright, mobile viewport):**
  - Home → Menu → treatment → Book, asserting the `wa.me` URL and the treatment in its text.
  - The `/book` helper flow.
  - JS-disabled run: Book links are still valid.
  - axe accessibility scan on each page type.
- **CI (GitHub Actions):** `astro check` + `tsc` strict → ESLint + Prettier → unit → build (which runs the content validation) → E2E → Lighthouse CI budgets → internal and external link check → `npm audit --audit-level=high`.
- **Manual before launch:**
  - Budget Android on 3G.
  - TikTok and Instagram in-app browsers.
  - iPhone Safari.
  - Desktop without WhatsApp.
  - Opera Mini.
- **Done** = code + green tests + loading, empty and error states + typecheck/lint clean + committed + SHIP-CHECKLIST run.

## 14. Release plan

| Milestone                                                                | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0: Owner inputs** (parallel, this week)                               | Answers to research §9. Price list signed off. Photo shoot: storefront and signage, the approach from KFC, reception, each room, the sauna tent, hammam, team portraits, hands-at-work details, and products used. Vector logo. Consent forms and before/afters. Domain bought. Quick fixes from research §3: GBP category and hours, the WhatsApp TikTok link. Start Data Protection Commission registration                                                                                                                                                             |
| **M1: First end-to-end slice**                                           | Git, `.env.example` (empty), CI, `_headers`. `settings` and `services` collections. Home and Menu with static WhatsApp Book links. Deployed to a protected preview. **Built 22 Oct 2026** in the reference's look and motion, with packages, the Visit block and 404 pulled forward from M2. Still open: the preview deploy (needs a Cloudflare account) and real photos (M0)                                                                                                                                                                                             |
| **M2: Complete v1**                                                      | Treatment pages, Results, About, full Visit page, FAQ, legal pages, `/book` helper. **Built 22 Oct 2026:** 17 treatment pages, About, Visit (map loads on tap), FAQ, Privacy, Terms and the `/book` helper, plus the owner's logo everywhere and a Home showcase for every treatment family. Results waits for consented photos. Owner to confirm: the 48-hour photo-removal promise and deposit wording in the legal pages, and the payment answers in the FAQ                                                                                                           |
| **M3: Launch**                                                           | Schema and SEO, analytics events, performance and accessibility pass, design review, SHIP-CHECKLIST. Then go live, and link the site from GBP, TikTok and Instagram bios, and the WhatsApp profile. QR review cards for the front desk                                                                                                                                                                                                                                                                                                                                    |
| **Phase 2** (only if the metrics justify it, about 8 weeks after launch) | **Owner self-editing** (Keystatic). **Online deposits via Paystack**, MoMo and card, with a double-entry ledger, idempotency keys and daily reconciliation (playbook domain module). **Booking requests and availability:** Postgres tables `clients`, `booking_requests`, `appointments` with an **exclusion constraint on `tstzrange` per practitioner and room** to stop double-booking, times stored in UTC. Row-level security: anyone can insert a request (rate-limited); only admins can read. Plus gift vouchers, Twi microcopy, and a WhatsApp broadcast opt-in |

## 15. Risks

| Risk                                                               | Mitigation                                                                                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Advanced treatments turn out to need a licence they don't have     | A2 copy rules. Keep those pages switchable with `status`. Confirm in M0                                                            |
| Stock photos make the site feel generic                            | Licensed stock fills the gaps for now (D10). The M0 shoot is still a launch goal, and real photos replace stock section by section |
| Before/after consent isn't on file                                 | The schema blocks publishing. Results launch empty if needed                                                                       |
| The owner doesn't reply to WhatsApp quickly, so web leads are lost | Owner sets a WhatsApp Business auto-reply and quick replies. Track the time to first reply                                         |
| Prices drift between the site, TikTok and the catalog              | The site is the source of truth. A monthly check against the WhatsApp catalog and GBP                                              |
| In-app browser blocks the WhatsApp deep link                       | Tested on devices before launch. Copy message and tel: fallbacks                                                                   |
