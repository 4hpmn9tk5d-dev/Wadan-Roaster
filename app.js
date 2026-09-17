/* Wadan Roster — single-page app, no build step.
   Data lives in data/roster.json (the "db"). Edits are written back to GitHub
   through the Contents API (last write wins) and cached in localStorage. */
(() => {
'use strict';

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const uid = p => p + '-' + Math.random().toString(36).slice(2, 7);
const byId = (arr, id) => arr.find(x => x.id === id);
const fmtTime = t => { if (!t) return {h: '—', ap: ''}; const [H, M] = t.split(':').map(Number); const ap = H >= 12 ? 'PM' : 'AM'; const h = ((H + 11) % 12) + 1; return {h: `${h}:${String(M || 0).padStart(2, '0')}`, ap}; };
const fmtDate = d => { const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('en-CA', {weekday: 'short', day: 'numeric', month: 'short'}); };
const shortDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-CA', {weekday: 'short', day: 'numeric'});
const ago = iso => { if (!iso) return ''; const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; };
const I = {
  dhol: '<svg class="icn" viewBox="0 0 24 24"><path d="M6 6.5C6 5.5 7.5 4.5 12 4.5S18 5.5 18 6.5V17.5C18 18.5 16.5 19.5 12 19.5S6 18.5 6 17.5Z"/><ellipse cx="12" cy="6.5" rx="6" ry="2"/></svg>',
  tasha: '<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  zanz: '<svg class="icn" viewBox="0 0 24 24"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>',
  car: '<svg class="icn" viewBox="0 0 24 24"><path d="M5 16l1.5-5h11L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="7.5" cy="20" r="1.5"/><circle cx="16.5" cy="20" r="1.5"/></svg>',
  search: '<svg class="icn" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  up: '<svg class="icn" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg class="icn" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  edit: '<svg class="icn" viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M12.5 7.5l4 4"/></svg>',
  warn: '<svg class="icn" viewBox="0 0 24 24"><path d="M12 3l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="16.8" r=".6"/></svg>',
  info: '<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16.5" r=".6"/></svg>',
  gear: '<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
  cal: '<svg class="icn" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  people: '<svg class="icn" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.8 0 5 2.2 5 5"/></svg>',
  upload: '<svg class="icn" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  plus: '<svg class="icn" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg class="icn" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  route: '<svg class="icn" viewBox="0 0 24 24"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8 17c4 0 4-10 8-10"/></svg>',
  pin: '<svg class="icn" viewBox="0 0 24 24"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  truck: '<svg class="icn" viewBox="0 0 24 24"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>',
};

// ---------- state ----------
const LS = {settings: 'wadan.settings', db: 'wadan.db', ui: 'wadan.ui'};
let db = null;
let settings = JSON.parse(localStorage.getItem(LS.settings) || '{}');
const ui = Object.assign({view: 'days', date: null, team: 'all', mine: false, search: '', open: {}}, JSON.parse(localStorage.getItem(LS.ui) || '{}'));
let sync = {state: 'clean', msg: ''}; // clean | dirty | busy | err
let remoteSha = null;
let saveTimer = null;
let picked = null; // wadak id picked for tap-to-move on Teams board

const persistUI = () => localStorage.setItem(LS.ui, JSON.stringify({view: ui.view, date: ui.date, team: ui.team, mine: ui.mine, open: ui.open}));

// ---------- data access ----------
const wadakOf = id => byId(db.wadak, id);
const teamOf = id => byId(db.teams, id);
const insOf = id => byId(db.instruments, id);
const dates = () => [...new Set([...db.days.map(d => d.date), ...db.wadans.map(w => w.date)])].sort();
const dayOf = date => { let d = byId(db.days, date) || db.days.find(x => x.date === date); if (!d) { d = {date, available: []}; db.days.push(d); } return d; };
const isAvail = (id, date) => (db.days.find(d => d.date === date)?.available || []).includes(id);
const wadansOn = date => db.wadans.filter(w => w.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.name.localeCompare(b.name));
const counts = ids => { const c = {}; db.instruments.forEach(i => c[i.id] = 0); c.none = 0; ids.forEach(id => { const w = wadakOf(id); if (!w) return; if (w.instrument && c[w.instrument] !== undefined) c[w.instrument]++; else c.none++; }); return c; };
const me = () => settings.me || null;

// ---------- persistence ----------
function markDirty() {
  db.meta.updatedAt = new Date().toISOString();
  db.meta.updatedBy = me() || 'anonymous';
  localStorage.setItem(LS.db, JSON.stringify(db));
  sync = {state: 'dirty', msg: 'Unsaved changes'};
  clearTimeout(saveTimer);
  if (settings.token) saveTimer = setTimeout(saveToGitHub, 2500);
  render();
}
const ghUrl = () => `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${settings.path || 'data/roster.json'}`;
const ghHeaders = () => ({Authorization: 'Bearer ' + settings.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'});
const b64enc = s => btoa(unescape(encodeURIComponent(s)));
const b64dec = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ''))));

async function loadFromGitHub() {
  const r = await fetch(ghUrl() + '?ref=' + encodeURIComponent(settings.branch || 'main'), {headers: ghHeaders(), cache: 'no-store'});
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json()).message || r.statusText}`);
  const j = await r.json();
  remoteSha = j.sha;
  return JSON.parse(b64dec(j.content));
}
async function saveToGitHub() {
  if (!settings.token) return;
  sync = {state: 'busy', msg: 'Saving…'}; render();
  const body = JSON.stringify(db, null, 1);
  const attempt = async () => {
    const r = await fetch(ghUrl(), {method: 'PUT', headers: {...ghHeaders(), 'Content-Type': 'application/json'},
      body: JSON.stringify({message: `roster: ${db.meta.updatedBy} · ${new Date().toLocaleString('en-CA')}`, content: b64enc(body), sha: remoteSha || undefined, branch: settings.branch || 'main'})});
    if (r.status === 409 || r.status === 422) { // sha moved: last write wins — refetch sha and retry once
      const cur = await fetch(ghUrl() + '?ref=' + encodeURIComponent(settings.branch || 'main'), {headers: ghHeaders(), cache: 'no-store'});
      if (cur.ok) remoteSha = (await cur.json()).sha; else remoteSha = null;
      return null;
    }
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json()).message || r.statusText}`);
    return r.json();
  };
  try {
    let res = await attempt();
    if (!res) res = await attempt();
    if (!res) throw new Error('Could not resolve the file version — try again');
    remoteSha = res.content.sha;
    sync = {state: 'clean', msg: 'Saved'};
    toast('Saved to GitHub');
  } catch (e) {
    sync = {state: 'err', msg: e.message};
    toast('Save failed: ' + e.message, 5000);
  }
  render();
}
async function load() {
  const cached = JSON.parse(localStorage.getItem(LS.db) || 'null');
  try {
    if (settings.token && settings.owner && settings.repo) {
      db = await loadFromGitHub();
      if (cached && cached.meta?.updatedAt > db.meta?.updatedAt) { db = cached; sync = {state: 'dirty', msg: 'Local changes not yet saved'}; }
      else sync = {state: 'clean', msg: 'Synced'};
    } else {
      const r = await fetch('data/roster.json', {cache: 'no-store'});
      if (!r.ok) throw new Error('data/roster.json not found');
      db = await r.json();
      if (cached && cached.meta?.updatedAt > db.meta?.updatedAt) { db = cached; }
      sync = {state: 'dirty', msg: 'Read-only until GitHub is connected'};
    }
  } catch (e) {
    if (cached) { db = cached; sync = {state: 'err', msg: e.message}; }
    else { $('#app').innerHTML = `<div class="empty"><h3>Could not load the roster</h3><p>${esc(e.message)}</p></div>`; return; }
  }
  normalize();
  if (!ui.date || !dates().includes(ui.date)) ui.date = pickDefaultDate();
  render();
}
function normalize() {
  db.meta ||= {}; db.instruments ||= []; db.teams ||= []; db.wadak ||= []; db.days ||= []; db.wadans ||= [];
  db.wadak.forEach(w => { w.brings ||= {}; w.notes ||= ''; w.car = !!w.car; });
  db.wadans.forEach(w => { w.teams ||= []; w.roster ||= []; w.notes ||= ''; w.venue ||= ''; });
}
function pickDefaultDate() { const ds = dates(); const today = new Date().toISOString().slice(0, 10); return ds.find(d => d >= today) || ds[ds.length - 1] || today; }

