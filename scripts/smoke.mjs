const base = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const health = await fetch(`${base}/health`);
if (!health.ok) throw new Error(`/health failed: ${health.status}`);
const html = await fetch(base).then(r => r.text());
const appJs = await fetch(`${base}/assets/app.jsx`).then(r => r.text());
for (const needle of ['Plates &amp; Profit', 'assets/app.jsx']) {
  if (!html.includes(needle)) throw new Error(`Missing ${needle}`);
}
for (const needle of ['Jealous Fork', 'Tea & Poets', 'PicoCrate', 'Culistock', '/api/subscribe', '/api/inquiry']) {
  if (!appJs.includes(needle)) throw new Error(`Missing ${needle} in app.jsx`);
}
if (appJs.includes('<Podcast />')) throw new Error('Podcast section is still rendered');
const stamp = Date.now();
const sub = await fetch(`${base}/api/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `smoke+${stamp}@example.com`, source: 'smoke' }) });
if (!sub.ok) throw new Error(`/api/subscribe failed: ${sub.status} ${await sub.text()}`);
const lead = await fetch(`${base}/api/inquiry`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Smoke Test', email: `lead+${stamp}@example.com`, message: 'Smoke test lead inquiry for Plates & Profit.' }) });
if (!lead.ok) throw new Error(`/api/inquiry failed: ${lead.status} ${await lead.text()}`);
if (process.env.ADMIN_TOKEN) {
  const csv = await fetch(`${base}/admin/subscribers.csv`, { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
  if (!csv.ok) throw new Error(`/admin/subscribers.csv failed: ${csv.status} ${await csv.text()}`);
}
console.log('smoke ok');
