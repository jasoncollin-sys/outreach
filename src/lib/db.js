// Live data layer — reads from Supabase over its REST API.
// The publishable key below is PUBLIC BY DESIGN: the database enforces
// read-only access via row level security, so this key can only read.
const SUPABASE_URL = 'https://wrmwmsnjqrrcpbvqrlnp.supabase.co'
const SUPABASE_KEY = 'sb_publishable_tyxhBH5vO5TIZ14-kxI91Q_bTdLE6j2'

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