// ---------- attention list ----------
function attention(date) {
  const out = [];
  const ws = wadansOn(date);
  const noIns = db.wadak.filter(w => !w.instrument && ws.some(x => x.roster.includes(w.id)));
  if (noIns.length) out.push({i: I.tasha, t: `${noIns.length} wadak playing today have no instrument set: ${noIns.slice(0, 4).map(w => w.name).join(', ')}${noIns.length > 4 ? '…' : ''}`, act: 'wadak'});
  ws.forEach(w => { const notes = w.roster.map(wadakOf).filter(p => p && /ride/i.test(p.notes)); if (notes.length) out.push({i: I.car, t: `<b>${esc(notes.map(p => p.name).join(', '))}</b> may need a ride — ${esc(w.name)}`}); });
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
    if (ws[i].time && ws[i].time === ws[j].time) { const both = ws[i].roster.filter(id => ws[j].roster.includes(id)).map(id => wadakOf(id)?.name).filter(Boolean); if (both.length) out.push({i: I.warn, t: `<b>${esc(both.join(', '))}</b> listed at both ${esc(ws[i].name)} and ${esc(ws[j].name)} (${fmtTime(ws[i].time).h})`}); }
  }
  db.teams.forEach(t => { if (!t.target) return; ws.filter(w => w.teams.includes(t.id) && w.teams.length === 1).forEach(w => { const c = counts(w.roster); Object.entries(t.target).forEach(([ins, n]) => { if (c[ins] < n) out.push({i: I[ins] || I.info, t: `${esc(w.name)}: ${c[ins]} ${esc(insOf(ins)?.label || ins)} on roster, team target is ${n}`}); }); }); });
  const listed = dayOf(date).available; const notAvail = new Set();
  ws.forEach(w => w.roster.forEach(id => { if (listed.length && !listed.includes(id)) notAvail.add(id); }));
  if (notAvail.size) out.push({i: I.info, t: `Rostered but not on the day's availability list: ${esc([...notAvail].map(id => wadakOf(id)?.name).filter(Boolean).join(', '))}`});
  return out;
}

// ---------- render ----------
function render() {
  persistUI();
  const app = $('#app');
  const allIds = db.wadak.map(w => w.id);
  const carCount = db.wadak.filter(w => w.car).length;
  app.innerHTML = `
  <div class="toran"></div>
  <header class="hdr">
    <div class="hdr-brand">
      <div class="hdr-badge"><svg class="icn" style="width:30px;height:30px;color:#FFF3DC" viewBox="0 0 24 24"><path d="M6 6.5C6 5.5 7.5 4.5 12 4.5S18 5.5 18 6.5V17.5C18 18.5 16.5 19.5 12 19.5S6 18.5 6 17.5Z"/><ellipse cx="12" cy="6.5" rx="6" ry="2"/><path d="M6 12h12M3 5l3 3M21 5l-3 3"/></svg></div>
      <div><h1>Wadan Roster <span>वादन वेळापत्रक</span></h1><div class="hdr-sub">${esc(db.meta.org || '')}${db.meta.event ? ' · ' + esc(db.meta.event) : ''}</div></div>
    </div>
    <div class="hdr-right">
      <div class="stat"><b>${dates().length}</b><span>Days</span></div>
      <div class="stat"><b>${db.wadans.length}</b><span>Wadans</span></div>
      <div class="stat"><b>${allIds.length}</b><span>Wadak</span></div>
      <div class="stat"><b>${carCount}</b><span>Cars</span></div>
      <button class="sync ${sync.state}" data-act="settings" title="${esc(sync.msg)}"><span class="dot"></span>${settings.token ? `${esc(sync.msg)}${db.meta.updatedAt ? ' · ' + ago(db.meta.updatedAt) + (db.meta.updatedBy ? ' by ' + esc(db.meta.updatedBy) : '') : ''}` : 'Connect GitHub to save'}</button>
      <button class="btn ghost" data-act="settings">${I.gear}<span>${me() ? esc(me()) : 'Who are you?'}</span></button>
    </div>
  </header>
  <div class="rangoli"></div>
  <nav class="nav">
    ${dates().map(d => { const ws = wadansOn(d); const n = new Set(ws.flatMap(w => w.roster)).size; return `<button class="nav-tab ${ui.view === 'days' && ui.date === d ? 'on' : ''}" data-act="day" data-date="${d}"><small>${esc(fmtDate(d))}</small><b>${ws.length} wadan${ws.length === 1 ? '' : 's'} · ${n} wadak</b></button>`; }).join('')}
    <button class="nav-tab" data-act="addDay" title="Add a day" style="min-width:0">${I.plus}</button>
    <span class="nav-spacer"></span>
    <button class="nav-link ${ui.view === 'me' ? 'on' : ''}" data-act="view" data-view="me">My day</button>
    <button class="nav-link ${ui.view === 'teams' ? 'on' : ''}" data-act="view" data-view="teams">Teams</button>
    <button class="nav-link ${ui.view === 'wadak' ? 'on' : ''}" data-act="view" data-view="wadak">Wadak directory</button>
    <button class="nav-link ${ui.view === 'import' ? 'on' : ''}" data-act="view" data-view="import">Import</button>
  </nav>
  <div class="nav-rule"></div>
  ${ui.view === 'days' ? renderDay() : ui.view === 'me' ? renderMe() : ui.view === 'teams' ? renderTeams() : ui.view === 'wadak' ? renderWadak() : renderImport()}
  <nav class="bottomnav">
    <button class="${ui.view === 'days' ? 'on' : ''}" data-act="view" data-view="days">${I.cal}Days</button>
    <button class="${ui.view === 'me' ? 'on' : ''}" data-act="view" data-view="me">${I.route}My day</button>
    <button class="${ui.view === 'teams' ? 'on' : ''}" data-act="view" data-view="teams">${I.dhol}Teams</button>
    <button class="${ui.view === 'wadak' ? 'on' : ''}" data-act="view" data-view="wadak">${I.people}Wadak</button>
    <button class="${ui.view === 'import' ? 'on' : ''}" data-act="view" data-view="import">${I.upload}Import</button>
  </nav>
  <div id="modal"></div><div id="toast"></div>`;
  if (ui.view === 'teams') wireDnD();
}

function personPill(id, ctx) {
  const w = wadakOf(id); if (!w) return '';
  const borrowed = ctx.teams?.length && w.team && !ctx.teams.includes(w.team);
  const brings = Object.entries(w.brings || {}).filter(([, n]) => n > 0);
  return `<span class="pill ${borrowed ? 'borrow' : ''} ${me() === w.name ? 'me' : ''}" title="${esc(w.notes)}">${esc(w.name)}${w.car ? I.car : ''}${brings.length ? `<small>${brings.map(([k, n]) => `${n}${k[0].toUpperCase()}`).join(' ')}</small>` : ''}${borrowed ? `<small>from ${esc(teamOf(w.team)?.short || 'other team')}</small>` : ''}</span>`;
}
function teamPill(t) { return `<span class="pill" style="background:${t.color}22;border-color:${t.color}88;color:${t.color}"><span class="tdot" style="background:${t.color}"></span>${esc(t.short)} · ${esc(t.name)}</span>`; }

