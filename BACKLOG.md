# Toys2000 Portal — Backlog

Tracked work items for the B2B wholesale portal (`toys2000-portal`).  
Update this file when items are started, shipped, or reprioritized.

**Stack:** Next.js 16 · Supabase (catalog/cart/auth) · MarketTime API (orders/customers)

**Repo:** https://github.com/jdugard3/toys2000-portal

---

## Recently completed

- [x] Bulk customer upload (admin `/admin`) — US Divers & Allen Gerber Excel formats
- [x] Auto-assign salesperson on bulk customer import (`MT_SALESPERSON_ID`)
- [x] Active manufacturer allowlist (16 brands) — catalog, checkout, orders filtered
- [x] MarketTime API key troubleshooting — `.env` only, `npm run verify:mt`
- [x] Profile page v1 — read-only MarketTime data
- [x] Profile page v2 — editable company, billing, contacts, ship-tos (MarketTime PUT sync)
- [x] Profile navbar button — initials emblem when signed in
- [x] MarketTime-first signup flow — `/register` guide, login copy, pending-approval links
- [x] Default salesperson on account link — `ensureDefaultSalesperson()` on `link-markettime`
- [x] Vendor minimums from MarketTime — `minimumOrderAmount` on checkout/cart via live MT API
- [x] Promotions at checkout — `POST /manufacturers/promotions/get` shown on cart + checkout
- [x] Cart promotion add-on suggestions — nearest-threshold catalog picks on `/cart`
- [x] Orders page filter dropdown — status + brand filters
- [x] Approval email — Resend notification when profile becomes approved
- [x] B2B order email notifications — Jimmy + customer on order placed
- [x] Multi-vendor checkout tabs — vendor tabs on cart + checkout

> **Note:** Browse Catalog → PDF/Flipsnack is handled in Juan's version (upcoming switch) — not building here.

---

## P0 — High priority

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | **Approval email** | ✅ Done — Resend on MT sync, admin approve, or link-markettime |
| ~~⬜~~ | ~~Browse Catalog → PDF / Flipsnack~~ | **Deferred** — in Juan's version |
| ~~⬜~~ | ~~**Vendor minimums from MarketTime**~~ | ✅ Done — live from `GET /manufacturers/{id}` |
| ~~⬜~~ | ~~**Multi-vendor checkout tabs**~~ | ✅ Done — vendor tabs on cart + checkout |
| ~~⬜~~ | ~~**B2B order email notifications**~~ | ✅ Done — Resend to `ORDER_NOTIFY_EMAIL` + customer |
| ~~⬜~~ | ~~**Promotions at checkout**~~ | ✅ Done — `manufacturers/promotions/get` on cart + checkout |
| ⬜ | **MT ↔ portal bidirectional sync test** | Verify email/profile changes propagate correctly both ways |
| ⬜ | **Add ship-to / contact (profile)** | Profile v2 edits existing records only; need POST endpoints for new locations |
| ⬜ | **MarketTime API key stability** | Keys failing ~daily without regeneration — escalate to MT support if fingerprint unchanged |

---

## MarketTime API key — troubleshooting

**Symptom:** Checkout, profile, or `npm run verify:mt` fails with 401.

### Is it a timer or usage limit?

**Probably not.** MarketTime’s public docs do not describe:
- Daily or timed API key expiry
- Usage quotas that **revoke** your key

