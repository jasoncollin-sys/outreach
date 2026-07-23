import { useState, useEffect } from 'react'
import {
  fetchAgencies, fetchAgents, fetchEditors, fetchCourses, fetchCompetitions,
  supabase, saveAgent, fetchAgentRaw, fetchAgencyOptions, bulkUpsert,
} from './lib/db.js'

// ---------- helpers ----------
const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}
const today = () => new Date().toISOString().slice(0, 10)
const uid = () => Math.random().toString(36).slice(2, 9)
const nameOf = (r) => (r.firstName ? `${r.firstName} ${r.lastName}`.trim() : r.name || r.agency || '')

const POSITIVE = ['Requested pages', 'Requested full', 'Meeting', 'Signed']
const RESPONSES = ['No response yet', 'Pass', 'Pass with feedback', ...POSITIVE]

function tierAgent(agent, script) {
  const genreMatch = script?.genre && agent.genres?.includes(script.genre)
  if (agent.acceptsUnsolicited === 'Yes' && genreMatch) return 'Primary'
  if (agent.acceptsUnsolicited === 'Yes' || agent.acceptsUnsolicited === 'Query letter first') return 'Secondary'
  return 'Research'
}

// ---------- tiny UI atoms ----------
function Slug({ scene, time = 'DAY' }) {
  return (
    <p className="font-slug text-sm tracking-widest text-dim uppercase mb-1">
      <span className="text-accent">INT.</span> {scene} — {time}
    </p>
  )
}

function TierBadge({ tier }) {
  const styles = {
    Primary: 'bg-accent/15 text-accentHi border-accent/40',
    Secondary: 'bg-panel text-dim border-edge',
    Research: 'bg-panel text-dim/70 border-edge border-dashed',
  }
  return (
    <span className={`text-xs font-slug uppercase tracking-wider px-2.5 py-0.5 rounded border ${styles[tier]}`}>
      {tier}
    </span>
  )
}

const KIND_LABEL = {
  agency: 'Agency', person: 'Person', editor: 'Editor', course: 'Course', competition: 'Competition',
}
function KindBadge({ kind }) {
  return (
    <span className="text-xs font-slug uppercase tracking-wider px-2.5 py-0.5 rounded border border-accent/40 text-accentHi bg-accent/10 whitespace-nowrap">
      {KIND_LABEL[kind] || kind}
    </span>
  )
}

function VerifiedBadge({ record }) {
  if (record.verified) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full border border-accent/40 text-accentHi bg-accent/10 whitespace-nowrap">
        Verified{record.lastVerified ? ` ${record.lastVerified}` : ''}
      </span>
    )
  }
  return (
    <span className="text-xs px-2.5 py-1 rounded-full border border-edge text-dim whitespace-nowrap">
      {record.recordStatus || 'Needs verification'}
    </span>
  )
}

function Empty({ children }) {
  return <p className="text-dim text-sm border border-dashed border-edge rounded-lg p-6 text-center">{children}</p>
}

// Uniform empty-state for a single profile field — never hide a field, show this.
function NotVerified({ label = 'Not yet verified' }) {
  return (
    <span className="inline-block text-dim/60 italic text-xs border border-dashed border-edge rounded px-2 py-0.5">
      {label}
    </span>
  )
}

// A profile field row. `filled` decides whether to show the value or the empty state.
function Field({ label, filled, children }) {
  return (
    <div>
      <dt className="text-dim uppercase font-slug text-xs tracking-wider mb-1">{label}</dt>
      <dd className="text-body text-sm leading-relaxed">{filled ? children : <NotVerified />}</dd>
    </div>
  )
}

const TextField = ({ label, value }) => <Field label={label} filled={!!(value && String(value).trim())}>{value}</Field>

const GenreField = ({ label, genres }) => (
  <Field label={label} filled={!!(genres && genres.length)}>{genres?.join(', ')}</Field>
)

const LinkField = ({ label, url }) => (
  <Field label={label} filled={!!(url && url.trim())}>
    <a href={url} target="_blank" rel="noreferrer" className="text-accentHi underline break-all">{url}</a>
  </Field>
)

function ClientsField({ label, value }) {
  const items = (value || '').split(/[;\n]/).map((c) => c.trim()).filter(Boolean)
  return (
    <Field label={label} filled={items.length > 0}>
      <ul className="list-disc list-inside space-y-0.5">
        {items.map((cl, i) => <li key={i}>{cl}</li>)}
      </ul>
    </Field>
  )
}

function PressField({ label, value }) {
  const lines = (value || '').split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <Field label={label} filled={lines.length > 0}>
      <div className="space-y-1">
        {lines.map((line, i) => {
          const m = line.match(/https?:\/\/\S+/)
          const url = m ? m[0] : null
          const text = url ? line.replace(url, '').trim() : line
          return (
            <p key={i}>
              {text}
              {url && (<> {' '}<a href={url} target="_blank" rel="noreferrer" className="text-accentHi underline">read</a></>)}
            </p>
          )
        })}
      </div>
    </Field>
  )
}

function ContactField({ record }) {
  const { submissionEmail, submissionPageUrl } = record
  const filled = !!(submissionEmail || submissionPageUrl)
  return (
    <Field label="Published contact" filled={filled}>
      {submissionEmail}
      {submissionEmail && submissionPageUrl ? ' · ' : ''}
      {submissionPageUrl && (
        <a href={submissionPageUrl} target="_blank" rel="noreferrer" className="text-accentHi underline">submission page</a>
      )}
    </Field>
  )
}