function renderDay() {
  const date = ui.date;
  let ws = wadansOn(date);
  const q = ui.search.trim().toLowerCase();
  const filtered = ws.map(w => {
    let dim = false;
    if (ui.team !== 'all' && !w.teams.includes(ui.team)) dim = true;
    if (ui.mine && me() && !w.roster.some(id => wadakOf(id)?.name === me())) dim = true;
    if (q && !w.name.toLowerCase().includes(q) && !w.roster.some(id => wadakOf(id)?.name.toLowerCase().includes(q))) dim = true;
    return {w, dim};
  });
  const dayIds = new Set(ws.flatMap(w => w.roster));
  const c = counts([...dayIds]);
  const cars = [...dayIds].filter(id => wadakOf(id)?.car).length;
  const att = attention(date);
  const cards = filtered.filter(f => !f.dim).map(f => wadanCard(f.w, q)).join('');
  const hidden = filtered.filter(f => f.dim).length;
  return `
  <div class="filters">
    <label class="search">${I.search}<input type="search" placeholder="Find a wadak or wadan…" value="${esc(ui.search)}" data-act="search" aria-label="Search"></label>
    <button class="pill btn-pill ${ui.team === 'all' ? 'on' : ''}" data-act="team" data-team="all">All teams</button>
    ${db.teams.map(t => `<button class="pill btn-pill ${ui.team === t.id ? 'on' : ''}" data-act="team" data-team="${t.id}"><span class="tdot" style="background:${t.color}"></span>${esc(t.name)}</button>`).join('')}
    <span class="nav-spacer"></span>
    <label class="chk"><input type="checkbox" data-act="mine" ${ui.mine ? 'checked' : ''}>Only my wadans${me() ? '' : ' (set your name first)'}</label>
    <button class="btn pri sm" data-act="addWadan">${I.plus}Add wadan</button>
  </div>
  <div class="body">
    <div class="col">
      ${cards || `<div class="card empty"><h3>${ws.length ? 'Nothing matches the filter' : 'No wadans on ' + esc(fmtDate(date)) + ' yet'}</h3><p>${ws.length ? 'Clear the search or team filter.' : 'Add one with the button above, or import a sheet.'}</p></div>`}
      ${hidden ? `<div class="muted" style="text-align:center">${hidden} wadan${hidden > 1 ? 's' : ''} hidden by filters · <a href="#" data-act="clearFilters">show all</a></div>` : ''}
    </div>
    <div class="col rail">
      <div class="card pad" style="display:flex;flex-direction:column;gap:12px">
        <div class="lbl">${esc(fmtDate(date))} at a glance</div>
        <div class="glance">${db.instruments.map(i => `<div style="background:${i.color}"><b>${c[i.id]}</b><span>${esc(i.label)}</span></div>`).join('')}</div>
        <div class="muted">${dayIds.size} wadak rostered · ${dayOf(date).available.length} marked available · ${cars} with cars${c.none ? ` · ${c.none} without instrument` : ''}</div>
      </div>
      <div class="card pad" style="display:flex;flex-direction:column;gap:8px">
        <div class="lbl">Teams today</div>
        ${db.teams.map(t => { const n = ws.filter(w => w.teams.includes(t.id)).length; const tc = counts(db.wadak.filter(w => w.team === t.id).map(w => w.id)); return `<div class="team-row" style="background:${t.color}1f"><span class="tdot" style="background:${t.color};width:14px;height:14px"></span><div><b>${esc(t.name)}</b><span style="color:${t.color}">${esc(t.short)} · ${db.instruments.map(i => `${tc[i.id]} ${esc(i.label)}`).join(' · ')} · ${n} wadan${n === 1 ? '' : 's'}</span></div></div>`; }).join('') || '<div class="muted">No teams yet — create them on the Teams page.</div>'}
      </div>
      <div class="card pad" style="display:flex;flex-direction:column;gap:10px;border-color:#E7C25B">
        <div class="lbl" style="color:var(--warn)">Needs attention</div>
        ${att.length ? att.map(a => `<div class="attn">${a.i}<span>${a.t}</span></div>`).join('') : '<div class="muted">Nothing flagged for this day.</div>'}
      </div>
      <div class="card pad" style="display:flex;flex-direction:column;gap:8px">
        <div class="lbl">Share</div>
        <button class="btn pri" data-act="copyDay">Copy WhatsApp summary</button>
        <button class="btn" data-act="print">Print day sheet</button>
      </div>
      <div class="tagline">${esc(db.meta.tagline || '')}</div>
    </div>
  </div>`;
}

function wadanCard(w, q) {
  const open = ui.open[w.id] !== false;
  const t = fmtTime(w.time);
  const c = counts(w.roster);
  const cars = w.roster.filter(id => wadakOf(id)?.car).length;
  const brought = w.roster.reduce((n, id) => n + Object.values(wadakOf(id)?.brings || {}).reduce((a, b) => a + b, 0), 0);
  const groups = [...db.instruments.map(i => ({key: i.id, label: i.label, ids: w.roster.filter(id => wadakOf(id)?.instrument === i.id)})), {key: 'none', label: 'Instrument not set', ids: w.roster.filter(id => wadakOf(id) && !wadakOf(id).instrument)}].filter(g => g.ids.length);
  return `<article class="card wadan ${open ? '' : 'collapsed'}">
    <div class="wadan-time"><b>${t.h}</b><span>${t.ap}</span></div>
    <div class="wadan-main">
      <div class="wadan-head">
        <div><h3>${esc(w.name)}</h3>${w.venue ? `<div class="venue">${esc(w.venue)}</div>` : ''}</div>
        <div class="wadan-acts">
          <button class="iconbtn" data-act="editWadan" data-id="${w.id}" aria-label="Edit ${esc(w.name)}">${I.edit}</button>
          <button class="iconbtn" data-act="toggle" data-id="${w.id}" aria-label="${open ? 'Collapse' : 'Expand'}">${open ? I.up : I.down}</button>
        </div>
      </div>
      <div class="chips">
        ${w.teams.map(id => teamOf(id)).filter(Boolean).map(teamPill).join('')}${!w.teams.length ? '<span class="pill">Whoever is available</span>' : ''}
        ${db.instruments.map(i => `<span class="pill ${i.id}">${I[i.id] || ''}${c[i.id]} ${esc(i.label)}</span>`).join('')}
        ${c.none ? `<span class="pill none">${c.none} unassigned</span>` : ''}
        ${open ? `<span class="pill">${I.car}${cars} car${cars === 1 ? '' : 's'}${brought ? ` · ${brought} instruments carried` : ''}</span>` : ''}
      </div>
      ${open ? `<div class="roster">${groups.map(g => `<div ${g.key === 'dhol' ? 'style="grid-column:span 2"' : ''}><div class="lbl">${esc(g.label)} <span style="color:var(--ink-3);font-weight:500;letter-spacing:0;text-transform:none">· ${g.ids.length}</span></div><div class="chips">${g.ids.map(id => personPill(id, w)).join('')}</div></div>`).join('') || '<div class="muted">No one on this roster yet — tap the pencil to add wadak.</div>'}</div>
      ${w.notes ? `<div class="wadan-note">${I.info}<span>${esc(w.notes)}</span></div>` : ''}` : ''}
    </div>
  </article>`;
}

