const base = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const health = await fetch(`${base}/health`);
if (!health.ok) throw new Error(`/health failed: ${health.status}`);
const html = await fetch(base).then(r => r.text());
const appJs = await fetch(`${base}/assets/app.jsx`).then(r => r.text());
for (const needle of ['Plates &amp; Profit', 'assets/app.jsx']) {
  if (!html.includes(needle)) throw new Error(`Missing ${needle}`);
}
for (const needle of ['Jealous Fork', 'Tea & Poets', 'PicoCrate', 'Culistock', 'https://www.jealousfork.com', 'https://www.teaandpoets.com', 'https://www.picocrate.com', 'https://www.culistock.com', '#newsletter', '/api/subscribe', '/api/inquiry', 'JOIN THE OPERATOR LIST', 'Send me Plates &amp; Profit', 'Your welcome note is next', 'VOL. I · LAUNCH', '+$22K profit, -$8K cash', 'The closest Fed Chair confirmation vote in history.', '54–45', '$10K+/month']) {
  if (!appJs.includes(needle)) throw new Error(`Missing ${needle} in app.jsx`);
}
for (const needle of ['@media (max-width: 720px)', 'grid-template-columns: repeat(2, minmax(0, 1fr))', '.hero-form-wrap { position: static;', '.subscriber-fields { grid-template-columns: 1fr; }']) {
  if (!html.includes(needle)) throw new Error(`Missing responsive CSS guard ${needle}`);
}
if (appJs.includes('<Podcast />')) throw new Error('Podcast section is still rendered');
for (const asset of ['plates-profit-fed-transition-facebook.png', 'plates-profit-fed-transition-facebook.svg']) {
  const assetResponse = await fetch(`${base}/assets/${asset}`);
  if (!assetResponse.ok) throw new Error(`Missing graphic asset ${asset}: ${assetResponse.status}`);
}
if (appJs.includes('Facebook') || appJs.includes('$[YOUR NUMBER]') || appJs.includes('VOL. I · NO. 000')) throw new Error('Old placeholder/social copy still present');
const stamp = Date.now();
const sub = await fetch(`${base}/api/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Smoke Subscriber', email: `smoke+${stamp}@example.com`, source: 'smoke', consent: true }) });
if (!sub.ok) throw new Error(`/api/subscribe failed: ${sub.status} ${await sub.text()}`);
const lead = await fetch(`${base}/api/inquiry`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Smoke Test', email: `lead+${stamp}@example.com`, message: 'Smoke test lead inquiry for Plates & Profit.' }) });
if (!lead.ok) throw new Error(`/api/inquiry failed: ${lead.status} ${await lead.text()}`);
if (process.env.ADMIN_TOKEN) {
  const csv = await fetch(`${base}/admin/subscribers.csv`, { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
  if (!csv.ok) throw new Error(`/admin/subscribers.csv failed: ${csv.status} ${await csv.text()}`);
  const preview = await fetch(`${base}/admin/welcome-email-preview`, { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
  if (!preview.ok) throw new Error(`/admin/welcome-email-preview failed: ${preview.status} ${await preview.text()}`);
  const welcomeHtml = await preview.text();
  if (!welcomeHtml.includes('Plates &amp; Profit') || !welcomeHtml.includes('Read the archive')) throw new Error('Welcome email preview missing branded content');
}
console.log('smoke ok');
