const { getStore, connectLambda } = require('@netlify/blobs');

const MAX_NAMES = 500;

exports.handler = async (event) => {
  connectLambda(event);
  const store = getStore('freshers-night');

  if (event.httpMethod === 'GET') {
    const records = await readRecords(store);
    const qs = event.queryStringParameters || {};
    const isAdmin = process.env.ADMIN_PASSWORD && qs.password === process.env.ADMIN_PASSWORD;
    const data = isAdmin ? records : records.map((r) => ({ name: r.name }));
    return json(200, data);
  }

  if (event.httpMethod === 'POST') {
    let name = '', phone = '', thought = '';
    try {
      const body = JSON.parse(event.body || '{}');
      name = (body.name || '').toString().trim().replace(/\s+/g, ' ').slice(0, 40);
      phone = (body.phone || '').toString().trim().slice(0, 20);
      thought = (body.thought || '').toString().trim().slice(0, 200);
    } catch (e) {}

    if (!name) return json(400, { error: 'Name is required' });

    const records = await readRecords(store);
    const alreadyThere = records.some((r) => r.name.toLowerCase() === name.toLowerCase());
    if (!alreadyThere) {
      records.push({ name, phone, thought, time: Date.now() });
      if (records.length > MAX_NAMES) records.shift();
      await store.set('names', JSON.stringify(records));
    }
    return json(200, records.map((r) => ({ name: r.name })));
  }

  if (event.httpMethod === 'DELETE') {
    let name = '', password = '';
    try {
      const body = JSON.parse(event.body || '{}');
      name = (body.name || '').toString().trim();
      password = (body.password || '').toString();
    } catch (e) {}

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return json(401, { error: 'Wrong password' });
    }

    let records = await readRecords(store);
    records = records.filter((r) => r.name.toLowerCase() !== name.toLowerCase());
    await store.set('names', JSON.stringify(records));
    return json(200, records);
  }

  return { statusCode: 405, body: 'Method not allowed' };
};

async function readRecords(store) {
  const raw = await store.get('names');
  try {
    const data = raw ? JSON.parse(raw) : [];
    return data.map((r) => (typeof r === 'string' ? { name: r, phone: '', thought: '', time: 0 } : r));
  } catch {
    return [];
  }
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data),
  };
}