// ---------- Teams board ----------
function renderTeams() {
  const cols = [...db.teams, {id: null, name: 'No team', short: 'Unassigned', color: '#8A6A3A'}];
  const person = w => `<div class="person ${picked === w.id ? 'picked' : ''}" draggable="true" data-id="${w.id}" data-act="pick"><span class="ins" style="background:${insOf(w.instrument)?.color || '#E7C25B'}" title="${esc(insOf(w.instrument)?.label || 'No instrument')}"></span><span class="name">${esc(w.name)}</span>${w.car ? I.car : ''}<span class="meta">${insOf(w.instrument)?.label || '?'}</span></div>`;
  return `<div class="body wide"><div class="col">
    <div class="muted">Drag a wadak between columns, or tap one and choose where to move them. Changes save automatically.</div>
    <div class="board">${cols.map(t => { const ms = db.wadak.filter(w => (w.team || null) === t.id).sort((a, b) => (a.instrument || 'zz').localeCompare(b.instrument || 'zz') || a.name.localeCompare(b.name)); const c = counts(ms.map(m => m.id)); return `
      <section class="card tcol" data-team="${t.id ?? ''}">
        <div class="tcol-head"><span class="tdot" style="background:${t.color};width:14px;height:14px"></span><div style="flex-grow:1;min-width:0"><h3>${esc(t.name)}</h3><div class="tcount">${db.instruments.map(i => `<span class="pill ${i.id}" style="padding:3px 9px;font-size:12px">${c[i.id]}${t.target?.[i.id] ? '/' + t.target[i.id] : ''} ${esc(i.label)}</span>`).join('')}${c.none ? `<span class="pill none" style="padding:3px 9px;font-size:12px">${c.none} ?</span>` : ''}</div></div>${t.id ? `<button class="iconbtn" data-act="editTeam" data-id="${t.id}" aria-label="Edit team">${I.edit}</button>` : ''}</div>
        <div class="tcol-body">${ms.map(person).join('') || '<div class="muted" style="padding:10px">Drop wadak here</div>'}</div>
      </section>`; }).join('')}
      <button class="card tcol" data-act="addTeam" style="display:grid;place-items:center;min-height:120px;border-style:dashed;background:transparent;color:var(--maroon);font-weight:700;font-size:16px">${I.plus} New team</button>
    </div>
  </div></div>
  ${picked ? `<div class="movebar"><b>${esc(wadakOf(picked)?.name)}</b><span class="muted">move to</span>${cols.map(t => `<button class="btn sm" data-act="moveTo" data-team="${t.id ?? ''}"><span class="tdot" style="background:${t.color}"></span>${esc(t.name)}</button>`).join('')}<button class="btn sm" data-act="unpick">${I.x}Cancel</button></div>` : ''}`;
}
function wireDnD() {
  document.querySelectorAll('.person').forEach(el => {
    el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', el.dataset.id); e.dataTransfer.effectAllowed = 'move'; });
  });
  document.querySelectorAll('.tcol[data-team]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); moveTeam(e.dataTransfer.getData('text/plain'), col.dataset.team || null); });
  });
}
function moveTeam(id, team) {
  const w = wadakOf(id); if (!w || (w.team || null) === team) return;
  const from = teamOf(w.team)?.name || 'no team';
  w.team = team; picked = null;
  toast(`${w.name}: ${from} → ${teamOf(team)?.name || 'no team'}`);
  markDirty();
}