// ---------- screens ----------
function Home({ go }) {
  const steps = [
    ['01', 'Ready the script', 'Script editors and courses in the directory. Blind coverage — coming later.'],
    ['02', 'Prove it', 'Competition list live. Matching in your Game plan.'],
    ['03', 'Get represented', 'Verified UK agencies and agents. Start here.'],
    ['04', 'Run the campaign', 'Tiered targets, drafted queries, tracked responses.'],
  ]
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="font-slug text-dim tracking-widest text-sm mb-6">FADE IN:</p>
      <h1 className="text-4xl md:text-5xl font-semibold text-body leading-tight mb-4">
        You finished the script.
        <br />
        <span className="text-accent">Now what?</span>
      </h1>
      <p className="text-dim text-lg mb-10 max-w-xl">
        OUTREACH is the path from finished screenplay to represented writer: a verified database of UK agencies,
        agents and courses, and a campaign builder that turns "I should query people" into a tracked, systematic push.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {steps.map(([n, title, sub]) => (
          <div key={n} className="border border-edge rounded-lg p-4 bg-panel/50">
            <p className="font-slug text-accent text-xs tracking-widest mb-1">SCENE {n}</p>
            <p className="text-body font-medium">{title}</p>
            <p className="text-dim text-sm mt-1">{sub}</p>
          </div>
        ))}
      </div>
      <button onClick={() => go('directory')} className="px-6 py-3 bg-accent hover:bg-accentHi transition rounded-lg text-white font-medium">
        Browse the database
      </button>
    </div>
  )
}

