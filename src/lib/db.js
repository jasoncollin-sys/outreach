// Live data layer — reads from Supabase over its REST API.
// The publishable key below is PUBLIC BY DESIGN: the database enforces
// read-only access for anonymous visitors via row level security.
// Writes require a signed-in session (magic link) — see supabase client below.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wrmwmsnjqrrcpbvqrlnp.supabase.co'
const SUPABASE_KEY = 'sb_publishable_tyxhBH5vO5TIZ14-kxI91Q_bTdLE6j2'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!res.ok) throw new Error(`${table}: ${res.status}`)
  return res.json()
}

export async function fetchAgents() {
  const rows = await fetchTable('agents')
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    role: r.role || 'Agent',
    agency: r.agency,
    agencySize: r.agency_size || '',
    website: r.website || '',
    submissionEmail: r.submission_email || '',
    submissionPageUrl: r.submission_page_url || '',
    genres: r.genres || [],
    acceptsUnsolicited: r.accepts_unsolicited || 'Unknown',
    submissionPolicy: r.submission_policy || 'No published policy on record yet.',
    notableClients: r.notable_clients ? [r.notable_clients] : [],
    aiPolicy: r.ai_policy || '',
    sourceUrl: r.source_url || '',
    lastVerified: r.last_verified || '',
    verified: r.record_status === 'Verified',
    bio: r.bio || '',
    press: r.press || '',
    live: true,
  }))
}

export async function fetchEditors() {
  const rows = await fetchTable('editors')
  return rows.map((r) => ({
    id: r.id,
    firstName: r.name || '',
    lastName: '',
    role: 'Script editor',
    agency: r.company || '',
    agencySize: 'Boutique',
    website: r.website || '',
    genres: r.genres || [],
    acceptsUnsolicited: 'Yes',
    submissionPolicy: [r.services, r.rates_published, r.turnaround].filter(Boolean).join(' · '),
    notableClients: r.credits_notes ? [r.credits_notes] : [],
    sourceUrl: r.source_url || '',
    lastVerified: r.last_verified || '',
    verified: r.record_status === 'Verified',
    live: true,
  }))
}

export async function fetchCompetitions() {
  const rows = await fetchTable('competitions')
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    deadline: r.deadline || '',
    fee: r.fee || '',
    genres: r.genres || [],
    credibility: r.credibility || 'Medium',
    note: r.why_credible || '',
    live: true,
  }))
}

// ---- Admin writes (require signed-in session; RLS enforces this) ----
export async function saveAgent(form) {
  const row = {
    id: form.id.trim(),
    first_name: form.firstName.trim() || null,
    last_name: form.lastName.trim() || null,
    role: form.role || 'Agent',
    agency: form.agency.trim(),
    agency_size: form.agencySize || null,
    website: form.website.trim() || null,
    submission_email: form.submissionEmail.trim() || null,
    submission_page_url: form.submissionPageUrl.trim() || null,
    accepts_unsolicited: form.acceptsUnsolicited || null,
    submission_policy: form.submissionPolicy.trim() || null,
    genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean),
    notable_clients: form.notableClients.trim() || null,
    recent_deals_notes: form.recentDeals.trim() || null,
    source_url: form.sourceUrl.trim() || null,
    last_verified: form.lastVerified || null,
    record_status: form.recordStatus || 'Needs verification',
    ai_policy: form.aiPolicy.trim() || null,
    bio: form.bio.trim() || null,
    press: form.press.trim() || null,
  }
  const { error } = await supabase.from('agents').upsert(row, { onConflict: 'id' })
  if (error) throw error
  return row.id
}

export async function fetchAgentRaw(id) {
  const { data, error } = await supabase.from('agents').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function bulkUpsertAgents(rows) {
  const { error } = await supabase.from('agents').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  return rows.length
}