// ---------- Wadak directory ----------
function renderWadak() {
  const ds = dates();
  const q = ui.search.trim().toLowerCase();
  const rows = db.wadak.filter(w => !q || w.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="filters">
    <label class="search">${I.search}<input type="search" placeholder="Find a wadak…" value="${esc(ui.search)}" data-act="search" aria-label="Search"></label>
    <span class="nav-spacer"></span>
    <button class="btn pri sm" data-act="addWadak">${I.plus}Add wadak</button>
  </div>
  <div class="body wide"><div class="col">
    <div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Wadak</th><th>Plays</th><th>Team</th><th>Car</th>${db.instruments.map(i => `<th>Brings ${esc(i.label)}</th>`).join('')}<th>Available</th><th>Notes</th><th></th></tr></thead><tbody>
    ${rows.map(w => `<tr data-id="${w.id}">
      <td class="name">${esc(w.name)}${me() === w.name ? ' <span class="pill me" style="padding:2px 8px;font-size:11px">you</span>' : ''}</td>
      <td><select class="sel sm" data-field="instrument"><option value="">— not set —</option>${db.instruments.map(i => `<option value="${i.id}" ${w.instrument === i.id ? 'selected' : ''}>${esc(i.label)}</option>`).join('')}</select></td>
      <td><select class="sel sm" data-field="team"><option value="">No team</option>${db.teams.map(t => `<option value="${t.id}" ${w.team === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></td>
      <td><input type="checkbox" data-field="car" ${w.car ? 'checked' : ''} aria-label="Has car"></td>
      ${db.instruments.map(i => `<td><input class="inp sm" type="number" min="0" data-field="brings.${i.id}" value="${w.brings?.[i.id] || ''}" placeholder="0" aria-label="Brings ${esc(i.label)}"></td>`).join('')}
      <td><span class="avl">${ds.map(d => `<button class="${isAvail(w.id, d) ? 'on' : ''}" data-act="avail" data-date="${d}" title="${esc(fmtDate(d))}">${new Date(d + 'T12:00').getDate()}</button>`).join('')}</span></td>
      <td><input class="inp sm" style="width:180px" data-field="notes" value="${esc(w.notes)}" placeholder="e.g. needs ride"></td>
      <td><button class="iconbtn" style="width:36px;height:36px" data-act="renameWadak" aria-label="Rename or delete">${I.edit}</button></td>
    </tr>`).join('')}
    </tbody></table></div>
    <div class="muted">${rows.length} wadak. Availability buttons are the day-of-month; green means listed as available that day. Edits save as you go.</div>
  </div></div>`;
}

// ---------- Import ----------
function renderImport() {
  return `<div class="body wide"><div class="col">
    <div class="card pad" style="display:flex;flex-direction:column;gap:12px">
      <h2 style="font-size:24px">Import from a sheet, PDF or WhatsApp message</h2>
      <p class="muted" style="margin:0">Paste one block at a time (copy the cells out of Excel, or the text out of a PDF). Pick what the block is, check the preview, then apply. Names that already exist are matched; new ones are created.</p>
      <div class="grid3">
        <div class="field"><label>This block is</label><select class="sel" id="impType"><option value="avail">Availability list for a day</option><option value="team">Team roster (Name - Instrument (Car) - brings)</option><option value="wadans">Wadan schedule (Venue - time)</option></select></div>
        <div class="field"><label>Date</label><input class="inp" type="date" id="impDate" value="${esc(ui.date || '')}"></div>
        <div class="field"><label>Team (for rosters / schedule)</label><select class="sel" id="impTeam"><option value="">—</option>${db.teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Pasted text</label><textarea class="inp" id="impText" placeholder="19th - (23 Wadak)&#10;Anup&#10;Jayashree ( Need Ride)&#10;Manish ( 2 Dhol )&#10;Ashwini ( zanz )&#10;…"></textarea></div>
      <div><button class="btn dark" data-act="impPreview">Preview</button></div>
      <div id="impPreview"></div>
    </div>
    <div class="card pad" style="display:flex;flex-direction:column;gap:10px">
      <h2 style="font-size:22px">Whole database</h2>
      <p class="muted" style="margin:0">Download the JSON as a backup, or replace everything from a file (for example, one exported from another year).</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="exportJson">Download roster.json</button><label class="btn" style="cursor:pointer">Replace from file<input type="file" accept="application/json" data-act="importJson" class="sr"></label><button class="btn danger" data-act="clearLocal">Discard local changes</button></div>
    </div>
  </div></div>`;
}
const NAME_RE = /^\s*([A-Za-z][A-Za-z .'-]*?)\s*(?:\(([^)]*)\))?\s*(?:[-–]\s*(.*))?$/;
function matchWadak(name) {
  const n = slug(name); const first = n.split('-')[0];
  return db.wadak.find(w => w.id === n) || db.wadak.find(w => slug(w.name) === n) || db.wadak.find(w => slug(w.name).split('-')[0] === first && first.length >= 4) || null;
}
function parseBrings(s) { const b = {}; (s || '').replace(/(\d+)\s*(dhol|tasha|zanz)/gi, (_, n, k) => { b[k.toLowerCase()] = +n; return ''; }); return b; }
function parseImport() {
  const type = $('#impType').value, date = $('#impDate').value, team = $('#impTeam').value || null;
  const lines = $('#impText').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  if (type === 'wadans') {
    lines.forEach(raw => { let note = ''; const l = raw.replace(/\(([^)]*)\)\s*$/, (_, n) => { note = n.trim(); return ''; }).trim(); const m = l.match(/^(.*?)\s*[-–:]?\s*(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\s*$/i); if (!m || !/\d/.test(l)) return; let h = +m[2]; const mi = m[3] || '00'; const ap = (m[4] || '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; if (!ap && h < 8) h += 12; items.push({kind: 'wadan', name: m[1].replace(/[-–:]\s*$/, '').trim(), time: `${String(h).padStart(2, '0')}:${mi}`, date, team, note}); });
    return {type, date, team, items};
  }
  lines.forEach((l, i) => {
    if (i === 0 && /wadak|\bsept|\bsep\b|\d{1,2}(st|nd|rd|th)/i.test(l) && !NAME_RE.test(l.replace(/\d.*$/, ''))) return; // header line
    if (/^team\b/i.test(l) || /^\(?\s*pick\s*up/i.test(l)) return;
    const m = l.match(NAME_RE); if (!m) return;
    const name = m[1].trim(); if (!name || /^\d/.test(name) || name.length < 2) return;
    const paren = (m[2] || '').toLowerCase(), rest = (m[3] || '').toLowerCase(), all = (paren + ' ' + rest);
    const it = {kind: 'wadak', name, existing: matchWadak(name)};
    if (/zanz/.test(all)) it.instrument = 'zanz'; else if (/^tasha|\btasha\b(?!\s*,)/.test(rest.split(/[-–]/)[0] || '') && type === 'team') it.instrument = 'tasha'; else if (type === 'team' && /^dhol/.test(rest)) it.instrument = 'dhol';
    if (/\bcar\b/.test(all)) it.car = true;
    const br = parseBrings(type === 'team' ? rest : paren); if (Object.keys(br).length) it.brings = br;
    if (/ride/.test(all)) it.note = 'Needs a ride'; if (/truck/.test(all)) it.note = 'Pickup truck';
    const only = all.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/); if (only) it.only = +only[1];
    if (type === 'team') it.team = team;
    if (type === 'avail') it.date = date;
    items.push(it);
  });
  return {type, date, team, items};
}
let pendingImport = null;
function showImportPreview() {
  pendingImport = parseImport();
  const {items, type} = pendingImport;
  const box = $('#impPreview');
  if (!items.length) { box.innerHTML = '<div class="muted">Nothing recognised — check the block type, or paste one name per line.</div>'; return; }
  box.innerHTML = `<div class="card tbl-wrap"><table class="tbl"><thead><tr>${type === 'wadans' ? '<th>Wadan</th><th>Time</th><th>Date</th><th>Team</th>' : '<th>Name</th><th>Match</th><th>Plays</th><th>Car</th><th>Brings</th><th>Note</th>'}</tr></thead><tbody>
    ${items.map(it => type === 'wadans' ? `<tr><td class="name">${esc(it.name)}</td><td>${fmtTime(it.time).h} ${fmtTime(it.time).ap}</td><td>${esc(it.date || '?')}</td><td>${esc(teamOf(it.team)?.name || 'available wadak')}</td></tr>`
      : `<tr><td class="name">${esc(it.name)}</td><td>${it.existing ? (it.existing.name === it.name ? '<span class="pill" style="padding:2px 8px;font-size:12px">existing</span>' : `<span class="pill warn" style="padding:2px 8px;font-size:12px">→ ${esc(it.existing.name)}?</span>`) : '<span class="pill borrow" style="padding:2px 8px;font-size:12px">new</span>'}</td><td>${it.instrument ? `<span class="pill ${it.instrument}" style="padding:2px 8px;font-size:12px">${esc(it.instrument)}</span>` : '<span class="muted">keep</span>'}</td><td>${it.car ? 'yes' : ''}</td><td>${Object.entries(it.brings || {}).map(([k, n]) => `${n} ${k}`).join(', ')}</td><td>${esc(it.note || '')}${it.only ? ` (${it.only}th only)` : ''}</td></tr>`).join('')}
  </tbody></table></div>
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn pri" data-act="impApply">Apply ${items.length} ${type === 'wadans' ? 'wadans' : 'wadak'}</button><span class="muted" style="align-self:center">${type === 'avail' ? 'Marks each as available on the chosen date and creates missing wadak.' : type === 'team' ? 'Sets team, instrument, car and brings. Wadak marked "(20th)" get a note only.' : 'Creates wadans on the chosen date; roster = team members available that day.'}</span></div>`;
}
function applyImport() {
  const {items, type, date, team} = pendingImport || {}; if (!items?.length) return;
  let created = 0;
  if (type === 'wadans') {
    if (!date) return toast('Pick a date first');
    items.forEach(it => { const roster = team ? db.wadak.filter(w => w.team === team && (!dayOf(date).available.length || isAvail(w.id, date))).map(w => w.id) : [...dayOf(date).available]; db.wadans.push({id: uid('w'), date, time: it.time, name: it.name, venue: '', teams: team ? [team] : [], roster, notes: it.note || ''}); created++; });
    ui.date = date; ui.view = 'days';
  } else {
    if (type === 'avail' && !date) return toast('Pick a date first');
    items.forEach(it => {
      let w = it.existing;
      if (!w) { w = {id: slug(it.name), name: it.name, instrument: null, team: null, car: false, brings: {}, notes: ''}; if (byId(db.wadak, w.id)) w.id = uid(w.id); db.wadak.push(w); created++; }
      if (it.instrument) w.instrument = it.instrument;
      if (it.car) w.car = true;
      if (it.brings) w.brings = {...w.brings, ...it.brings};
      if (it.note && !w.notes.includes(it.note)) w.notes = (w.notes ? w.notes + '; ' : '') + it.note;
      if (it.only) { const n = `${it.only}th only`; if (!w.notes.includes(n)) w.notes = (w.notes ? w.notes + '; ' : '') + n; }
      if (type === 'team' && team && !it.only) w.team = team;
      if (type === 'avail') { const d = dayOf(date); if (!d.available.includes(w.id)) d.available.push(w.id); }
    });
    if (type === 'avail') ui.date = date;
  }
  pendingImport = null;
  toast(`Applied — ${created} new ${type === 'wadans' ? 'wadans' : 'wadak'} created`);
  markDirty();
}

// ---------- modals ----------
function modal(title, body, foot) { $('#modal').innerHTML = `<div class="modal-bg" data-act="closeModal"><div class="modal" role="dialog" aria-modal="true"><div class="modal-h"><h2>${title}</h2><button class="iconbtn" style="background:transparent;border-color:var(--maroon-2);color:#FFF3DC" data-act="closeModal" aria-label="Close">${I.x}</button></div><div class="modal-b">${body}</div><div class="modal-f">${foot}</div></div></div>`; }
const closeModal = () => { $('#modal').innerHTML = ''; };

function editWadanModal(id) {
  const w = id ? byId(db.wadans, id) : {id: null, date: ui.date, time: '', name: '', venue: '', teams: [], roster: [], notes: ''};
  const avail = new Set(dayOf(w.date).available);
  const people = [...db.wadak].sort((a, b) => { const ta = w.teams.includes(a.team) ? 0 : 1, tb = w.teams.includes(b.team) ? 0 : 1; return ta - tb || (avail.has(a.id) ? 0 : 1) - (avail.has(b.id) ? 0 : 1) || a.name.localeCompare(b.name); });
  modal(id ? 'Edit wadan' : 'New wadan', `
    <div class="grid2">
      <div class="field"><label>Name</label><input class="inp" id="wName" value="${esc(w.name)}" placeholder="Oakville Yuva"></div>
      <div class="field"><label>Venue / address</label><input class="inp" id="wVenue" value="${esc(w.venue)}"></div>
      <div class="field"><label>Date</label><input class="inp" type="date" id="wDate" value="${esc(w.date)}"></div>
      <div class="field"><label>Time</label><input class="inp" type="time" id="wTime" value="${esc(w.time)}"></div>
    </div>
    <div class="field"><label>Teams performing</label><div class="chips">${db.teams.map(t => `<label class="pill btn-pill"><input type="checkbox" class="wTeam" value="${t.id}" ${w.teams.includes(t.id) ? 'checked' : ''}><span class="tdot" style="background:${t.color}"></span>${esc(t.name)}</label>`).join('')}</div></div>
    <div class="field"><label>Notes</label><input class="inp" id="wNotes" value="${esc(w.notes)}" placeholder="e.g. Team A at 6:30, Team B at 7:00"></div>
    <div class="field"><label>Roster (${w.roster.length} selected) <span style="font-weight:500;color:var(--ink-3)">— faded names aren't on the availability list for this day</span></label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><button class="btn sm" data-act="rosterTeam">Select team members</button><button class="btn sm" data-act="rosterAvail">Select all available</button><button class="btn sm" data-act="rosterNone">Clear</button></div>
      <div class="picker" id="wPicker">${people.map(p => `<label class="${avail.has(p.id) ? '' : 'na'}"><input type="checkbox" class="wRoster" value="${p.id}" ${w.roster.includes(p.id) ? 'checked' : ''}><span class="ins" style="background:${insOf(p.instrument)?.color || '#E7C25B'}"></span><span style="flex-grow:1">${esc(p.name)}</span><span class="muted" style="font-size:12px">${esc(teamOf(p.team)?.short || '')}</span></label>`).join('')}</div>
    </div>`,
    `${id ? `<button class="btn danger" data-act="deleteWadan" data-id="${id}">Delete wadan</button><span class="nav-spacer"></span>` : ''}<button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveWadan" data-id="${id || ''}">Save wadan</button>`);
}
function saveWadan(id) {
  const name = $('#wName').value.trim(); if (!name) return toast('Give the wadan a name');
  const w = id ? byId(db.wadans, id) : (() => { const n = {id: uid('w')}; db.wadans.push(n); return n; })();
  Object.assign(w, {name, venue: $('#wVenue').value.trim(), date: $('#wDate').value || ui.date, time: $('#wTime').value, notes: $('#wNotes').value.trim(),
    teams: [...document.querySelectorAll('.wTeam:checked')].map(x => x.value), roster: [...document.querySelectorAll('.wRoster:checked')].map(x => x.value)});
  ui.date = w.date; ui.view = 'days'; closeModal(); markDirty();
}
function editTeamModal(id) {
  const t = id ? teamOf(id) : {id: null, name: '', short: `Team ${String.fromCharCode(65 + db.teams.length)}`, color: ['#D9541A', '#1F6F5B', '#2F4B8F', '#8F2F7A', '#B8862B'][db.teams.length % 5], target: {}, transport: ''};
  modal(id ? 'Edit team' : 'New team', `
    <div class="grid2">
      <div class="field"><label>Team name</label><input class="inp" id="tName" value="${esc(t.name)}" placeholder="Raigad Sardars"></div>
      <div class="field"><label>Short label</label><input class="inp" id="tShort" value="${esc(t.short)}"></div>
      <div class="field"><label>Colour</label><input class="inp" type="color" id="tColor" value="${esc(t.color)}" style="height:44px"></div>
      <div class="field"><label>Transport note</label><input class="inp" id="tTransport" value="${esc(t.transport || '')}" placeholder="Pickup truck, 5 rides"></div>
    </div>
    <div class="field"><label>Target size per wadan</label><div class="grid3">${db.instruments.map(i => `<div class="field"><label>${esc(i.label)}</label><input class="inp" type="number" min="0" data-target="${i.id}" value="${t.target?.[i.id] ?? ''}"></div>`).join('')}</div></div>`,
    `${id ? `<button class="btn danger" data-act="deleteTeam" data-id="${id}">Delete team</button><span class="nav-spacer"></span>` : ''}<button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveTeam" data-id="${id || ''}">Save team</button>`);
}
function saveTeam(id) {
  const name = $('#tName').value.trim(); if (!name) return toast('Give the team a name');
  const t = id ? teamOf(id) : (() => { const n = {id: uid('t')}; db.teams.push(n); return n; })();
  const target = {}; document.querySelectorAll('[data-target]').forEach(el => { if (el.value !== '') target[el.dataset.target] = +el.value; });
  Object.assign(t, {name, short: $('#tShort').value.trim() || name, color: $('#tColor').value, transport: $('#tTransport').value.trim(), target});
  closeModal(); markDirty();
}
function wadakModal(id) {
  const w = id ? wadakOf(id) : {name: ''};
  modal(id ? 'Rename wadak' : 'New wadak', `<div class="field"><label>Name</label><input class="inp" id="pName" value="${esc(w.name)}" autofocus></div>${id ? '' : `<div class="grid2"><div class="field"><label>Plays</label><select class="sel" id="pIns"><option value="">— not set —</option>${db.instruments.map(i => `<option value="${i.id}">${esc(i.label)}</option>`).join('')}</select></div><div class="field"><label>Team</label><select class="sel" id="pTeam"><option value="">No team</option>${db.teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div></div>`}`,
    `${id ? `<button class="btn danger" data-act="deleteWadak" data-id="${id}">Remove from roster</button><span class="nav-spacer"></span>` : ''}<button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveWadak" data-id="${id || ''}">Save</button>`);
}
function settingsModal() {
  modal('You & GitHub sync', `
    <div class="field"><label>Your name (as it appears in the roster)</label><input class="inp" id="sMe" list="names" value="${esc(settings.me || '')}" placeholder="Yogesh"><datalist id="names">${db.wadak.map(w => `<option value="${esc(w.name)}">`).join('')}</datalist></div>
    <p class="muted" style="margin:0">Edits are written straight to <code>data/roster.json</code> in your repo. Last write wins. Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">fine-grained token</a> for just this repo with <b>Contents: Read and write</b>. It stays in this browser only.</p>
    <div class="grid2">
      <div class="field"><label>Repo owner</label><input class="inp" id="sOwner" value="${esc(settings.owner || '')}" placeholder="yogesh"></div>
      <div class="field"><label>Repo name</label><input class="inp" id="sRepo" value="${esc(settings.repo || '')}" placeholder="wadan-roster"></div>
      <div class="field"><label>Branch</label><input class="inp" id="sBranch" value="${esc(settings.branch || 'main')}"></div>
      <div class="field"><label>File path</label><input class="inp" id="sPath" value="${esc(settings.path || 'data/roster.json')}"></div>
    </div>
    <div class="field"><label>Personal access token</label><input class="inp" type="password" id="sToken" value="${esc(settings.token || '')}" placeholder="github_pat_…" autocomplete="off"></div>
    <div class="muted">Status: ${esc(sync.msg || '—')}${db.meta.updatedAt ? ` · last change ${ago(db.meta.updatedAt)} by ${esc(db.meta.updatedBy || '?')}` : ''}</div>`,
    `<button class="btn" data-act="reload">Reload from GitHub</button><button class="btn" data-act="saveNow" ${settings.token ? '' : 'disabled'}>Save now</button><span class="nav-spacer"></span><button class="btn pri" data-act="saveSettings">Save settings</button>`);
}


// ---------- My day ----------
function myPlan(id) {
  const w = wadakOf(id); if (!w) return null;
  const days = dates().map(date => {
    const stops = wadansOn(date).filter(x => x.roster.includes(id));
    const legs = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      const gap = (a.time && b.time) ? (toMin(b.time) - toMin(a.time)) : null;
      const same = slug(a.venue || a.name) === slug(b.venue || b.name);
      const drivers = b.roster.filter(x => x !== id && a.roster.includes(x) && wadakOf(x)?.car).map(x => wadakOf(x).name);
      legs.push({from: a, to: b, gap, same, drivers});
    }
    return {date, stops, legs, available: isAvail(id, date)};
  }).filter(d => d.stops.length || d.available);
  return {w, days};
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const fmtGap = m => m == null ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;

function renderMe() {
  const name = settings.me || '';
  const w = db.wadak.find(x => x.name.toLowerCase() === name.toLowerCase());
  const picker = `<div class="card pad" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
    <div class="field" style="flex-grow:1;min-width:220px"><label>Who are you?</label><input class="inp" id="meName" list="meNames" value="${esc(name)}" placeholder="Start typing your name…" autocomplete="off"><datalist id="meNames">${db.wadak.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist></div>
    <button class="btn pri" data-act="setMe">Show my day</button>
  </div>`;
  if (!w) return `<div class="body wide"><div class="col">${picker}${name ? `<div class="card empty"><h3>No wadak called "${esc(name)}"</h3><p>Pick a name from the list, or add yourself in the Wadak directory.</p></div>` : `<div class="card empty"><h3>${esc(db.meta.tagline || '')}</h3><p>Enter your name to see every wadan you're in, what you play, and how you get between them.</p></div>`}</div></div>`;
  const plan = myPlan(w.id);
  const ins = insOf(w.instrument);
  const team = teamOf(w.team);
  const total = plan.days.reduce((n, d) => n + d.stops.length, 0);
  const brings = Object.entries(w.brings || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${insOf(k)?.label || k}`).join(', ');
  let k = 0; // global animation index
  const dayBlocks = plan.days.map(d => {
    if (!d.stops.length) return `<section class="card pad my-day" style="animation-delay:${k++ * .35}s"><h3 class="disp" style="font-size:22px">${esc(fmtDate(d.date))}</h3><div class="muted">You're marked available but not on any wadan yet.</div></section>`;
    const first = d.stops[0], last = d.stops[d.stops.length - 1];
    const span = (first.time && last.time) ? fmtGap(toMin(last.time) - toMin(first.time) + 60) : '';
    const items = [];
    d.stops.forEach((s, i) => {
      const t = fmtTime(s.time); const c = counts(s.roster);
      const others = s.roster.filter(x => x !== w.id && wadakOf(x)?.instrument === w.instrument).length;
      items.push(`<div class="my-stop" style="animation-delay:${k++ * .35}s">
        <div class="my-node"><span class="my-num">${i + 1}</span></div>
        <div class="my-body">
          <div class="my-time">${t.h} <small>${t.ap}</small></div>
          <h3>${esc(s.name)}</h3>${s.venue ? `<div class="muted">${I.pin}${esc(s.venue)}</div>` : ''}
          <div class="chips" style="margin-top:8px">
            <span class="pill ${w.instrument || 'none'}">${I[w.instrument] || ''}You on ${esc(ins?.label || 'instrument not set')}${others ? ` <small>with ${others} other${others > 1 ? 's' : ''}</small>` : ''}</span>
            ${s.teams.map(id => teamOf(id)).filter(Boolean).map(teamPill).join('')}
            <span class="pill">${db.instruments.map(i => `${c[i.id]}${i.label[0]}`).join(' · ')} · ${s.roster.length} wadak</span>
          </div>
          ${s.notes ? `<div class="muted" style="margin-top:6px">${I.info}${esc(s.notes)}</div>` : ''}
        </div></div>`);
      const leg = d.legs[i]; if (!leg) return;
      let text, cls = '';
      if (leg.same) text = `Stay put — next set is here${leg.gap != null ? ' in ' + fmtGap(leg.gap) : ''}`;
      else if (leg.gap != null && leg.gap <= 0) { text = `Same start time as the next wadan — you can't be at both`; cls = 'bad'; }
      else { text = `${w.car ? 'Drive' : 'Travel'} to ${esc(leg.to.venue || leg.to.name)}${leg.gap != null ? ` · ${fmtGap(leg.gap)} between start times` : ''}`; if (leg.gap != null && leg.gap < 90) cls = 'tight'; }
      const ride = !w.car && !leg.same ? (leg.drivers.length ? `Ride with ${esc(leg.drivers.slice(0, 3).join(', '))}${leg.drivers.length > 3 ? ' or ' + (leg.drivers.length - 3) + ' others' : ''} — they're on both` : 'No one with a car is on both wadans — arrange a ride') : '';
      items.push(`<div class="my-leg ${cls}" style="animation-delay:${k++ * .35}s"><div class="my-road"><span class="my-car">${I[w.car ? 'car' : 'route']}</span></div><div class="my-legtxt"><b>${text}</b>${ride ? `<div class="muted">${ride}</div>` : ''}</div></div>`);
    });
    return `<section class="card pad my-day" style="animation-delay:${(k - items.length) * .35}s">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h3 class="disp" style="font-size:24px">${esc(fmtDate(d.date))}</h3><span class="muted">${d.stops.length} wadan${d.stops.length > 1 ? 's' : ''}${span ? ' · about ' + span + ' out' : ''}${first.time ? ' · be at ' + esc(first.name) + ' by ' + fmtTime(first.time).h + ' ' + fmtTime(first.time).ap : ''}</span></div>
      <div class="my-line">${items.join('')}</div>
    </section>`;
  }).join('');
  return `<div class="body">
    <div class="col">${picker}${dayBlocks || '<div class="card empty"><h3>You are not on any wadan yet</h3><p>Ask the organiser, or add yourself from a wadan\'s pencil.</p></div>'}</div>
    <div class="col rail">
      <div class="card pad my-sum" style="display:flex;flex-direction:column;gap:10px">
        <div class="lbl">Your summary</div>
        <div class="disp" style="font-size:28px;line-height:1.1">${esc(w.name)}</div>
        <div class="chips"><span class="pill ${w.instrument || 'none'}">${I[w.instrument] || ''}${esc(ins?.label || 'Instrument not set')}</span>${team ? teamPill(team) : '<span class="pill">No team</span>'}${w.car ? `<span class="pill">${I.car}Driving</span>` : `<span class="pill warn">${I.car}Needs rides</span>`}</div>
        <div class="glance"><div style="background:var(--maroon)"><b>${total}</b><span>wadans</span></div><div style="background:var(--kesari)"><b>${plan.days.filter(d => d.stops.length).length}</b><span>days</span></div><div style="background:var(--gold)"><b>${plan.days.reduce((n, d) => n + d.legs.filter(l => !l.same).length, 0)}</b><span>trips</span></div></div>
        ${brings ? `<div class="muted">${I.info}You bring ${esc(brings)}.</div>` : ''}
        ${w.notes ? `<div class="muted">${I.info}${esc(w.notes)}</div>` : ''}
        <div class="muted" style="white-space:pre-line;border-top:1px dashed var(--line);padding-top:10px">${esc(mySummaryText(plan, true))}</div>
        <button class="btn pri" data-act="copyMe">Copy my summary</button>
      </div>
      <div class="tagline">${esc(db.meta.tagline || '')}</div>
    </div>
  </div>`;
}
function mySummaryText(plan, short) {
  const w = plan.w; const lines = [];
  if (!short) lines.push(`*${w.name} — ${db.meta.event || 'Wadan'}*`, `${insOf(w.instrument)?.label || 'Instrument not set'}${teamOf(w.team) ? ' · ' + teamOf(w.team).name : ''}${w.car ? ' · driving' : ''}`, '');
  plan.days.forEach(d => {
    if (!d.stops.length) return;
    lines.push(`${short ? '' : '*'}${fmtDate(d.date)}${short ? '' : '*'}`);
    d.stops.forEach((s, i) => { const t = fmtTime(s.time); lines.push(`${t.h} ${t.ap} — ${s.name}${s.venue ? ' (' + s.venue + ')' : ''}`); const l = d.legs[i]; if (l && !l.same) lines.push(`   ↓ ${w.car ? 'drive' : 'ride'} to ${l.to.venue || l.to.name}${l.gap != null ? ', ' + fmtGap(l.gap) : ''}`); });
    lines.push('');
  });
  if (!short) lines.push(db.meta.tagline || '');
  return lines.join('\n').trim();
}

// ---------- WhatsApp summary ----------
function daySummary(date) {
  const lines = [`*${db.meta.event || 'Wadan'} — ${fmtDate(date)}*`, ''];
  wadansOn(date).forEach(w => {
    const t = fmtTime(w.time); const c = counts(w.roster);
    lines.push(`*${t.h} ${t.ap} · ${w.name}*${w.venue ? ` (${w.venue})` : ''}`);
    if (w.teams.length) lines.push(w.teams.map(id => teamOf(id)?.name).filter(Boolean).join(' + '));
    lines.push(db.instruments.map(i => `${c[i.id]} ${i.label}`).join(' · '));
    db.instruments.forEach(i => { const ids = w.roster.filter(id => wadakOf(id)?.instrument === i.id); if (ids.length) lines.push(`${i.label}: ${ids.map(id => wadakOf(id).name + (wadakOf(id).car ? ' 🚗' : '')).join(', ')}`); });
    const none = w.roster.filter(id => wadakOf(id) && !wadakOf(id).instrument); if (none.length) lines.push(`Also: ${none.map(id => wadakOf(id).name).join(', ')}`);
    if (w.notes) lines.push(`_${w.notes}_`);
    lines.push('');
  });
  lines.push(db.meta.tagline || '');
  return lines.join('\n');
}

// ---------- toast ----------
let toastTimer;
function toast(msg, ms = 2200) { const t = $('#toast'); if (!t) return; t.innerHTML = `<div class="toast">${esc(msg)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.innerHTML = ''; }, ms); }

// ---------- events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'file')) return; // handled on change
  if (act === 'closeModal' && el.classList.contains('modal-bg') && e.target !== el) return; // backdrop closes only when clicked directly
  switch (act) {
    case 'day': ui.date = el.dataset.date; ui.view = 'days'; render(); break;
    case 'view': ui.view = el.dataset.view; ui.search = ''; picked = null; render(); break;
    case 'team': ui.team = el.dataset.team; render(); break;
    case 'clearFilters': e.preventDefault(); ui.team = 'all'; ui.mine = false; ui.search = ''; render(); break;
    case 'toggle': ui.open[id] = ui.open[id] === false; render(); break;
    case 'addDay': { const d = prompt('New day (YYYY-MM-DD)', ui.date || ''); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { dayOf(d); ui.date = d; ui.view = 'days'; markDirty(); } break; }
    case 'addWadan': editWadanModal(null); break;
    case 'editWadan': editWadanModal(id); break;
    case 'saveWadan': saveWadan(id || null); break;
    case 'deleteWadan': if (confirm('Delete this wadan?')) { db.wadans = db.wadans.filter(w => w.id !== id); closeModal(); markDirty(); } break;
    case 'rosterTeam': { const teams = [...document.querySelectorAll('.wTeam:checked')].map(x => x.value); document.querySelectorAll('.wRoster').forEach(cb => { const p = wadakOf(cb.value); if (teams.includes(p?.team)) cb.checked = true; }); break; }
    case 'rosterAvail': { const d = $('#wDate').value; document.querySelectorAll('.wRoster').forEach(cb => { if (isAvail(cb.value, d)) cb.checked = true; }); break; }
    case 'rosterNone': document.querySelectorAll('.wRoster').forEach(cb => cb.checked = false); break;
    case 'addTeam': editTeamModal(null); break;
    case 'editTeam': editTeamModal(id); break;
    case 'saveTeam': saveTeam(id || null); break;
    case 'deleteTeam': if (confirm('Delete this team? Its wadak become unassigned.')) { db.teams = db.teams.filter(t => t.id !== id); db.wadak.forEach(w => { if (w.team === id) w.team = null; }); db.wadans.forEach(w => w.teams = w.teams.filter(t => t !== id)); closeModal(); markDirty(); } break;
    case 'pick': picked = picked === id ? null : id; render(); break;
    case 'unpick': picked = null; render(); break;
    case 'moveTo': if (picked) moveTeam(picked, el.dataset.team || null); break;
    case 'addWadak': wadakModal(null); break;
    case 'renameWadak': wadakModal(el.closest('tr').dataset.id); break;
    case 'saveWadak': {
      const name = $('#pName').value.trim(); if (!name) return toast('Name is required');
      if (id) { wadakOf(id).name = name; } else { const w = {id: slug(name), name, instrument: $('#pIns').value || null, team: $('#pTeam').value || null, car: false, brings: {}, notes: ''}; if (byId(db.wadak, w.id)) w.id = uid(w.id); db.wadak.push(w); }
      closeModal(); markDirty(); break;
    }
    case 'deleteWadak': if (confirm('Remove this wadak from every roster and list?')) { db.wadak = db.wadak.filter(w => w.id !== id); db.days.forEach(d => d.available = d.available.filter(x => x !== id)); db.wadans.forEach(w => w.roster = w.roster.filter(x => x !== id)); closeModal(); markDirty(); } break;
    case 'avail': { const wid = el.closest('tr').dataset.id, d = dayOf(el.dataset.date); const i = d.available.indexOf(wid); if (i >= 0) d.available.splice(i, 1); else d.available.push(wid); markDirty(); break; }
    case 'impPreview': showImportPreview(); break;
    case 'impApply': applyImport(); break;
    case 'exportJson': { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], {type: 'application/json'})); a.download = 'roster.json'; a.click(); break; }
    case 'clearLocal': if (confirm('Throw away local unsaved changes and reload?')) { localStorage.removeItem(LS.db); location.reload(); } break;
    case 'setMe': settings.me = $('#meName').value.trim(); localStorage.setItem(LS.settings, JSON.stringify(settings)); render(); break;
    case 'copyMe': { const w = db.wadak.find(x => x.name.toLowerCase() === (settings.me || '').toLowerCase()); if (w) navigator.clipboard.writeText(mySummaryText(myPlan(w.id), false)).then(() => toast('Copied — paste it into WhatsApp'), () => toast('Could not copy')); break; }
    case 'copyDay': navigator.clipboard.writeText(daySummary(ui.date)).then(() => toast('Copied — paste it into WhatsApp'), () => toast('Could not copy')); break;
    case 'print': window.print(); break;
    case 'settings': settingsModal(); break;
    case 'saveSettings': settings = {me: $('#sMe').value.trim(), owner: $('#sOwner').value.trim(), repo: $('#sRepo').value.trim(), branch: $('#sBranch').value.trim() || 'main', path: $('#sPath').value.trim() || 'data/roster.json', token: $('#sToken').value.trim()}; localStorage.setItem(LS.settings, JSON.stringify(settings)); closeModal(); toast('Settings saved'); if (settings.token) load(); else render(); break;
    case 'reload': closeModal(); localStorage.removeItem(LS.db); load(); break;
    case 'saveNow': closeModal(); saveToGitHub(); break;
    case 'closeModal': closeModal(); break;
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.act === 'mine') { ui.mine = el.checked; render(); return; }
  if (el.dataset.act === 'importJson') { const f = el.files[0]; if (!f) return; f.text().then(t => { try { const j = JSON.parse(t); if (!j.wadak || !j.wadans) throw new Error('Not a roster file'); db = j; normalize(); toast('Roster replaced'); markDirty(); } catch (err) { toast('Could not read file: ' + err.message, 4000); } }); return; }
  const tr = el.closest('tr[data-id]'); if (!tr || !el.dataset.field) return;
  const w = wadakOf(tr.dataset.id); if (!w) return;
  const f = el.dataset.field;
  if (f === 'car') w.car = el.checked;
  else if (f.startsWith('brings.')) { const k = f.slice(7); if (+el.value > 0) w.brings[k] = +el.value; else delete w.brings[k]; }
  else w[f] = el.value || (f === 'notes' ? '' : null);
  db.meta.updatedAt = new Date().toISOString(); db.meta.updatedBy = me() || 'anonymous';
  localStorage.setItem(LS.db, JSON.stringify(db));
  sync = {state: 'dirty', msg: 'Unsaved changes'}; clearTimeout(saveTimer); if (settings.token) saveTimer = setTimeout(saveToGitHub, 2500);
  $('.sync')?.setAttribute('class', 'sync dirty'); // keep focus in the table: no full re-render
});
document.addEventListener('input', e => { if (e.target.dataset.act === 'search') { ui.search = e.target.value; const pos = e.target.selectionStart; render(); const inp = $('[data-act=search]'); if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); } } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'meName') { $('[data-act=setMe]')?.click(); return; } if (e.key === 'Escape' && $('#modal').innerHTML) closeModal(); });
window.addEventListener('beforeunload', e => { if (sync.state === 'dirty' && settings.token) { e.preventDefault(); e.returnValue = ''; } });

load();
})();
