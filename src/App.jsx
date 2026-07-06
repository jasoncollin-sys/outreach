import { useState, useEffect } from 'react'
import { dummyAgents } from './data/dummyAgents.js'

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
    ['01', 'Ready the script', 'Feedback and script services — coming after V1.'],
    ['02', 'Prove it', 'Competitions matched to your script — coming soon.'],
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

function Agents({ scripts }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All')
  const [openOnly, setOpenOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  const list = dummyAgents.filter((a) => {
    const text = `${a.firstName} ${a.lastName} ${a.agency}`.toLowerCase()
    if (q && !text.includes(q.toLowerCase())) return false
    if (role !== 'All' && a.role !== role) return false
    if (openOnly && a.acceptsUnsolicited !== 'Yes') return false
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Slug scene="AGENT DATABASE" />
      <h2 className="text-3xl font-semibold text-body mb-1">{dummyAgents.length} agents and managers</h2>
      <p className="text-dim text-sm mb-8">
        Demo records only. The real database is hand-verified against each agency's own website, with a source
        and last-checked date on every record.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or agency"
          className="flex-1 px-4 py-2.5 bg-panel text-body rounded-lg border border-edge focus:border-accent outline-none placeholder:text-dim/60"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2.5 bg-panel text-body rounded-lg border border-edge outline-none">
          <option>All</option>
          <option>Agent</option>
          <option>Manager</option>
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
                {a.firstName} {a.lastName}
                <span className="text-dim font-normal"> · {a.agency}</span>
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
                  {selected.firstName} {selected.lastName}
                </h3>
                <p className="text-dim">{selected.agency} · {selected.role}</p>
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
                <dd className="text-accentHi">Demo record — not verified, not contactable</dd>
              </div>
            </dl>
            <p className="text-dim text-xs">
              In the live version this shows the published submission route, source link, and last-verified date.
            </p>
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

function Campaigns({ scripts, campaigns, setCampaigns }) {
  const [openId, setOpenId] = useState(null)

  const create = (script) => {
    const agents = dummyAgents.map((a) => ({
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

// ---------- shell ----------
export default function App() {
  const [page, setPage] = useState('home')
  const [scripts, setScriptsRaw] = useState(() => load('outreach_scripts', []))
  const [campaigns, setCampaignsRaw] = useState(() => load('outreach_campaigns', []))

  const setScripts = (v) => { setScriptsRaw(v); save('outreach_scripts', v) }
  const setCampaigns = (v) => { setCampaignsRaw(v); save('outreach_campaigns', v) }

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  const tabs = [
    ['home', 'Home'],
    ['agents', 'Agents'],
    ['scripts', 'Scripts'],
    ['campaigns', 'Campaigns'],
  ]

  return (
    <div className="min-h-screen font-sans">
      <div className="bg-accent text-white text-center text-xs font-slug tracking-widest uppercase py-1.5">
        Demo — all agent data on this site is fictional placeholder content
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
      {page === 'agents' && <Agents scripts={scripts} />}
      {page === 'scripts' && <Scripts scripts={scripts} setScripts={setScripts} />}
      {page === 'campaigns' && <Campaigns scripts={scripts} campaigns={campaigns} setCampaigns={setCampaigns} />}

      <footer className="border-t border-edge mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
          <p className="font-slug text-dim text-xs tracking-widest">FADE OUT.</p>
          <p className="text-dim text-xs">OUTREACH · demo build</p>
        </div>
      </footer>
    </div>
  )
}
