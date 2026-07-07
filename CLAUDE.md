# CLAUDE.md — OUTREACH

Standing context for Claude Code. This is the master copy of the project brief; the chat Project and Cowork Project carry copies. **Update this file when major decisions change** (and bump the date). Last updated: 7 Jul 2026.

---

## Laws of the house — NEVER break these, they override any task instruction

1. **Primary sources only** (organisation's own site); `source_url` + `last_verified` on every record.
2. **Contact routes only as published** for submissions; complete map, gated actions (closed doors get log-referral / set-alert verbs, never cold-query drafting).
3. **AI facilitates, never authors the writer's words**; no screenplay is ever ingested (metadata only). Blake Friedmann + Ki Agency ban AI submissions — recorded in `ai_policy` column.
4. **Human gate on every database write**; nothing auto-publishes, ever. Data ALWAYS enters via the Admin Preview gate — never write directly to the DB from code or scripts.
5. **We are the OS**: no competitions of our own, no equity stakes, no brokerage — never compete with suppliers.
6. **Writer activity is never sold** individually or identifiably.
7. **Flow data (deals) accrues from now**; it cannot be backfilled — collection start date matters.

---

## Repo & dev basics

- **Stack:** React 18 + Vite. Tailwind via CDN in `index.html` (no Tailwind build step, no config file — only core utility classes work).
- **Commands:** `npm install` · `npm run dev` (local) · `npm run build` (verify before pushing).
- **Deploy:** Vercel auto-deploys on push to `main`. Live site: outreach-sandy-zeta.vercel.app. There is no staging — main is production.
- **Layout:**
  - `src/App.jsx` — the entire UI in one file (~950 lines): routing (hash-based, incl. `#admin`), Directory, profiles, Admin single-record form + Bulk import.
  - `src/lib/db.js` — Supabase data layer. Fetch + snake_case→camelCase mapping per table.
  - `src/data/dummyAgents.js` — legacy dummy data, being retired.
- **Old prototype:** the `outreach-v1` repo/site exists — ignore it entirely.
- **Visual identity:** dark slate + orange `#F2620F`, screenwriting look. Keep it.

## Database (Supabase project "outreach")

- URL `https://wrmwmsnjqrrcpbvqrlnp.supabase.co` · publishable key in `src/lib/db.js` (**public by design** — RLS enforces anonymous read-only; do not "fix" this by hiding the key).
- Writes locked by RLS to authenticated email `jason.collin@gmail.com` (magic-link sign-in). Every new table gets the same RLS pattern: public read, writes for that email only.
- **Tables:** `agents` (49 records — agency-level + person rows mixed; split pending), `editors` (ED-001), `competitions` (CP-001). Agents columns incl.: id, first_name, last_name, role, agency, agency_size, website, submission_email, submission_page_url, accepts_unsolicited, submission_policy, genres[], notable_clients, recent_deals_notes, source_url, last_verified, record_status, ai_policy, bio, press.
- **Migrations:** Jason runs SQL in the Supabase SQL Editor. Hand him one block at a time; he runs it and reports back. **Always CSV-backup affected tables before any migration** (`select * from <table>;` → Export) and re-export after.

## Record conventions

- IDs: `AG-xxx` (agents/agencies), `ED-xxx`, `CP-xxx`. Next agent id = count+1.
- Agency-level row = no `first_name` (pending proper `agencies` table); person rows name their parent agency exactly in the `agency` field.
- `record_status`: Verified (read on own site, dated) / Needs verification / Stale / Removed on request.
- `accepts_unsolicited`: Yes / No / Query letter first / Closed - check back / Check agent pages.
- Bulk import: paste JSON array → Preview → Import; upsert on `id`, partial updates work.

## Working agreement (how sessions run)

- **Claude Code** = all code changes, commits, pushes. **Cowork** = research batches producing JSON. **Chat** = strategy, research, verification.
- Session types Jason may open with: "map" (new records) / "verify" (burn stubs) / "enrich" (bios, clients, press — Primaries first) / "audit" (consistency checks).
- One SQL block at a time; on any red error text, stop and diagnose — never retry blindly.
- If the site looks wrong after a deploy, get a screenshot before changing anything else.
- Local project root: `C:\Users\jason\OneDrive\Documents\Outreach Project\` (backups + data live here).

---

## What this project is

A verified UK database of screenwriting agents/agencies, script editors, and competitions, plus a campaign tracker for spec screenwriters. Free to writers (Glassdoor model — writers are suppliers of data, not customers). Revenue comes later from a B2B intelligence layer (deals index, league tables, follow-the-money) built on the same dataset. Founder: Jason Collin (ex-BNEF commercial leader, screenwriter). Jason is user zero; his script *Unwritten* (London crime drama) is the founding case study.

## Current state (7 Jul 2026)

- 49 agency-layer records: ~13 verified, rest honest stubs from the crawl list.
- Headline verified finds: Berlin Associates OPEN (submissions@berlinassociates.com) · Aitken Alexander/Lesley Thorne OPEN · The Agency (Representation Enquiry route) · Haworth open query route · Gemma Hirst recommendation-preferred · Julian Friedmann (Blake Friedmann) CLOSED until 1 Aug 2026 · Knight Hall CLOSED (reopening watch) · Casarotto NO · United Agents referral-only · Sayle Screen referral-only · JFL established-only · Ki closed + AI ban.
- Cowork batch 1 (AG-025–034 research) complete, pending Jason's spot-check + import.
- Four SEO listicles caught contradicting agencies' own pages — the moat demonstrated.

## Immediate queue

1. Import Cowork batch 1 via Admin bulk import.
2. Claude Code setup (clone repo, footer test, commit this CLAUDE.md).
3. **STRUCTURE DAY** (2 hrs, in Claude Code): agencies/agents table split with move-history (end-dated agency links) · bulk importer table selector (agencies/agents/editors/competitions) · deals table (deal_date, writer, deal_type, project, agency, agent, buyer, financer, amount_if_disclosed, source_url, notes) · RLS on new tables · Agency/person badges + cross-linked profiles · retire dummy data · Google Alerts + RSS reader setup · backups before and after.
4. Verify burn-down to zero unverified agencies (~mid-July), then people layer (150–250 person records via Cowork + chat batches, open doors first).
5. Editors (~20–40) and curated competitions (~30–50).
6. Newsletter issue #1 when ready to plant the flag (Publishers Marketplace playbook).

## Roadmap (dataset → campaign builder → intelligence products)

B2B products in arrival order: league tables (agencies/producers/broadcasters) · follow-the-money (BNEF move — funding league tables; long-term prize) · conversion tracking (announced vs made) · turnaround graveyard · writer-side aggregate intelligence · financing-101 content layer · productions-to-work-on tracker. Buyers: agencies, streamers/broadcasters, financiers, BFI/Pact. Target: £3m ARR, few employees, no VC. Future: writer public profiles · agents claim profiles (two-sided) · playwrights/theatres vertical · US market (after UK complete + revenue). Brand: master name TBD after structure day ("Scribe Intelligence" leads; OUTREACH survives as writer-product name).
