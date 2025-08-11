// /api/orders.js
import { redis } from '../lib/redis.js';

// simple per‑IP rate limit: 10 req / 60s
async function rateLimit(ip) {
  const key = `rl:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60);
  return n <= 10;
}

function validate(body) {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('Body must be JSON');
  const { items, totals, customer } = body || {};
  if (!Array.isArray(items) || !items.length) errors.push('items[] required');
  if (!totals || typeof totals !== 'object') errors.push('totals required');
  if (!customer || typeof customer !== 'object') errors.push('customer required');

  if (Array.isArray(items)) {
    for (const i of items) {
      if (!i?.id || typeof i.id !== 'string') errors.push('item.id missing');
      if (typeof i.price !== 'number' || i.price < 0) errors.push('item.price invalid');
      if (typeof i.qty !== 'number' || i.qty < 1) errors.push('item.qty invalid');
    }
  }
  if (totals) {
    for (const k of ['subtotal','shipping','vat','total']) {
      if (typeof totals[k] !== 'number' || totals[k] < 0) errors.push(`totals.${k} invalid`);
    }
  }
  if (customer) {
    for (const k of ['name','email','address','city','postcode']) {
      if (!customer[k] || typeof customer[k] !== 'string') errors.push(`customer.${k} required`);
    }
  }
  return errors;
}

export default async function handler(req, res) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!(await rateLimit(ip))) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const errors = validate(body);
      if (errors.length) return res.status(400).json({ error: 'Invalid payload', details: errors });

      const id = Math.random().toString(36).slice(2, 10).toUpperCase();
      const order = { id, ...body, createdAt: new Date().toISOString() };

      await redis.set(`order:${id}`, JSON.stringify(order));
      await redis.lpush('orders', id);

      return res.status(201).json({ id });
    }

    if (req.method === 'GET') {
      const key = req.query.key || req.headers['x-admin-key'];
      if (key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

      const ids = await redis.lrange('orders', 0, -1);
      if (!ids?.length) return res.status(200).json({ orders: [] });

      const raw = await redis.mget(...ids.map(id => `order:${id}`));
      const orders = raw.map(o => (typeof o === 'string' ? JSON.parse(o) : o)).filter(Boolean);
      return res.status(200).json({ orders });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
