// Cloudflare Worker — serves the static site AND handles the /names API,
// replacing the old Netlify function / Pages function.

const MAX_NAMES = 500;

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
    const records = await readRecords(env);
    const password = url.searchParams.get('password');
    const isAdmin = env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD;
    const data = isAdmin ? records : records.map((r) => ({ name: r.name }));
    return json(200, data);
  }

  if (request.method === 'POST') {
    let name = '', phone = '', thought = '';
    try {
      const body = await request.json();
      name = (body.name || '').toString().trim().replace(/\s+/g, ' ').slice(0, 40);
      phone = (body.phone || '').toString().trim().slice(0, 20);
      thought = (body.thought || '').toString().trim().slice(0, 200);
    } catch (e) {}

    if (!name) return json(400, { error: 'Name is required' });

    const records = await readRecords(env);
    const alreadyThere = records.some((r) => r.name.toLowerCase() === name.toLowerCase());
    if (!alreadyThere) {
      records.push({ name, phone, thought, time: Date.now() });
      if (records.length > MAX_NAMES) records.shift();
      await env.NAMES_KV.put('names', JSON.stringify(records));
    }
    return json(200, records.map((r) => ({ name: r.name })));
  }

  if (request.method === 'DELETE') {
    let name = '', password = '';
    try {
      const body = await request.json();
      name = (body.name || '').toString().trim();
      password = (body.password || '').toString();
    } catch (e) {}

    if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
      return json(401, { error: 'Wrong password' });
    }

    let records = await readRecords(env);
    records = records.filter((r) => r.name.toLowerCase() !== name.toLowerCase());
    await env.NAMES_KV.put('names', JSON.stringify(records));
    return json(200, records);
  }

  return new Response('Method not allowed', { status: 405 });
}

async function readRecords(env) {
  const raw = await env.NAMES_KV.get('names');
  try {
    const data = raw ? JSON.parse(raw) : [];
    return data.map((r) => (typeof r === 'string' ? { name: r, phone: '', thought: '', time: 0 } : r));
  } catch {
    return [];
  }
}

function json(statusCode, data) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
