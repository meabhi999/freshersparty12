const { getStore, connectLambda } = require('@netlify/blobs');

const MAX_NAMES = 500;

exports.handler = async (event) => {
  connectLambda(event);
  const store = getStore('freshers-night');

  if (event.httpMethod === 'GET') {
    const names = await readNames(store);
    return json(200, names);
  }

  if (event.httpMethod === 'POST') {
    let name = '';
    try {
      const body = JSON.parse(event.body || '{}');
      name = (body.name || '').toString().trim().replace(/\s+/g, ' ').slice(0, 40);
    } catch (e) {}

    if (!name) return json(400, { error: 'Name is required' });

    const names = await readNames(store);
    const alreadyThere = names.some((n) => n.toLowerCase() === name.toLowerCase());
    if (!alreadyThere) {
      names.push(name);
      if (names.length > MAX_NAMES) names.shift();
      await store.set('names', JSON.stringify(names));
    }
    return json(200, names);
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

    let names = await readNames(store);
    names = names.filter((n) => n.toLowerCase() !== name.toLowerCase());
    await store.set('names', JSON.stringify(names));
    return json(200, names);
  }

  return { statusCode: 405, body: 'Method not allowed' };
};

async function readNames(store) {
  const raw = await store.get('names');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
