# OUTREACH — demo build

From finished script to represented writer. This is the demo version: real product shape, fictional placeholder data.

**Live data rule:** every agent record on this build is fake by design (Jane Example, Demo & Partners). Real, verified records arrive in Phase 3 via Supabase.

## Run locally (optional)

```
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo called `outreach`
2. In Vercel: Add New → Project → import the `outreach` repo
3. Framework preset: Vite (auto-detected). Click Deploy.

## What's in the demo

- Home — the writer's journey, scene by scene
- Agents — searchable directory of 15 fictional records with filters
- Scripts — add your scripts (title, genre, logline); saved in your browser only
- Campaigns — pick a script, get the database auto-tiered (Primary / Secondary / Research), mark sends, log responses, watch the stats

## What's deliberately missing (later phases)

- Real agent data (Phase 3, Supabase)
- Sign-in (Phase 3)
- AI email drafting (Phase 4, serverless function — API key never in this repo)
