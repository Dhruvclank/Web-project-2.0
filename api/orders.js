// Vercel Serverless Function (Node runtime)
// POST /api/orders  -> create order
// GET  /api/orders?key=ADMIN_KEY -> list orders (simple admin)

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // minimal validation
      if (!data || !Array.isArray(data.items) || !data.totals || !data.customer) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const id = Math.random().toString(36).slice(2, 10).toUpperCase();
      const order = {
        id,
        items: data.items,
        totals: data.totals,
        customer: data.customer,
        createdAt: new Date().toISOString()
      };

      // Persist
      await kv.set(`order:${id}`, JSON.stringify(order));
      await kv.lpush('orders', id);

      return res.status(201).json({ id });
    }

    if (req.method === 'GET') {
      // super-simple auth for demo
      const key = req.query.key || req.headers['x-admin-key'];
      if (key !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const ids = await kv.lrange('orders', 0, -1);
      const raw = await Promise.all(ids.map(id => kv.get(`order:${id}`)));
      const orders = raw.map(o => (typeof o === 'string' ? JSON.parse(o) : o));
      return res.status(200).json({ orders });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
c