// A single clickable row in any directory list.
function DirRow({ onClick, title, sub, pill, pillOpen }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-panel/60 border border-edge rounded-lg p-4 hover:border-accent/50 transition flex items-center justify-between gap-4"
    >
      <div>
        <p className="text-body font-medium">{title}</p>
        {sub && <p className="text-dim text-sm mt-0.5">{sub}</p>}
      </div>
      {pill && (
        <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${pillOpen ? 'border-accent/40 text-accentHi bg-accent/10' : 'border-edge text-dim'}`}>
          {pill}
        </span>
      )}
    </button>
  )
}

const DIR_TABS = [
  ['all', 'All'],
  ['agencies', 'Agencies'],
  ['people', 'People'],
  ['editors', 'Editors'],
  ['courses', 'Courses'],
  ['competitions', 'Competitions'],
]

function Directory({ agencies, people, editors, courses, comps, openProfile }) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const match = (text) => !s || text.toLowerCase().includes(s)

  const total = agencies.length + people.length + editors.length + courses.length + comps.length
  const counts = {
    all: total,
    agencies: agencies.length, people: people.length, editors: editors.length,
    courses: courses.length, competitions: comps.length,
  }

  // Row renderers — shared by the single-type views and the grouped "All" view.
  const agencyRow = (a) => (
    <DirRow key={a.id} onClick={() => openProfile('agency', a.id)}
      title={a.name}
      sub={[a.agencySize, a.genres.join(', ')].filter(Boolean).join(' · ')}
      pill={a.acceptsUnsolicited === 'Yes' ? 'Open to unsolicited' : (a.acceptsUnsolicited || 'Openness unknown')}
      pillOpen={a.acceptsUnsolicited === 'Yes'} />
  )
  const personRow = (p) => (
    <DirRow key={p.id} onClick={() => openProfile('person', p.id)}
      title={<>{p.firstName} {p.lastName}<span className="text-dim font-normal"> · {p.agency}</span></>}
      sub={[p.role, p.genres.join(', ')].filter(Boolean).join(' · ')}
      pill={p.acceptsUnsolicited === 'Yes' ? 'Open to unsolicited' : (p.acceptsUnsolicited || 'Openness unknown')}
      pillOpen={p.acceptsUnsolicited === 'Yes'} />
  )
  const editorRow = (e) => (
    <DirRow key={e.id} onClick={() => openProfile('editor', e.id)}
      title={<>{e.name}{e.company && <span className="text-dim font-normal"> · {e.company}</span>}</>}
      sub={[e.genres.join(', '), e.turnaround].filter(Boolean).join(' · ')} />
  )
  const courseRow = (c) => (
    <DirRow key={c.id} onClick={() => openProfile('course', c.id)}
      title={<>{c.courseName || c.provider}{c.provider && c.courseName && <span className="text-dim font-normal"> · {c.provider}</span>}</>}
      sub={[c.format, c.duration, c.cost].filter(Boolean).join(' · ')} />
  )
  const compRow = (c) => (
    <DirRow key={c.id} onClick={() => openProfile('competition', c.id)}
      title={c.name}
      sub={[c.deadline && `Deadline ${c.deadline}`, c.fee && `Entry ${c.fee}`].filter(Boolean).join(' · ')}
      pill={`${c.credibility} credibility`}
      pillOpen={c.credibility === 'High'} />
  )

  // Filtered matches per type. Search spans names — including the combined
  // "first last" full name — the parent agency, and each type's key fields.
  const fAgencies = agencies.filter((a) => match(`${a.name} ${a.genres.join(' ')}`))
  const fPeople = people.filter((p) => match(`${p.firstName} ${p.lastName} ${p.agency} ${p.role}`))
  const fEditors = editors.filter((e) => match(`${e.name} ${e.company} ${e.genres.join(' ')}`))
  const fCourses = courses.filter((c) => match(`${c.courseName} ${c.provider} ${c.format}`))
  const fComps = [...comps].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .filter((c) => match(`${c.name} ${c.genres.join(' ')}`))

  let list = null
  if (tab === 'all') {
    const groups = [
      ['Agencies', 'agency', fAgencies.map(agencyRow)],
      ['People', 'person', fPeople.map(personRow)],
      ['Editors', 'editor', fEditors.map(editorRow)],
      ['Courses', 'course', fCourses.map(courseRow)],
      ['Competitions', 'competition', fComps.map(compRow)],
    ].filter(([, , rows]) => rows.length > 0)
    list = groups.length === 0
      ? <Empty>{s ? `Nothing matches "${q.trim()}" across the directory.` : 'No listings yet.'}</Empty>
      : groups.map(([label, key, rows]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-accentHi text-xs uppercase tracking-wider">{label}</span>
              <span className="text-dim/70 text-xs">{rows.length}</span>
            </div>
            {rows}
          </div>
        ))
  } else if (tab === 'agencies') {
    list = fAgencies.length === 0 ? <Empty>No agencies yet.</Empty> : fAgencies.map(agencyRow)
  } else if (tab === 'people') {
    list = fPeople.length === 0 ? <Empty>No people yet.</Empty> : fPeople.map(personRow)
  } else if (tab === 'editors') {
    list = fEditors.length === 0 ? <Empty>No editors yet.</Empty> : fEditors.map(editorRow)
  } else if (tab === 'courses') {
    list = fCourses.length === 0 ? <Empty>No courses yet.</Empty> : fCourses.map(courseRow)
  } else if (tab === 'competitions') {
    list = fComps.length === 0 ? <Empty>No competitions yet.</Empty> : fComps.map(compRow)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Slug scene="THE DIRECTORY" />
      <h2 className="text-3xl font-semibold text-body mb-1">{total} listings across the industry</h2>
      <p className="text-dim text-sm mb-6">
        Records marked verified are checked against each organisation's own website, with a source and
        last-checked date.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {DIR_TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`text-sm px-3.5 py-1.5 rounded-lg border transition ${tab === id ? 'border-accent/50 text-accentHi bg-accent/10' : 'border-edge text-dim hover:text-body'}`}>
            {label} <span className="text-dim/70">{counts[id]}</span>
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tab === 'all' ? 'Search everyone and everything — names, agencies, editors, courses…' : 'Search within this view'}
        className="w-full px-4 py-2.5 bg-panel text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60 mb-6"
      />

      <div className="space-y-3">{list}</div>
    </div>
  )
}

function Profile({ record, kind, people, openProfile, back }) {
  if (!record) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button onClick={back} className="text-dim hover:text-body text-sm mb-6">← Directory</button>
        <Empty>Record not found.</Empty>
      </div>
    )
  }

  let title, subtitle, body
  if (kind === 'agency') {
    const roster = people.filter((p) => p.agencyId && p.agencyId === record.id)
    title = record.name
    subtitle = [record.role || 'Agency', record.agencySize].filter(Boolean).join(' · ')
    body = (
      <>
        <TextField label="Bio" value={record.bio} />
        <TextField label="Openness" value={record.acceptsUnsolicited} />
        <TextField label="Submission route" value={record.submissionPolicy} />
        <ContactField record={record} />
        <GenreField label="Areas of interest" genres={record.genres} />
        <ClientsField label="Clients & roster" value={record.notableClients} />
        <TextField label="Intelligence" value={record.recentDeals} />
        <TextField label="AI policy" value={record.aiPolicy} />
        <PressField label="In the press" value={record.press} />
        <LinkField label="Website" url={record.website} />
        <Field label="People at this agency" filled={roster.length > 0}>
          <ul className="space-y-1">
            {roster.map((p) => (
              <li key={p.id}>
                <button onClick={() => openProfile('person', p.id)} className="text-accentHi underline">
                  {p.firstName} {p.lastName}
                </button>
                <span className="text-dim"> · {p.role}</span>
              </li>
            ))}
          </ul>
        </Field>
        <LinkField label="Source" url={record.sourceUrl} />
      </>
    )
  } else if (kind === 'person') {
    title = `${record.firstName} ${record.lastName}`.trim()
    subtitle = [record.agency, record.role, record.agencySize].filter(Boolean).join(' · ')
    body = (
      <>
        <Field label="Agency" filled={!!record.agency}>
          {record.agencyId ? (
            <button onClick={() => openProfile('agency', record.agencyId)} className="text-accentHi underline">{record.agency}</button>
          ) : record.agency}
        </Field>
        <TextField label="Bio" value={record.bio} />
        <TextField label="Openness" value={record.acceptsUnsolicited} />
        <TextField label="Submission route" value={record.submissionPolicy} />
        <ContactField record={record} />
        <GenreField label="Areas of interest" genres={record.genres} />
        <ClientsField label="Clients" value={record.notableClients} />
        <TextField label="Intelligence" value={record.recentDeals} />
        <TextField label="AI policy" value={record.aiPolicy} />
        <PressField label="In the press" value={record.press} />
        <LinkField label="Website" url={record.website} />
        <LinkField label="Source" url={record.sourceUrl} />
      </>
    )
  } else if (kind === 'editor') {
    title = record.name
    subtitle = [record.company, 'Script editor'].filter(Boolean).join(' · ')
    body = (
      <>
        <TextField label="Services" value={record.services} />
        <TextField label="Rates" value={record.ratesPublished} />
        <TextField label="Turnaround" value={record.turnaround} />
        <GenreField label="Genres" genres={record.genres} />
        <TextField label="Credits" value={record.credits} />
        <LinkField label="Website" url={record.website} />
        <LinkField label="Source" url={record.sourceUrl} />
      </>
    )
  } else if (kind === 'course') {
    title = record.courseName || record.provider
    subtitle = [record.provider, record.format].filter(Boolean).join(' · ')
    body = (
      <>
        <TextField label="Provider" value={record.provider} />
        <TextField label="Format" value={record.format} />
        <TextField label="Duration" value={record.duration} />
        <TextField label="Cost" value={record.cost} />
        <TextField label="Application route" value={record.applicationRoute} />
        <TextField label="Notable alumni" value={record.notableAlumni} />
        <LinkField label="Website" url={record.website} />
        <LinkField label="Source" url={record.sourceUrl} />
      </>
    )
  } else if (kind === 'competition') {
    title = record.name
    subtitle = 'Competition'
    body = (
      <>
        <TextField label="Deadline" value={record.deadline} />
        <TextField label="Entry fee" value={record.fee} />
        <GenreField label="Genres" genres={record.genres} />
        <TextField label="Credibility" value={record.credibility} />
        <TextField label="Why it carries weight" value={record.note} />
      </>
    )
  }

  const hasVerification = kind !== 'competition'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button onClick={back} className="text-dim hover:text-body text-sm mb-6">← Directory</button>
      <Slug scene={`PROFILE — ${(title || '').toUpperCase()}`} />
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-3xl font-semibold text-body">{title}</h2>
        <div className="flex flex-col items-end gap-2 mt-1">
          <KindBadge kind={kind} />
          {hasVerification && <VerifiedBadge record={record} />}
        </div>
      </div>
      {subtitle && <p className="text-dim mb-8">{subtitle}</p>}

      <dl className="space-y-5 mb-10">{body}</dl>

      <p className="text-dim text-xs">
        Every field is shown even when empty, so you can see exactly what is and isn't yet verified. Records carry
        their source so you can check the primary yourself.
      </p>
    </div>
  )
}

function Scripts({ scripts, setScripts }) {
  const [form, setForm] = useState({ title: '', genre: 'Crime', logline: '', pages: '' })
  const genres = ['Crime', 'Drama', 'Thriller', 'Comedy', 'Horror', 'Sci-Fi']

  const add = () => {
    if (!form.title.trim()) return
    setScripts([...scripts, { ...form, id: uid() }])
    setForm({ title: '', genre: 'Crime', logline: '', pages: '' })
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Slug scene="YOUR SCRIPTS" />
      <h2 className="text-3xl font-semibold text-body mb-8">Scripts</h2>

      <div className="bg-panel/60 border border-edge rounded-xl p-5 mb-8 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="sm:col-span-2 px-4 py-2.5 bg-ink text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60"
          />
          <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="px-3 py-2.5 bg-ink text-body rounded-lg border border-edge outline-none">
            {genres.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.logline}
          onChange={(e) => setForm({ ...form, logline: e.target.value })}
          placeholder="Logline — this feeds every query email, make it sing"
          rows={2}
          className="w-full px-4 py-2.5 bg-ink text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60"
        />
        <div className="flex justify-between items-center">
          <input
            value={form.pages}
            onChange={(e) => setForm({ ...form, pages: e.target.value })}
            placeholder="Pages"
            className="w-24 px-4 py-2.5 bg-ink text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60"
          />
          <button onClick={add} className="px-5 py-2.5 bg-accent hover:bg-accentHi transition rounded-lg text-white font-medium">
            Add script
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {scripts.length === 0 && <Empty>No scripts yet. Add your first above — title and logline are enough to start.</Empty>}
        {scripts.map((s) => (
          <div key={s.id} className="bg-panel/60 border border-edge rounded-lg p-4 flex justify-between items-start gap-4">
            <div>
              <p className="text-body font-medium">
                {s.title} <span className="text-dim font-normal">· {s.genre}{s.pages ? ` · ${s.pages}pp` : ''}</span>
              </p>
              {s.logline && <p className="text-dim text-sm mt-1 italic">"{s.logline}"</p>}
            </div>
            <button onClick={() => setScripts(scripts.filter((x) => x.id !== s.id))} className="text-dim hover:text-body text-sm">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Campaigns({ scripts, campaigns, setCampaigns, reps }) {
  const [openId, setOpenId] = useState(null)

  const create = (script) => {
    const agents = reps.map((a) => ({
      agentId: a.id,
      name: nameOf(a),
      agency: a.agency,
      tier: tierAgent(a, script),
      sentDate: null,
      response: 'No response yet',
    }))
    const c = { id: uid(), scriptId: script.id, scriptTitle: script.title, created: today(), agents }
    setCampaigns([...campaigns, c])
    setOpenId(c.id)
  }

  const update = (cid, agentId, patch) => {
    setCampaigns(
      campaigns.map((c) =>
        c.id !== cid ? c : { ...c, agents: c.agents.map((a) => (a.agentId !== agentId ? a : { ...a, ...patch })) },
      ),
    )
  }

  const open = campaigns.find((c) => c.id === openId)

  if (open) {
    const sent = open.agents.filter((a) => a.sentDate)
    const responses = sent.filter((a) => a.response !== 'No response yet')
    const positive = sent.filter((a) => POSITIVE.includes(a.response))
    const overdue = sent.filter((a) => {
      if (a.response !== 'No response yet') return false
      const due = new Date(a.sentDate)
      due.setDate(due.getDate() + 21)
      return due <= new Date()
    })
    const stats = [
      ['Sent', sent.length, 'text-body'],
      ['Responses', responses.length, 'text-body'],
      ['Positive', positive.length, 'text-accentHi'],
      ['Follow-ups due', overdue.length, overdue.length ? 'text-accentHi' : 'text-body'],
    ]
    const byTier = { Primary: [], Secondary: [], Research: [] }
    open.agents.forEach((a) => byTier[a.tier].push(a))

    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button onClick={() => setOpenId(null)} className="text-dim hover:text-body text-sm mb-6">← All campaigns</button>
        <Slug scene={`CAMPAIGN — ${open.scriptTitle.toUpperCase()}`} />
        <h2 className="text-3xl font-semibold text-body mb-6">{open.scriptTitle}</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {stats.map(([label, n, cls]) => (
            <div key={label} className="bg-panel/60 border border-edge rounded-lg px-4 py-3">
              <p className="text-dim text-xs uppercase font-slug tracking-wider">{label}</p>
              <p className={`text-2xl font-semibold mt-0.5 ${cls}`}>{n}</p>
            </div>
          ))}
        </div>

        {['Primary', 'Secondary', 'Research'].map((tier) => (
          <div key={tier} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <TierBadge tier={tier} />
              <span className="text-dim text-sm">{byTier[tier].length} {tier === 'Research' ? '· referral-only, approach differently' : ''}</span>
            </div>
            <div className="space-y-2">
              {byTier[tier].map((a) => (
                <div key={a.agentId} className="bg-panel/60 border border-edge rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-body text-sm font-medium">
                      {a.name} <span className="text-dim font-normal">· {a.agency}</span>
                    </p>
                    <p className="text-dim text-xs mt-0.5">
                      {a.sentDate ? `Sent ${a.sentDate}` : 'Not yet contacted'}
                      {a.sentDate && POSITIVE.includes(a.response) && <span className="text-accentHi"> · {a.response}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.sentDate ? (
                      <button
                        onClick={() => update(open.id, a.agentId, { sentDate: today() })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-accent/50 text-accentHi hover:bg-accent/10 transition"
                      >
                        Mark as sent
                      </button>
                    ) : (
                      <select
                        value={a.response}
                        onChange={(e) => update(open.id, a.agentId, { response: e.target.value })}
                        className="text-xs px-2 py-1.5 bg-ink text-body rounded-lg border border-edge outline-none"
                      >
                        {RESPONSES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-dim text-xs">
          In the live version, "Draft email" appears on each row — AI-drafted from your logline and the target's
          published tastes, always edited by you before sending.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Slug scene="CAMPAIGNS" />
      <h2 className="text-3xl font-semibold text-body mb-8">Campaigns</h2>

      {campaigns.length > 0 && (
        <div className="space-y-3 mb-10">
          {campaigns.map((c) => {
            const sent = c.agents.filter((a) => a.sentDate).length
            const pos = c.agents.filter((a) => POSITIVE.includes(a.response)).length
            return (
              <button
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className="w-full text-left bg-panel/60 border border-edge rounded-lg p-4 hover:border-accent/50 transition flex justify-between items-center"
              >
                <div>
                  <p className="text-body font-medium">{c.scriptTitle}</p>
                  <p className="text-dim text-sm">Started {c.created}</p>
                </div>
                <p className="text-dim text-sm">
                  {sent} sent · <span className={pos ? 'text-accentHi' : ''}>{pos} positive</span>
                </p>
              </button>
            )
          })}
        </div>
      )}

      <div className="bg-panel/60 border border-edge rounded-xl p-5">
        <p className="text-body font-medium mb-1">Start a campaign</p>
        <p className="text-dim text-sm mb-4">
          Pick a script and OUTREACH tiers the whole database for it — who to hit first, who needs a referral.
        </p>
        {scripts.length === 0 ? (
          <Empty>Add a script first — the Scripts tab takes thirty seconds.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scripts.map((s) => (
              <button
                key={s.id}
                onClick={() => create(s)}
                className="px-4 py-2 bg-accent hover:bg-accentHi transition rounded-lg text-white text-sm font-medium"
              >
                Campaign for "{s.title}"
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GamePlan({ scripts, go, reps, editors: allEditors, comps: allComps }) {
  const [scriptId, setScriptId] = useState(scripts[0]?.id || '')
  const script = scripts.find((s) => s.id === scriptId)

  if (scripts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Slug scene="GAME PLAN" />
        <h2 className="text-3xl font-semibold text-body mb-6">Game plan</h2>
        <Empty>
          Add a script first — the game plan is built from its genre and logline.{' '}
          <button onClick={() => go('scripts')} className="text-accentHi underline">Go to Scripts</button>
        </Empty>
      </div>
    )
  }

  const editors = allEditors.filter((e) => !script?.genre || e.genres.includes(script.genre))
  const comps = allComps
    .filter((c) => !script?.genre || c.genres.includes(script.genre))
    .sort((a, b) => (a.credibility === 'High' ? -1 : 1) - (b.credibility === 'High' ? -1 : 1) || String(a.deadline).localeCompare(String(b.deadline)))
  const reps_ = reps
    .map((a) => ({ ...a, tier: tierAgent(a, script) }))
    .filter((a) => a.tier === 'Primary')

  const Section = ({ n, title, sub, children }) => (
    <div className="mb-8">
      <p className="font-slug text-accent text-xs tracking-widest mb-1">STEP {n}</p>
      <p className="text-body font-medium mb-0.5">{title}</p>
      <p className="text-dim text-sm mb-3">{sub}</p>
      {children}
    </div>
  )

  const Row = ({ main, side }) => (
    <div className="bg-panel/60 border border-edge rounded-lg px-4 py-2.5 flex justify-between items-center gap-4 text-sm">
      <span className="text-body">{main}</span>
      <span className="text-dim whitespace-nowrap">{side}</span>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Slug scene="GAME PLAN" />
      <h2 className="text-3xl font-semibold text-body mb-6">Game plan</h2>

      <div className="flex items-center gap-3 mb-10">
        <span className="text-dim text-sm">For:</span>
        <select value={scriptId} onChange={(e) => setScriptId(e.target.value)} className="px-3 py-2 bg-panel text-body rounded-lg border border-edge outline-none">
          {scripts.map((s) => (
            <option key={s.id} value={s.id}>{s.title} ({s.genre})</option>
          ))}
        </select>
      </div>

      <Section n="01" title="Get it match-fit" sub={`${editors.length} script editors work in ${script?.genre || 'your genre'}. Fresh eyes before anyone important reads it.`}>
        <div className="space-y-2">
          {editors.length === 0 && <Empty>No matching editors yet.</Empty>}
          {editors.map((e) => (
            <Row key={e.id} main={`${e.name} · ${e.company}`} side={(e.submissionPolicy || '').split('·')[0]} />
          ))}
        </div>
      </Section>

      <Section n="02" title="Enter the right competitions" sub="Matched to genre, high-credibility first. Placements become query-letter ammunition.">
        <div className="space-y-2">
          {comps.length === 0 && <Empty>No matching competitions yet.</Empty>}
          {comps.slice(0, 4).map((c) => (
            <Row key={c.id} main={c.name} side={`${c.deadline} · ${c.fee}`} />
          ))}
        </div>
      </Section>

      <Section n="03" title="Query your primary targets" sub={`${reps_.length} targets are open to unsolicited ${script?.genre || ''} submissions — your first wave.`}>
        <div className="space-y-2">
          {reps_.length === 0 && <Empty>No open primary targets for this genre yet.</Empty>}
          {reps_.slice(0, 5).map((a) => (
            <Row key={a.id} main={`${nameOf(a)}${a.firstName ? ` · ${a.agency}` : ''}`} side={a.role} />
          ))}
        </div>
      </Section>

      <button onClick={() => go('campaigns')} className="px-6 py-3 bg-accent hover:bg-accentHi transition rounded-lg text-white font-medium">
        Turn this into a campaign
      </button>
      <p className="text-dim text-xs mt-4">
        Demo matching is rules-based (genre and openness). The live version layers AI over your logline, comps,
        and each target's published record — without ever needing to read your script.
      </p>
    </div>
  )
}

const BLANK_AGENT = {
  id: '', firstName: '', lastName: '', role: 'Agent', agency: '', agencyId: '', agencySize: '',
  website: '', submissionEmail: '', submissionPageUrl: '', acceptsUnsolicited: '',
  submissionPolicy: '', genres: '', notableClients: '', recentDeals: '',
  sourceUrl: '', lastVerified: '', recordStatus: 'Needs verification', aiPolicy: '', bio: '', press: '',
}

const BULK_TABLE_OPTIONS = [
  ['agencies', 'Agencies'],
  ['agents', 'People (agents)'],
  ['editors', 'Editors'],
  ['competitions', 'Competitions'],
  ['courses', 'Courses'],
]

function Admin({ session, people, refresh }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState(BLANK_AGENT)
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('single')
  const [bulkText, setBulkText] = useState('')
  const [bulkRows, setBulkRows] = useState(null)
  const [bulkTable, setBulkTable] = useState('agencies')
  const [agencyOptions, setAgencyOptions] = useState([])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    if (session) fetchAgencyOptions().then(setAgencyOptions).catch(() => {})
  }, [session])

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setStatus(error ? `Error: ${error.message}` : '')
    if (!error) setSent(true)
  }

  const loadExisting = async (id) => {
    if (!id) { setForm(BLANK_AGENT); return }
    try {
      const r = await fetchAgentRaw(id)
      setForm({
        id: r.id, firstName: r.first_name || '', lastName: r.last_name || '', role: r.role || 'Agent',
        agency: r.agency || '', agencyId: r.agency_id || '', agencySize: r.agency_size || '', website: r.website || '',
        submissionEmail: r.submission_email || '', submissionPageUrl: r.submission_page_url || '',
        acceptsUnsolicited: r.accepts_unsolicited || '', submissionPolicy: r.submission_policy || '',
        genres: (r.genres || []).join(', '), notableClients: r.notable_clients || '',
        recentDeals: r.recent_deals_notes || '', sourceUrl: r.source_url || '',
        lastVerified: r.last_verified || '', recordStatus: r.record_status || 'Needs verification',
        aiPolicy: r.ai_policy || '', bio: r.bio || '', press: r.press || '',
      })
    } catch { setStatus('Could not load that record.') }
  }

  // Picking an agency from the picker fills both the FK and the agency name.
  const pickAgency = (id) => {
    const opt = agencyOptions.find((o) => o.id === id)
    setForm((f) => ({ ...f, agencyId: id, agency: opt ? opt.name : f.agency }))
  }

  const submit = async () => {
    if (!form.id.trim() || !form.agency.trim()) { setStatus('id and agency are required.'); return }
    setStatus('Saving…')
    try {
      const id = await saveAgent(form)
      setStatus(`Saved ${id}. Live on the site now.`)
      refresh()
    } catch (e) { setStatus(`Error: ${e.message}`) }
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <Slug scene="ADMIN — SIGN IN" />
        <h2 className="text-3xl font-semibold text-body mb-6">Admin</h2>
        {sent ? (
          <p className="text-body">Check your email — a sign-in link is on its way. Clicking it brings you back here, signed in.</p>
        ) : (
          <div className="space-y-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full px-4 py-2.5 bg-panel text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60" />
            <button onClick={signIn} className="px-5 py-2.5 bg-accent hover:bg-accentHi transition rounded-lg text-white font-medium">
              Email me a sign-in link
            </button>
            {status && <p className="text-accentHi text-sm">{status}</p>}
          </div>
        )}
      </div>
    )
  }

  const nextId = 'AG-' + String(people.length + 1).padStart(3, '0')
  const inp = 'w-full px-3 py-2 bg-ink text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/50 text-sm'
  const lbl = 'text-dim text-xs uppercase font-slug tracking-wider mb-1 block'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <Slug scene="ADMIN — RECORDS" />
          <h2 className="text-3xl font-semibold text-body">Add / edit a record</h2>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-dim hover:text-body text-sm">Sign out</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setMode('single')} className={`text-sm px-4 py-1.5 rounded-lg border transition ${mode === 'single' ? 'border-accent/50 text-accentHi bg-accent/10' : 'border-edge text-dim hover:text-body'}`}>Single record (person)</button>
        <button onClick={() => setMode('bulk')} className={`text-sm px-4 py-1.5 rounded-lg border transition ${mode === 'bulk' ? 'border-accent/50 text-accentHi bg-accent/10' : 'border-edge text-dim hover:text-body'}`}>Bulk import</button>
      </div>

      {mode === 'bulk' ? (
        <div className="bg-panel/60 border border-edge rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-dim text-sm">Import into:</span>
            <select value={bulkTable} onChange={(e) => { setBulkTable(e.target.value); setBulkRows(null); setStatus('') }} className="px-3 py-2 bg-ink text-body rounded-lg border border-edge outline-none text-sm">
              {BULK_TABLE_OPTIONS.map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
            </select>
          </div>
          <p className="text-dim text-sm">Paste a JSON array of records (Claude produces these) using that table's column names. Preview appears below before anything is saved.</p>
          <textarea rows={10} className="w-full px-3 py-2 bg-ink text-body rounded-lg border border-edge focus:border-accent outline-none text-xs font-mono" value={bulkText} onChange={(e) => { setBulkText(e.target.value); setBulkRows(null); setStatus('') }} placeholder='[ {"id": "CO-001", "provider": "...", ...} ]' />
          {!bulkRows ? (
            <button onClick={() => {
              try {
                const rows = JSON.parse(bulkText)
                if (!Array.isArray(rows) || !rows.length) throw new Error('Expected a JSON array of records')
                for (const r of rows) if (!r.id) throw new Error('Every record needs an id')
                setBulkRows(rows); setStatus('')
              } catch (e) { setStatus(`Error: ${e.message}`) }
            }} className="px-5 py-2 border border-accent/50 text-accentHi hover:bg-accent/10 rounded-lg text-sm transition">Preview</button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                {bulkRows.map((r) => (
                  <p key={r.id} className="text-body text-sm">{r.id} · {r.first_name ? `${r.first_name} ${r.last_name || ''}` : (r.name || r.course_name || r.agency || r.provider || '—')} <span className="text-dim">· {r.record_status || ''}</span></p>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={async () => {
                  setStatus('Importing…')
                  try { const n = await bulkUpsert(bulkTable, bulkRows); setStatus(`Imported ${n} records into ${bulkTable}. Live now.`); setBulkRows(null); setBulkText(''); refresh() }
                  catch (e) { setStatus(`Error: ${e.message}`) }
                }} className="px-5 py-2 bg-accent hover:bg-accentHi rounded-lg text-white text-sm font-medium transition">Import {bulkRows.length} into {bulkTable}</button>
                <button onClick={() => setBulkRows(null)} className="px-4 py-2 text-dim hover:text-body text-sm">Cancel</button>
              </div>
            </div>
          )}
          {status && <p className="text-accentHi text-sm">{status}</p>}
        </div>
      ) : (
      <>
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-dim text-sm">Edit existing:</span>
        <select onChange={(e) => loadExisting(e.target.value)} className="px-3 py-2 bg-panel text-body rounded-lg border border-edge outline-none text-sm">
          <option value="">— new person —</option>
          {people.map((r) => (
            <option key={r.id} value={r.id}>{r.id} · {r.firstName} {r.lastName}</option>
          ))}
        </select>
        <span className="text-dim text-xs">next free id: {nextId}</span>
      </div>

      <div className="bg-panel/60 border border-edge rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <div><span className={lbl}>id *</span><input className={inp} value={form.id} onChange={set('id')} placeholder={nextId} /></div>
          <div><span className={lbl}>first name</span><input className={inp} value={form.firstName} onChange={set('firstName')} /></div>
          <div><span className={lbl}>last name</span><input className={inp} value={form.lastName} onChange={set('lastName')} /></div>
          <div><span className={lbl}>role</span>
            <select className={inp} value={form.role} onChange={set('role')}>
              <option>Agent</option><option>Manager</option><option>Agents Assistant</option>
            </select></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><span className={lbl}>agency (picker)</span>
            <select className={inp} value={form.agencyId} onChange={(e) => pickAgency(e.target.value)}>
              <option value="">— none / type below —</option>
              {agencyOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select></div>
          <div><span className={lbl}>agency name *</span><input className={inp} value={form.agency} onChange={set('agency')} /></div>
          <div><span className={lbl}>size</span>
            <select className={inp} value={form.agencySize} onChange={set('agencySize')}>
              <option value="">—</option><option>Boutique</option><option>Mid</option><option>Large</option>
            </select></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><span className={lbl}>website</span><input className={inp} value={form.website} onChange={set('website')} /></div>
          <div><span className={lbl}>submission email (published only)</span><input className={inp} value={form.submissionEmail} onChange={set('submissionEmail')} /></div>
        </div>
        <div><span className={lbl}>submission page url</span><input className={inp} value={form.submissionPageUrl} onChange={set('submissionPageUrl')} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><span className={lbl}>accepts unsolicited</span>
            <select className={inp} value={form.acceptsUnsolicited} onChange={set('acceptsUnsolicited')}>
              <option value="">—</option><option>Yes</option><option>No</option><option>Query letter first</option>
              <option>Closed - check back</option><option>Check agent pages</option>
            </select></div>
          <div><span className={lbl}>record status</span>
            <select className={inp} value={form.recordStatus} onChange={set('recordStatus')}>
              <option>Needs verification</option><option>Verified</option><option>Stale</option><option>Removed on request</option>
            </select></div>
        </div>
        <div><span className={lbl}>submission policy</span><textarea rows={3} className={inp} value={form.submissionPolicy} onChange={set('submissionPolicy')} /></div>
        <div><span className={lbl}>genres (comma separated)</span><input className={inp} value={form.genres} onChange={set('genres')} placeholder="Crime, Drama, Thriller" /></div>
        <div><span className={lbl}>clients & roster</span><textarea rows={2} className={inp} value={form.notableClients} onChange={set('notableClients')} /></div>
        <div><span className={lbl}>intelligence / recent deals</span><textarea rows={2} className={inp} value={form.recentDeals} onChange={set('recentDeals')} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><span className={lbl}>source url</span><input className={inp} value={form.sourceUrl} onChange={set('sourceUrl')} /></div>
          <div><span className={lbl}>last verified</span><input type="date" className={inp} value={form.lastVerified} onChange={set('lastVerified')} /></div>
        </div>
        <div><span className={lbl}>bio</span><textarea rows={3} className={inp} value={form.bio} onChange={set('bio')} placeholder="Career background, from their own agency page" /></div>
        <div><span className={lbl}>press (one per line: quote or headline, then the URL)</span><textarea rows={3} className={inp} value={form.press} onChange={set('press')} placeholder={'Named among Broadcast Hot Shots https://example.com/article'} /></div>
        <div><span className={lbl}>ai policy</span><input className={inp} value={form.aiPolicy} onChange={set('aiPolicy')} /></div>
        <div className="flex items-center justify-between pt-2 gap-4">
          <p className="text-dim text-xs max-w-sm">Data rules: identity from the organisation's own pages; contact routes only as published; source and date on everything.</p>
          <button onClick={submit} className="px-6 py-2.5 bg-accent hover:bg-accentHi transition rounded-lg text-white font-medium whitespace-nowrap">Save record</button>
        </div>
        {status && <p className="text-accentHi text-sm">{status}</p>}
      </div>
      </>
      )}
    </div>
  )
}

// hash → { admin } or { kind, id } for a profile
function parseHash() {
  const h = window.location.hash.slice(1)
  if (h === 'admin') return { admin: true, profile: null }
  const [seg, id] = h.split('/')
  const kindMap = { agency: 'agency', person: 'person', agent: 'person', editor: 'editor', course: 'course', competition: 'competition', comp: 'competition' }
  if (id && kindMap[seg]) return { admin: false, profile: { kind: kindMap[seg], id } }
  return { admin: false, profile: null }
}

export default function App() {
  const [page, setPage] = useState('home')
  const [scripts, setScriptsRaw] = useState(() => load('outreach_scripts', []))
  const [campaigns, setCampaignsRaw] = useState(() => load('outreach_campaigns', []))
  const [agencies, setAgencies] = useState([])
  const [people, setPeople] = useState([])
  const [editors, setEditors] = useState([])
  const [courses, setCourses] = useState([])
  const [comps, setComps] = useState([])
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(() => parseHash().profile)

  const refresh = () => {
    fetchAgencies().then(setAgencies).catch(() => {})
    fetchAgents().then(setPeople).catch(() => {})
    fetchEditors().then(setEditors).catch(() => {})
    fetchCourses().then(setCourses).catch(() => {})
    fetchCompetitions().then(setComps).catch(() => {})
  }

  useEffect(() => {
    refresh()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    const applyHash = () => {
      const { admin, profile: p } = parseHash()
      setProfile(p)
      if (admin) setPage('admin')
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('hashchange', applyHash) }
  }, [])

  const openProfile = (kind, id) => { window.location.hash = `${kind}/${id}` }
  const closeProfile = () => { window.location.hash = ''; setProfile(null) }

  const setScripts = (v) => { setScriptsRaw(v); save('outreach_scripts', v) }
  const setCampaigns = (v) => { setCampaignsRaw(v); save('outreach_campaigns', v) }

  useEffect(() => { window.scrollTo(0, 0) }, [page, profile])

  const tabs = [
    ['home', 'Home'],
    ['directory', 'Directory'],
    ['scripts', 'Scripts'],
    ['plan', 'Game plan'],
    ['campaigns', 'Campaigns'],
    ...(session ? [['admin', 'Admin']] : []),
  ]

  // Agencies and people are both query targets for the campaign builder.
  const queryTargets = [...agencies, ...people]
  const totalRecords = agencies.length + people.length + editors.length + courses.length + comps.length

  const profileLists = { agency: agencies, person: people, editor: editors, course: courses, competition: comps }
  const profileRecord = profile ? (profileLists[profile.kind] || []).find((r) => r.id === profile.id) : null

  return (
    <div className="min-h-screen font-sans">
      <div className="bg-accent text-white text-center text-xs font-slug tracking-widest uppercase py-1.5">
        {totalRecords > 0
          ? `Live database — ${agencies.length} agencies · ${people.length} people · verified against primary sources`
          : 'OUTREACH — verified UK database for screenwriters'}
      </div>

      <nav className="border-b border-edge bg-ink/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => { closeProfile(); setPage('home') }} className="font-slug font-bold text-xl text-body tracking-wide">
            OUTREACH<span className="text-accent animate-pulse">_</span>
          </button>
          <div className="flex gap-1">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => { closeProfile(); setPage(id) }}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  page === id && !profile ? 'text-accentHi bg-accent/10' : 'text-dim hover:text-body'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {profile ? (
        <Profile record={profileRecord} kind={profile.kind} people={people} openProfile={openProfile} back={closeProfile} />
      ) : (
        <>
          {page === 'home' && <Home go={setPage} />}
          {page === 'directory' && <Directory agencies={agencies} people={people} editors={editors} courses={courses} comps={comps} openProfile={openProfile} />}
          {page === 'scripts' && <Scripts scripts={scripts} setScripts={setScripts} />}
          {page === 'plan' && <GamePlan scripts={scripts} go={setPage} reps={queryTargets} editors={editors} comps={comps} />}
          {page === 'campaigns' && <Campaigns scripts={scripts} campaigns={campaigns} setCampaigns={setCampaigns} reps={queryTargets} />}
          {page === 'admin' && <Admin session={session} people={people} refresh={refresh} />}
        </>
      )}

      <footer className="border-t border-edge mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
          <p className="font-slug text-dim text-xs tracking-widest">FADE OUT.</p>
          <p className="text-dim text-xs">OUTREACH · Built with Claude</p>
        </div>
      </footer>
    </div>
  )
}
