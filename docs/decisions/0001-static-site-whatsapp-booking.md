# ADR-0001: Static site with WhatsApp booking for v1

- **Status:** Accepted (22 Oct 2026)
- **Deciders:** Calvin
- **Related:** [PRD](../PRD.md) §5, §8, §12 · [Research](../BUSINESS-RESEARCH.md)

## Context

Body Gallery is a single-location spa and aesthetics business in Kasoa. It has no website, and every booking already happens on WhatsApp. Visitors will mostly arrive on budget Android phones, often inside TikTok's in-app browser and on slow data. The owner isn't technical. Prices for the advanced treatments, licensing, and consent arrangements for client photos are still unconfirmed.

## Decision

Build v1 as a **static Astro site** (TypeScript strict, content collections validated with Zod) hosted on **Cloudflare**, where **every booking is handed off to WhatsApp** through `wa.me` links that have the message already written. There's no server, no database, no auth, and no visitor data is stored.

## Consequences

**Good**

- Near-zero running cost and almost nothing to attack: no secrets, forms or database.
- Very fast on 3G. The core action works with JavaScript off (Opera Mini, in-app browsers).
- The content schema enforces business rules at build time: photo consent, alt text, no invented prices, valid package references.
- Data-protection exposure stays minimal, because booking messages go directly from the client's phone to the business.

**Bad / accepted**

- No booking records or availability on our side. The owner confirms each slot by hand on WhatsApp.
- No online deposits in v1. No-shows are handled by policy and manual MoMo deposits.
- Content changes go through Calvin until a git-based CMS is added.
- Measuring bookings relies on tap events plus the "(from website)" tag in the message, not on confirmed bookings.

## Alternatives considered

1. **Next.js + Supabase with a booking form and admin.** It would give us data and owner editing, but adds auth, row-level security, spam protection, a stored-data compliance burden and running cost before any demand has been shown.
2. **WordPress or a site builder (Wix/Webflow).** Easy for the owner to edit, but heavier pages on 3G, plugin and security upkeep or lock-in, and no schema enforcement of consent or prices.
3. **Vercel instead of Cloudflare.** Equally valid. Cloudflare was chosen for its Accra point of presence, Access-protected previews and Crawler Hints (IndexNow).

## Revisit when

- Website bookings regularly exceed about 40 a week, or the owner asks for online deposits. Then add Paystack plus a backend.
- The owner wants to edit content herself. Then add Keystatic (git-based, no rewrite).
- Double-booking or scheduling becomes a real problem. Then add the Phase 2 Postgres schema with an exclusion constraint.
