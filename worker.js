// Cloudflare Worker — serves the static site AND handles the /names API.
// Every registration is saved as its OWN KV entry ("reg:<id>"), so 200 students
// registering at the same moment can never overwrite each other.

const MAX_REGISTRATIONS = 500;
const CHOICES = ['Dance', 'Music', 'Extra'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/names') {
      return handleNames(request, env, url);
    }
    // Everything else (index.html, style.css, script.js, admin.html, etc.)
    // is served straight from the static assets.
    return env.ASSETS.fetch(request);
  },
};

async function handleNames(request, env, url) {
  if (request.method === 'GET') {
    const supplied = request.headers.get('x-admin-password') || url.searchParams.get('password');
    if (supplied && !passwordOk(env, supplied)) return json(401, { error: 'Wrong password' });

    const records = await listAll(env);
    if (supplied) return json(200, records);
    return json(200, records.map((r) => ({ name: r.name })));
  }

  if (request.method === 'POST') {
    let body = {};
    try { body = await request.json(); } catch (e) {}

    const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 15);
    const thought = String(body.thought || '').trim().slice(0, 150);
    const chosen = Array.isArray(body.participate) ? body.participate : [];
    const participate = CHOICES.filter((c) => chosen.includes(c));

    if (!name) return json(400, { error: 'Name is required' });
    if (phone.replace(/\D/g, '').length < 10) return json(400, { error: 'Enter a valid phone number' });
    if (!participate.length) return json(400, { error: 'Choose Dance, Music or Extra' });

    // Same name + same phone = same person, so a double tap just updates the entry.
    const id = 'reg:' + (await sha256(name.toLowerCase() + '|' + phone.replace(/\D/g, '')));

    const existing = await env.NAMES_KV.list({ prefix: 'reg:', limit: MAX_REGISTRATIONS + 1 });
    const already = existing.keys.some((k) => k.name === id);
    if (!already && existing.keys.length >= MAX_REGISTRATIONS) {
      return json(409, { error: 'Registrations are full' });
    }

    const time = Date.now();
    const meta = fitMeta({ n: name, p: phone, a: participate, t: thought, ts: time });
    await env.NAMES_KV.put(id, JSON.stringify({ name, phone, participate, thought, time }), { metadata: meta });
    return json(200, { ok: true, updated: already });
  }

  if (request.method === 'DELETE') {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const supplied = request.headers.get('x-admin-password') || body.password;
    if (!passwordOk(env, supplied)) return json(401, { error: 'Wrong password' });

    if (body.id && String(body.id).startsWith('reg:')) {
      await env.NAMES_KV.delete(String(body.id));
    } else if (body.name) {
      const wanted = String(body.name).trim().toLowerCase();
      const records = await listAll(env);
      for (const r of records) {
        if (r.name.toLowerCase() === wanted) await env.NAMES_KV.delete(r.id);
      }
    }
    return json(200, { ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}

function passwordOk(env, supplied) {
  return Boolean(env.ADMIN_PASSWORD) && String(supplied || '') === env.ADMIN_PASSWORD;
}

// One list call returns every registration (details live in KV "metadata").
async function listAll(env) {
  const out = [];
  let cursor;
  do {
    const res = await env.NAMES_KV.list({ prefix: 'reg:', cursor, limit: 1000 });
    for (const k of res.keys) {
      const m = k.metadata || {};
      out.push({
        id: k.name,
        name: m.n || '',
        phone: m.p || '',
        participate: m.a || [],
        thought: m.t || '',
        time: m.ts || 0,
      });
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return out.sort((a, b) => a.time - b.time);
}

// KV metadata must stay under 1024 bytes; shorten the thought if needed.
function fitMeta(meta) {
  const size = (m) => new TextEncoder().encode(JSON.stringify(m)).length;
  while (size(meta) > 1000 && meta.t.length > 0) {
    meta.t = meta.t.slice(0, Math.floor(meta.t.length / 2));
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
