// Cloudflare Worker — serves the static site AND the two APIs:
//   /names : performer registrations (Participate Now form)
//   /pass  : entry-pass requests (payment Transaction ID)
// Every record is its OWN KV entry, so 200 students registering at the same
// moment can never overwrite each other.

const MAX_REGISTRATIONS = 500;
const MAX_PASSES = 800;
const ACTIVITIES = ['Dance', 'Music', 'Extra'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const MODES = ['Solo', 'Group'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/names') return handleNames(request, env, url);
    if (url.pathname === '/pass') return handlePass(request, env, url);
    // Everything else (index.html, style.css, script.js, admin.html, images...)
    // is served straight from the static assets.
    return env.ASSETS.fetch(request);
  },
};

/* ---------------- performers ---------------- */

async function handleNames(request, env, url) {
  if (request.method === 'GET') {
    const supplied = getPassword(request, url);
    if (supplied && !passwordOk(env, supplied)) return json(401, { error: 'Wrong password' });

    const records = await listAll(env, 'reg:', toReg);
    if (supplied) return json(200, records);
    // Public list: name + activity only (no phone, no roll number).
    return json(
      200,
      records
        .filter((r) => ACTIVITIES.includes(r.activity))
        .map((r) => ({ name: r.name, activity: r.activity, mode: r.mode }))
    );
  }

  if (request.method === 'POST') {
    const body = await readBody(request);
    const name = clean(body.name, 40);
    const roll = clean(body.roll, 20);
    const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 15);
    const semester = String(body.semester || '');
    const mode = String(body.mode || '');
    const activity = String(body.activity || '');
    const team = clean(body.team, 150);

    if (!name) return json(400, { error: 'Name is required' });
    if (!roll) return json(400, { error: 'Roll number is required' });
    if (!SEMESTERS.includes(semester)) return json(400, { error: 'Choose your semester' });
    if (phone.replace(/\D/g, '').length < 10) return json(400, { error: 'Enter a valid phone number' });
    if (!MODES.includes(mode)) return json(400, { error: 'Choose Solo or Group' });
    if (!ACTIVITIES.includes(activity)) return json(400, { error: 'Choose Dance, Music or Extra' });
    if (mode === 'Group' && !team) return json(400, { error: 'Add your team members' });

    // Same person + same activity = same entry, so a double tap just updates it.
    const id = 'reg:' + (await sha256(name.toLowerCase() + '|' + phone.replace(/\D/g, '') + '|' + activity));

    const existing = await env.NAMES_KV.list({ prefix: 'reg:', limit: MAX_REGISTRATIONS + 1 });
    const already = existing.keys.some((k) => k.name === id);
    if (!already && existing.keys.length >= MAX_REGISTRATIONS) {
      return json(409, { error: 'Registrations are full' });
    }

    const time = Date.now();
    const meta = fitMeta({ n: name, r: roll, s: semester, p: phone, m: mode, a: activity, tm: team, ts: time }, 'tm');
    await env.NAMES_KV.put(
      id,
      JSON.stringify({ name, roll, semester, phone, mode, activity, team, time }),
      { metadata: meta }
    );
    return json(200, { ok: true, updated: already });
  }

  if (request.method === 'DELETE') {
    const body = await readBody(request);
    if (!passwordOk(env, getPassword(request, url, body))) return json(401, { error: 'Wrong password' });
    if (body.id && String(body.id).startsWith('reg:')) await env.NAMES_KV.delete(String(body.id));
    return json(200, { ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}

function toReg(k) {
  const m = k.metadata || {};
  return {
    id: k.name,
    name: m.n || '',
    roll: m.r || '',
    semester: m.s || '',
    phone: m.p || '',
    mode: m.m || '',
    activity: Array.isArray(m.a) ? m.a[0] || '' : m.a || '',
    team: m.tm || '',
    time: m.ts || 0,
  };
}

/* ---------------- entry passes (payment) ---------------- */

async function handlePass(request, env, url) {
  if (request.method === 'GET') {
    if (!passwordOk(env, getPassword(request, url))) return json(401, { error: 'Wrong password' });
    return json(200, await listAll(env, 'pass:', toPass));
  }

  if (request.method === 'POST') {
    const body = await readBody(request);
    const name = clean(body.name, 40);
    const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 15);
    const txn = String(body.txn || '').replace(/\s+/g, '').toUpperCase();

    if (!name) return json(400, { error: 'Name is required' });
    if (phone.replace(/\D/g, '').length < 10) return json(400, { error: 'Enter a valid phone number' });
    if (!/^[A-Z0-9]{6,30}$/.test(txn)) return json(400, { error: 'Enter a valid Transaction ID' });

    const id = 'pass:' + (await sha256(txn));
    if (await env.NAMES_KV.get(id)) {
      return json(409, { error: 'This Transaction ID has already been used' });
    }
    const existing = await env.NAMES_KV.list({ prefix: 'pass:', limit: MAX_PASSES + 1 });
    if (existing.keys.length >= MAX_PASSES) return json(409, { error: 'Passes are full' });

    const time = Date.now();
    await env.NAMES_KV.put(id, JSON.stringify({ name, phone, txn, verified: false, time }), {
      metadata: { n: name, p: phone, x: txn, v: 0, ts: time },
    });
    return json(200, { ok: true });
  }

  if (request.method === 'PUT') {
    const body = await readBody(request);
    if (!passwordOk(env, getPassword(request, url, body))) return json(401, { error: 'Wrong password' });
    const id = String(body.id || '');
    if (!id.startsWith('pass:')) return json(400, { error: 'Bad id' });
    const raw = await env.NAMES_KV.get(id);
    if (!raw) return json(404, { error: 'Not found' });
    const rec = JSON.parse(raw);
    rec.verified = Boolean(body.verified);
    await env.NAMES_KV.put(id, JSON.stringify(rec), {
      metadata: { n: rec.name, p: rec.phone, x: rec.txn, v: rec.verified ? 1 : 0, ts: rec.time },
    });
    return json(200, { ok: true });
  }

  if (request.method === 'DELETE') {
    const body = await readBody(request);
    if (!passwordOk(env, getPassword(request, url, body))) return json(401, { error: 'Wrong password' });
    if (body.id && String(body.id).startsWith('pass:')) await env.NAMES_KV.delete(String(body.id));
    return json(200, { ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}

function toPass(k) {
  const m = k.metadata || {};
  return { id: k.name, name: m.n || '', phone: m.p || '', txn: m.x || '', verified: m.v === 1, time: m.ts || 0 };
}

/* ---------------- helpers ---------------- */

function getPassword(request, url, body) {
  return request.headers.get('x-admin-password') || (body && body.password) || url.searchParams.get('password') || '';
}

function passwordOk(env, supplied) {
  return Boolean(env.ADMIN_PASSWORD) && String(supplied || '') === env.ADMIN_PASSWORD;
}

async function readBody(request) {
  try {
    return (await request.json()) || {};
  } catch (e) {
    return {};
  }
}

function clean(v, max) {
  return String(v || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

// One list call returns every record (details live in KV "metadata").
async function listAll(env, prefix, mapper) {
  const out = [];
  let cursor;
  do {
    const res = await env.NAMES_KV.list({ prefix, cursor, limit: 1000 });
    for (const k of res.keys) out.push(mapper(k));
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return out.sort((a, b) => a.time - b.time);
}

// KV metadata must stay under 1024 bytes; shorten the long field if needed.
function fitMeta(meta, longKey) {
  const size = (m) => new TextEncoder().encode(JSON.stringify(m)).length;
  while (size(meta) > 1000 && meta[longKey].length > 0) {
    meta[longKey] = meta[longKey].slice(0, Math.floor(meta[longKey].length / 2));
  }
  return meta;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(statusCode, data) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
