import { useState, useEffect } from 'react'
import { dummyAgents, dummyEditors, dummyProdcos, dummyCompetitions } from './data/dummyAgents.js'
import { fetchAgents, fetchEditors, fetchCompetitions } from './lib/db.js'

const TYPES = ['All', 'Agent', 'Manager', 'Script editor', 'Production company']
const TYPE_LABELS = {
  All: 'All types',
  Agent: 'Agents',
  Manager: 'Managers',
  'Script editor': 'Script editors',
  'Production company': 'Production companies',
}

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

const POSITIVE = ['Requested pages', 'Requested full', 'Meeting', 'Signed']
const RESPONSES = ['No response yet', 'Pass', 'Pass with feedback', ...POSITIVE]

function tierAgent(agent, script) {
  const genreMatch = script?.genre && agent.genres.includes(script.genre)
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

function Empty({ children }) {
  return <p className="text-dim text-sm border border-dashed border-edge rounded-lg p-6 text-center">{children}</p>
}

// ---------- screens ----------
function Home({ go }) {
  const steps = [
    ['01', 'Ready the script', 'Script editors in the directory. Blind coverage — coming later.'],
    ['02', 'Prove it', 'Competition list live. Matching in your Game plan.'],
    ['03', 'Get represented', 'Verified UK managers and agents. Start here.'],
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
        OUTREACH is the path from finished screenplay to represented writer: a verified database of UK agents
        and managers, and a campaign builder that turns "I should query people" into a tracked, systematic push.
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
      <button onClick={() => go('agents')} className="px-6 py-3 bg-accent hover:bg-accentHi transition rounded-lg text-white font-medium">
        Browse the database
      </button>
    </div>
  )
}

function Agents({ directory }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All')
  const [openOnly, setOpenOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  const list = directory.filter((a) => {
    const text = `${a.firstName} ${a.lastName} ${a.agency}`.toLowerCase()
    if (q && !text.includes(q.toLowerCase())) return false
    if (role !== 'All' && a.role !== role) return false
    if (openOnly && a.acceptsUnsolicited !== 'Yes') return false
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Slug scene="THE DIRECTORY" />
      <h2 className="text-3xl font-semibold text-body mb-1">{directory.length} listings across the industry</h2>
      <p className="text-dim text-sm mb-8">
        Records marked verified are checked against each organisation's own website, with a source and
        last-checked date. Demo placeholders are labelled (demo).
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or agency"
          className="flex-1 px-4 py-2.5 bg-panel text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2.5 bg-panel text-body rounded-lg border border-edge outline-none">
          {TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-dim text-sm px-2 cursor-pointer select-none">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-[#F2620F]" />
          Open to unsolicited
        </label>
      </div>

      <div className="space-y-3">
        {list.length === 0 && <Empty>No matches. Try clearing the filters.</Empty>}
        {list.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a)}
            className="w-full text-left bg-panel/60 border border-edge rounded-lg p-4 hover:border-accent/50 transition flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-body font-medium">
                {a.firstName ? `${a.firstName} ${a.lastName}` : a.agency}
                {a.firstName && <span className="text-dim font-normal"> · {a.agency}</span>}
              </p>
              <p className="text-dim text-sm mt-0.5">
                {a.role} · {a.agencySize} · {a.genres.join(', ')}
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${
                a.acceptsUnsolicited === 'Yes'
                  ? 'border-accent/40 text-accentHi bg-accent/10'
                  : 'border-edge text-dim'
              }`}
            >
              {a.acceptsUnsolicited === 'Yes' ? 'Open to unsolicited' : a.acceptsUnsolicited}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={() => setSelected(null)}>
          <div className="bg-panel border border-edge rounded-xl max-w-lg w-full p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="font-slug text-xs text-accent tracking-widest uppercase mb-1">Character profile</p>
                <h3 className="text-2xl font-semibold text-body">
                  {selected.firstName ? `${selected.firstName} ${selected.lastName}` : selected.agency}
                </h3>
                <p className="text-dim">{selected.firstName ? `${selected.agency} · ` : ''}{selected.role}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-dim hover:text-body text-xl leading-none">✕</button>
            </div>
            <dl className="space-y-3 text-sm mb-6">
              <div>
                <dt className="text-dim uppercase font-slug text-xs tracking-wider mb-1">Genres</dt>
                <dd className="text-body">{selected.genres.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-dim uppercase font-slug text-xs tracking-wider mb-1">Submissions</dt>
                <dd className="text-body">{selected.submissionPolicy}</dd>
              </div>
              <div>
                <dt className="text-dim uppercase font-slug text-xs tracking-wider mb-1">Verification</dt>
                {selected.verified ? (
                  <dd className="text-body">
                    Verified {selected.lastVerified}
                    {selected.sourceUrl && (
                      <>
                        {' · '}
                        <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="text-accentHi underline">
                          source
                        </a>
                      </>
                    )}
                  </dd>
                ) : (
                  <dd className="text-accentHi">{selected.live ? 'Needs verification' : 'Demo record — not verified, not contactable'}</dd>
                )}
              </div>
              {selected.aiPolicy && (
                <div>
                  <dt className="text-dim uppercase font-slug text-xs tracking-wider mb-1">AI policy</dt>
                  <dd className="text-body">{selected.aiPolicy}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
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
      name: `${a.firstName} ${a.lastName}`,
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
          In the live version, "Draft email" appears on each row — AI-drafted from your logline and the agent's
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

function Competitions({ comps }) {
  const sorted = [...comps].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
  const credStyle = {
    High: 'border-accent/40 text-accentHi bg-accent/10',
    Medium: 'border-edge text-dim',
    Low: 'border-edge border-dashed text-dim/70',
  }
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Slug scene="COMPETITIONS" />
      <h2 className="text-3xl font-semibold text-body mb-1">Competitions</h2>
      <p className="text-dim text-sm mb-8">
        Demo listings, sorted by deadline. The live version tracks real deadlines, fees, and which placements
        actually carry weight with reps.
      </p>
      <div className="space-y-3">
        {sorted.map((c) => (
          <div key={c.id} className="bg-panel/60 border border-edge rounded-lg p-4">
            <div className="flex justify-between items-start gap-4 mb-1.5">
              <p className="text-body font-medium">{c.name}</p>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border whitespace-nowrap ${credStyle[c.credibility]}`}>
                {c.credibility} credibility
              </span>
            </div>
            <p className="text-dim text-sm">
              Deadline {c.deadline} · Entry {c.fee} · {c.genres.length > 4 ? 'All genres' : c.genres.join(', ')}
            </p>
            <p className="text-dim/80 text-sm mt-1 italic">{c.note}</p>
          </div>
        ))}
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
          {editors.map((e) => (
            <Row key={e.id} main={`${e.firstName} ${e.lastName} · ${e.agency}`} side={e.submissionPolicy.split(';')[0]} />
          ))}
        </div>
      </Section>

      <Section n="02" title="Enter the right competitions" sub="Matched to genre, high-credibility first. Placements become query-letter ammunition.">
        <div className="space-y-2">
          {comps.slice(0, 4).map((c) => (
            <Row key={c.id} main={c.name} side={`${c.deadline} · ${c.fee}`} />
          ))}
        </div>
      </Section>

      <Section n="03" title="Query your primary targets" sub={`${reps_.length} reps are open to unsolicited ${script?.genre || ''} submissions — your first wave.`}>
        <div className="space-y-2">
          {reps_.slice(0, 5).map((a) => (
            <Row key={a.id} main={`${a.firstName} ${a.lastName} · ${a.agency}`} side={a.role} />
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


export default function App() {
  const [page, setPage] = useState('home')
  const [scripts, setScriptsRaw] = useState(() => load('outreach_scripts', []))
  const [campaigns, setCampaignsRaw] = useState(() => load('outreach_campaigns', []))
  const [liveAgents, setLiveAgents] = useState([])
  const [liveEditors, setLiveEditors] = useState([])
  const [liveComps, setLiveComps] = useState([])

  useEffect(() => {
    fetchAgents().then(setLiveAgents).catch(() => {})
    fetchEditors().then(setLiveEditors).catch(() => {})
    fetchCompetitions().then(setLiveComps).catch(() => {})
  }, [])

  const reps = liveAgents.length ? liveAgents : dummyAgents
  const editors = liveEditors.length ? liveEditors : dummyEditors
  const comps = liveComps.length ? liveComps : dummyCompetitions
  const directory = [...reps, ...editors, ...dummyProdcos]
  const liveMode = liveAgents.length > 0

  const setScripts = (v) => { setScriptsRaw(v); save('outreach_scripts', v) }
  const setCampaigns = (v) => { setCampaignsRaw(v); save('outreach_campaigns', v) }

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  const tabs = [
    ['home', 'Home'],
    ['agents', 'Directory'],
    ['competitions', 'Competitions'],
    ['scripts', 'Scripts'],
    ['plan', 'Game plan'],
    ['campaigns', 'Campaigns'],
  ]

  return (
    <div className="min-h-screen font-sans">
      <div className="bg-accent text-white text-center text-xs font-slug tracking-widest uppercase py-1.5">
        {liveMode
          ? `Live database — ${liveAgents.length} verified-sourced agent records · other sections still demo data`
          : 'Demo — all agent data on this site is fictional placeholder content'}
      </div>

      <nav className="border-b border-edge bg-ink/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => setPage('home')} className="font-slug font-bold text-xl text-body tracking-wide">
            OUTREACH<span className="text-accent animate-pulse">_</span>
          </button>
          <div className="flex gap-1">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  page === id ? 'text-accentHi bg-accent/10' : 'text-dim hover:text-body'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {page === 'home' && <Home go={setPage} />}
      {page === 'agents' && <Agents directory={directory} />}
      {page === 'competitions' && <Competitions comps={comps} />}
      {page === 'scripts' && <Scripts scripts={scripts} setScripts={setScripts} />}
      {page === 'plan' && <GamePlan scripts={scripts} go={setPage} reps={reps} editors={editors} comps={comps} />}
      {page === 'campaigns' && <Campaigns scripts={scripts} campaigns={campaigns} setCampaigns={setCampaigns} reps={reps} />}

      <footer className="border-t border-edge mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
          <p className="font-slug text-dim text-xs tracking-widest">FADE OUT.</p>
          <p className="text-dim text-xs">OUTREACH · demo build</p>
        </div>
      </footer>
    </div>
  )
}
