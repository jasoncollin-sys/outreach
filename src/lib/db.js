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

// ---- Reads (public) ----

// Agencies (agency-level records). kind: 'agency'.
export async function fetchAgencies() {
  const rows = await fetchTable('agencies')
  return rows.map((r) => ({
    kind: 'agency',
    id: r.id,
    name: r.name || '',
    agencySize: r.agency_size || '',
    website: r.website || '',
    submissionEmail: r.submission_email || '',
    submissionPageUrl: r.submission_page_url || '',
    acceptsUnsolicited: r.accepts_unsolicited || '',
    submissionPolicy: r.submission_policy || '',
    genres: r.genres || [],
    notableClients: r.notable_clients || '',
    recentDeals: r.recent_deals_notes || '',
    aiPolicy: r.ai_policy || '',
    bio: r.bio || '',
    press: r.press || '',
    sourceUrl: r.source_url || '',
    lastVerified: r.last_verified || '',
    recordStatus: r.record_status || 'Needs verification',
    verified: r.record_status === 'Verified',
    // aliases so the shared list/campaign code can treat an agency as a target
    firstName: '',
    lastName: '',
    agency: r.name || '',
    role: 'Agency',
  }))
}

// People (individual agents / managers). kind: 'person'.
// After the Structure Day split, `agents` is people-only; we still guard by
// requiring a first name so the People view never shows a stray agency row.
export async function fetchAgents() {
  const rows = await fetchTable('agents')
  return rows
    .filter((r) => (r.first_name || '').trim() !== '')
    .map((r) => ({
      kind: 'person',
      id: r.id,
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      role: r.role || 'Agent',
      agency: r.agency || '',
      agencyId: r.agency_id || '',
      agencySize: r.agency_size || '',
      website: r.website || '',
      submissionEmail: r.submission_email || '',
      submissionPageUrl: r.submission_page_url || '',
      genres: r.genres || [],
      acceptsUnsolicited: r.accepts_unsolicited || '',
      submissionPolicy: r.submission_policy || '',
      notableClients: r.notable_clients || '',
      recentDeals: r.recent_deals_notes || '',
      aiPolicy: r.ai_policy || '',
      sourceUrl: r.source_url || '',
      lastVerified: r.last_verified || '',
      recordStatus: r.record_status || 'Needs verification',
      verified: r.record_status === 'Verified',
      bio: r.bio || '',
      press: r.press || '',
    }))
}

export async function fetchEditors() {
  const rows = await fetchTable('editors')
  return rows.map((r) => ({
    kind: 'editor',
    id: r.id,
    name: r.name || '',
    company: r.company || '',
    services: r.services || '',
    ratesPublished: r.rates_published || '',
    turnaround: r.turnaround || '',
    genres: r.genres || [],
    credits: r.credits_notes || '',
    website: r.website || '',
    sourceUrl: r.source_url || '',
    lastVerified: r.last_verified || '',
    recordStatus: r.record_status || 'Needs verification',
    verified: r.record_status === 'Verified',
    // aliases for shared code (game plan lists editors by name/agency)
    firstName: r.name || '',
    lastName: '',
    agency: r.company || '',
    submissionPolicy: [r.services, r.rates_published, r.turnaround].filter(Boolean).join(' · '),
  }))
}

export async function fetchCourses() {
  const rows = await fetchTable('courses')
  return rows.map((r) => ({
    kind: 'course',
    id: r.id,
    provider: r.provider || '',
    courseName: r.course_name || '',
    format: r.format || '',
    duration: r.duration || '',
    cost: r.cost || '',
    applicationRoute: r.application_route || '',
    notableAlumni: r.notable_alumni || '',
    website: r.website || '',
    sourceUrl: r.source_url || '',
    lastVerified: r.last_verified || '',
    recordStatus: r.record_status || 'Needs verification',
    verified: r.record_status === 'Verified',
  }))
}

export async function fetchCompetitions() {
  const rows = await fetchTable('competitions')
  return rows.map((r) => ({
    kind: 'competition',
    id: r.id,
    name: r.name || '',
    deadline: r.deadline || '',
    fee: r.fee || '',
    genres: r.genres || [],
    credibility: r.credibility || 'Medium',
    note: r.why_credible || '',
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
    agency_id: form.agencyId?.trim() || null,
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

// Lightweight list of agencies for the admin agency picker (id + name only).
export async function fetchAgencyOptions() {
  const { data, error } = await supabase.from('agencies').select('id, name').order('name')
  if (error) throw error
  return data || []
}

// Generic bulk upsert used by the bulk importer's table selector.
// Each table keys on its text `id` except `deals`, which has no natural key.
const BULK_TABLES = {
  agencies: 'id',
  agents: 'id',
  editors: 'id',
  competitions: 'id',
  courses: 'id',
}

export async function bulkUpsert(table, rows) {
  if (!(table in BULK_TABLES)) throw new Error(`Unknown table: ${table}`)
  const { error } = await supabase.from(table).upsert(rows, { onConflict: BULK_TABLES[table] })
  if (error) throw error
  return rows.length
}
