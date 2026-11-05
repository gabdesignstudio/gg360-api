// API GG360 — Express + MongoDB Atlas
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const origins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '20mb' }));          // plans, coupes et documents sont stockés dans la fiche

const client = new MongoClient(process.env.MONGODB_URI);
let tours;
const clean = ({ _id, ...t }) => t;
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'server' }) });

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.get('/api/tours', wrap(async (_, res) => res.json((await tours.find().sort({ id: 1 }).toArray()).map(clean))));
app.put('/api/tours/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id' });
  await tours.replaceOne({ id }, { ...clean(req.body), id }, { upsert: true });
  res.json({ ok: true });
}));
app.delete('/api/tours/:id', wrap(async (req, res) => {
  await tours.deleteOne({ id: Number(req.params.id) });
  res.status(204).end();
}));

client.connect().then(async () => {
  tours = client.db(process.env.DB_NAME || 'gg360').collection('tours');
  await tours.createIndex({ id: 1 }, { unique: true });
  app.listen(process.env.PORT || 8000, () => console.log('API GG360 prête'));
}).catch(e => { console.error(e); process.exit(1); });