What they *do* document:
- Regenerating a key **immediately invalidates** the previous one ([Generating an API Key](https://support.markettime.com/hc/en-us/articles/43441619857947-Generating-an-API-Key-for-your-MarketTime-Account))
- Rate limits (if any) would typically return **HTTP 429**, not **401**

| HTTP status | Meaning |
|-------------|---------|
| **401** | Key missing, wrong, or revoked — auth failure |
| **429** | Too many requests — wait and retry; do **not** regenerate the key |
| **5xx** | MarketTime server error — retry later |

### Monitor over time (catch the next failure)

```bash
npm run monitor:mt    # logs to logs/mt-key-health.jsonl + prints diagnosis
npm run verify:mt     # quick one-off check
```

**Current key fingerprint (after 2026-06-23 regen):** `ebd2f9954dc3`  
**Previous (failed overnight):** `ebbee6bf8f73` — same fingerprint, 401 = revoked without local `.env` change

Run `monitor:mt` once a day (or add to a calendar). When it fails, compare fingerprints in the log.

**Production (Vercel)** — compare deployment key to local:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://YOUR-PORTAL.vercel.app/api/health/mt
```

If production `fingerprint` ≠ local `verify:mt` fingerprint, someone updated only one environment.

**Vercel cron** hits `/api/sync` daily at 4:00 UTC. If the key dies overnight, check Vercel → Project → Logs around that time for `MarketTime API error: 401`.

### Investigation checklist (ask Jimmy)

1. Did anyone open **Billing & Payment → API Key → Generate Key** in the last 24h?
2. Is anyone else integrating with the same rep group (another dev, Juan’s version, Postman)?
3. Is the **Sales Agency Elite** subscription active (not trial lapsed)?
4. After regenerating, did you update **both** local `.env` **and** Vercel `MT_API_KEY`?

### Team rule to prevent repeats

When regenerating in MarketTime:
1. Copy new key to **local `.env` and Vercel** in the same session
2. Run `npm run verify:mt` locally
3. `curl` `/api/health/mt` on production
4. Note the new fingerprint in Slack/email so everyone knows the old key is dead

MarketTime only shows the key **once** at generation — there is no “view existing key” UI.

| Fingerprint | 401? | Likely cause |
|-------------|------|----------------|
| **Same** as yesterday | Yes | MarketTime revoked key server-side → **open MT support ticket** |
| **Different** | Yes | `.env` was changed, reverted, or wrong machine — fix env, not MT |
| Same | No | Transient error — retry |

### Things that feel like “daily expiry” but aren’t

1. **Another user** clicks Generate Key in MarketTime (Jimmy, integrator, etc.)
2. **Two environments** — local `.env` updated but Vercel still has old key (or vice versa)
3. **`.env.local` returns** — Next.js prefers it over `.env`; keep only one file with `MT_*` vars
4. **iCloud / sync** reverting `.env` on another Mac
5. **Elite subscription / billing** — API access tied to plan; ask MT if account is on trial

### Escalation template for MarketTime support

> Our Sales Agency Elite API key for rep group R1359 stops working with HTTP 401 approximately every 24 hours without anyone clicking Generate Key. Is there a key TTL, trial limit, or automatic rotation on your side? Key fingerprint (SHA-256 prefix): `[paste from verify:mt]`

---

## P1 — Medium priority

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | Tag bulk-imported customers as "new" | Flag for rep assignment review |
| ⬜ | CRM sync on import | Paused per meeting transcripts |
| ⬜ | Orders → CRM pipeline | Push order events to CRM |
| ⬜ | Rep-scoped CRM access | Limit CRM data by salesperson |
| ⬜ | Bulk upload resume / error export | Download failed rows from admin upload |
| ⬜ | Guest PDF catalog + "Register for pricing" | Unauthenticated catalog preview |
| ⬜ | Design pass (Miro / Wanki) | UI polish from design review |

---

## P2 — Later

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | Migrate backend to [Innovat3Solutions/toys2000](https://github.com/Innovat3Solutions/toys2000) | Marketing Vite site vs portal split |
| ⬜ | Production deploy | Vercel promotion, domains, env vars |
| ⬜ | Portal login email change flow | Company email editable in MT; Supabase auth email is separate |

---

## Key env vars

| Variable | Purpose |
|----------|---------|
| `MT_API_KEY` | MarketTime API auth |
| `MT_REP_GROUP_ID` | Rep group (e.g. `R1359`) |
| `MT_SALESPERSON_ID` | Default rep on orders & imports (e.g. `S148431`) |
| `MT_B2B_SIGNUP_URL` | External MarketTime retailer signup link |
| `RESEND_API_KEY` | Resend API for approval + order emails |
| `EMAIL_FROM` | Sender address for transactional email |
| `ORDER_NOTIFY_EMAIL` | Jimmy / ops inbox for new order alerts |
| `NEXT_PUBLIC_SITE_URL` | Portal base URL in email links |

---

## Useful commands

```bash
npm run dev          # local dev server
npm run verify:mt    # test MarketTime API key
npm run monitor:mt   # log key health + diagnosis to logs/mt-key-health.jsonl
```

| Route | Purpose |
|-------|---------|
| `/admin` | Bulk customer upload |
| `/profile` | Retailer profile (MarketTime sync) |
| `/register` | New retailer signup guide |
| `/pending-approval` | Holding page for unapproved users |

---

## How to update this file

1. Change `⬜` → `🔄` when in progress, `✅` when done (or move to **Recently completed**).
2. Add new items with a one-line **Notes** column so context isn't lost across machines.
3. Commit and push so the list stays in sync everywhere.

*Last updated: 2026-06-23*
