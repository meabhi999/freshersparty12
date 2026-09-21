// Cloudflare Worker — serves the static site AND these APIs:
//   /names  : performer registrations (Participate form)
//   /pass   : entry-pass requests (kept for later, not used by the page now)
//   /upload : photo / reel uploads from anyone  -> R2 bucket (binding: MEDIA)
//   /media  : list, view and (admin) delete the uploaded files
// Every record is its OWN KV entry, so 200 students registering at the same
// moment can never overwrite each other.

const MAX_REGISTRATIONS = 500;
const MAX_PASSES = 800;
const ACTIVITIES = ['Dance', 'Music', 'Extra'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const MODES = ['Solo', 'Group'];

// ---- media storage (R2, free plan = 10 GB) ----
const STORAGE_CAP = 9e9;        // never store more than ~9 GB
const STORAGE_TARGET = 8.5e9;   // when the cap is hit, delete the OLDEST files until we are back under this
const MAX_IMAGE = 12e6;         // 12 MB per photo
const MAX_VIDEO = 60e6;         // 60 MB per reel / video
const MAX_FILES_PER_IP_HOUR = 300;
const MAX_BYTES_PER_IP_HOUR = 3e9;
const TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/names') return handleNames(request, env, url);
    if (url.pathname === '/pass') return handlePass(request, env, url);
    if (url.pathname === '/upload') return handleUpload(request, env, url);
    if (url.pathname === '/media') return handleMedia(request, env, url);
    if (url.pathname.startsWith('/media/')) return serveMedia(request, env, url);
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


/* ---------------- photos & reels (R2) ---------------- */

async function handleUpload(request, env, url) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env.MEDIA) return json(503, { error: 'Uploads are not switched on yet' });

  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json(415, { error: 'Only photos (JPG, PNG, WEBP, GIF) and videos (MP4, MOV, WEBM) are allowed' });

  const size = Number(request.headers.get('content-length') || 0);
  if (!size) return json(411, { error: 'Could not read the file size' });
  const max = type.startsWith('video/') ? MAX_VIDEO : MAX_IMAGE;
  if (size > max) return json(413, { error: 'File is too big (max ' + Math.round(max / 1e6) + ' MB)' });

  const section = url.searchParams.get('section') === 'drive' ? 'drive' : 'reel';
  const by = clean(url.searchParams.get('name'), 40);
  const filename = clean(url.searchParams.get('filename'), 80);
  const ip = (await sha256(request.headers.get('cf-connecting-ip') || 'unknown')).slice(0, 16);

  const { objects, used } = await listObjects(env);

  // 1) simple flood protection per network
  const hourAgo = Date.now() - 3600e3;
  const mine = objects.filter((o) => o.customMetadata && o.customMetadata.ip === ip && o.uploaded.getTime() > hourAgo);
  if (mine.length >= MAX_FILES_PER_IP_HOUR || mine.reduce((s, o) => s + o.size, 0) + size > MAX_BYTES_PER_IP_HOUR) {
    return json(429, { error: 'Too many uploads right now. Please try again a little later.' });
  }

  // 2) storage guard: keep total under the cap by deleting the OLDEST files first
  if (used + size > STORAGE_CAP) {
    let total = used;
    const doomed = [];
    for (const o of [...objects].sort((a, b) => a.uploaded - b.uploaded)) {
      if (total + size <= STORAGE_TARGET) break;
      doomed.push(o.key);
      total -= o.size;
    }
    for (let i = 0; i < doomed.length; i += 1000) await env.MEDIA.delete(doomed.slice(i, i + 1000));
  }

  const key = section + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  await env.MEDIA.put(key, request.body, {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { by, filename, section, ip, ts: String(Date.now()) },
  });
  return json(200, { ok: true, key });
}

async function handleMedia(request, env, url) {
  if (request.method === 'GET') {
    const supplied = getPassword(request, url);
    if (supplied && !passwordOk(env, supplied)) return json(401, { error: 'Wrong password' });
    if (!env.MEDIA) return json(200, { items: [], ready: false });

    const { objects, used } = await listObjects(env);
    let items = objects
      .map((o) => ({
        key: o.key,
        kind: ((o.httpMetadata && o.httpMetadata.contentType) || '').startsWith('video/') ? 'video' : 'image',
        section: (o.customMetadata && o.customMetadata.section) || o.key.split('/')[0],
        by: (o.customMetadata && o.customMetadata.by) || '',
        filename: (o.customMetadata && o.customMetadata.filename) || '',
        size: o.size,
        time: Number((o.customMetadata && o.customMetadata.ts) || o.uploaded.getTime()),
      }))
      .sort((a, b) => b.time - a.time);
    if (!supplied) return json(200, { items: items.slice(0, 400), ready: true });
    return json(200, { items, ready: true, used, cap: STORAGE_CAP });
  }

  if (request.method === 'DELETE') {
    const body = await readBody(request);
    if (!passwordOk(env, getPassword(request, url, body))) return json(401, { error: 'Wrong password' });
    if (!env.MEDIA) return json(503, { error: 'Storage is not connected' });
    const keys = (Array.isArray(body.keys) ? body.keys : [body.key])
      .map(String)
      .filter((k) => /^(reel|drive)\/[\w.-]+$/.test(k));
    for (let i = 0; i < keys.length; i += 1000) await env.MEDIA.delete(keys.slice(i, i + 1000));
    return json(200, { ok: true, deleted: keys.length });
  }

  return new Response('Method not allowed', { status: 405 });
}

async function serveMedia(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  if (!env.MEDIA) return new Response('Not found', { status: 404 });
  let key = '';
  try { key = decodeURIComponent(url.pathname.slice('/media/'.length)); } catch (e) {}
  if (!/^(reel|drive)\/[\w.-]+$/.test(key)) return new Response('Not found', { status: 404 });

  const obj = await env.MEDIA.get(key, { range: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  if (url.searchParams.get('download')) {
    const name = ((obj.customMetadata && obj.customMetadata.filename) || key.split('/').pop()).replace(/[^\w.-]+/g, '_');
    headers.set('Content-Disposition', 'attachment; filename="' + name + '"');
  }
  let status = 200;
  if (obj.range && request.headers.get('range')) {
    const r = obj.range;
    const start = r.suffix !== undefined ? obj.size - r.suffix : r.offset || 0;
    const end = r.suffix !== undefined ? obj.size - 1 : r.length !== undefined ? start + r.length - 1 : obj.size - 1;
    headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + obj.size);
    headers.set('Content-Length', String(end - start + 1));
    status = 206;
  }
  return new Response(request.method === 'HEAD' ? null : obj.body, { status, headers });
}

// Lists EVERY file in the bucket (1000 per page) and adds up the size.
async function listObjects(env) {
  const objects = [];
  let cursor;
  let used = 0;
  do {
    const res = await env.MEDIA.list({ limit: 1000, cursor, include: ['customMetadata', 'httpMetadata'] });
    for (const o of res.objects) { objects.push(o); used += o.size; }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  return { objects, used };
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
