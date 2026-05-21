import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'henrik@henriktelle.com';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'subscribers.sqlite');
const GHL_API_BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GHL_API_KEY || process.env.LEADCONNECTOR_API_KEY || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.GHL_SUBACCOUNT_ID || '';
const GHL_NEWSLETTER_TAG = process.env.GHL_NEWSLETTER_TAG || 'plates-profit-newsletter';
const GHL_WELCOME_TAG = process.env.GHL_WELCOME_TAG || 'plates-profit-welcome-email';
const GHL_SOURCE = process.env.GHL_SOURCE || 'henriktelle.com';
const SEND_WELCOME_EMAIL = String(process.env.SEND_WELCOME_EMAIL || 'false') === 'true';

const app = Fastify({ logger: true });
await import('node:fs').then(fs => fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }));
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT,
  consent INTEGER NOT NULL DEFAULT 1,
  ghl_contact_id TEXT,
  ghl_status TEXT,
  welcome_sent_at TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
for (const migration of [
  ['name', 'ALTER TABLE subscribers ADD COLUMN name TEXT'],
  ['consent', 'ALTER TABLE subscribers ADD COLUMN consent INTEGER NOT NULL DEFAULT 1'],
  ['ghl_contact_id', 'ALTER TABLE subscribers ADD COLUMN ghl_contact_id TEXT'],
  ['ghl_status', 'ALTER TABLE subscribers ADD COLUMN ghl_status TEXT'],
  ['welcome_sent_at', 'ALTER TABLE subscribers ADD COLUMN welcome_sent_at TEXT']
]) {
  const [column, sql] = migration;
  const exists = db.prepare('PRAGMA table_info(subscribers)').all().some((row) => row.name === column);
  if (!exists) db.exec(sql);
}

let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function firstNameFrom(name) {
  return cleanName(name).split(' ').filter(Boolean)[0] || '';
}

function ghlConfigured() {
  return Boolean(GHL_API_KEY && GHL_LOCATION_ID);
}

async function upsertGhlSubscriber({ email, name, source }) {
  if (!ghlConfigured()) return { skipped: true, reason: 'GHL is not configured.' };
  const tags = [GHL_NEWSLETTER_TAG, GHL_WELCOME_TAG].filter(Boolean);
  const body = {
    locationId: GHL_LOCATION_ID,
    email,
    name: cleanName(name) || undefined,
    firstName: firstNameFrom(name) || undefined,
    source: GHL_SOURCE,
    tags
  };
  const response = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text.slice(0, 500) }; }
  if (!response.ok) {
    const message = payload.message || payload.error || `GHL contact sync failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  const contact = payload.contact || payload.contacts?.[0] || payload;
  return { ok: true, contactId: contact.id || contact.contactId || null };
}

function brandedWelcomeEmail({ name = '' } = {}) {
  const greeting = firstNameFrom(name) ? `Hi ${firstNameFrom(name)},` : 'Hi,';
  const subject = 'Welcome to Plates & Profit';
  const text = `${greeting}

Welcome to Plates & Profit — my Sunday operator notebook on restaurant reality, small-business finance, and the math of building while operating.

What to expect:
- One practical issue each Sunday morning
- Restaurant numbers without the victory-lap nonsense
- Notes on cash flow, labor, food cost, audits, exit math, and useful AI ops

Start here: https://henriktelle.com/#archive

If this ever stops being useful, unsubscribe in one click from any newsletter email.

— Henrik Telle
Plates & Profit
https://henriktelle.com`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f1e8;color:#211b16;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffaf1;border:1px solid #2a2118;box-shadow:8px 8px 0 #d88b31;">
        <tr><td style="padding:26px 28px 14px;border-bottom:3px double #2a2118;">
          <div style="font-family:Georgia,serif;font-size:42px;line-height:1;font-weight:700;letter-spacing:-1px;">Plates <em style="color:#d88b31;">&amp;</em> Profit</div>
          <div style="font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#6d6258;margin-top:10px;">A Sunday operator notebook from Henrik Telle</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="font-size:17px;line-height:1.55;margin:0 0 18px;">${greeting}</p>
          <p style="font-size:17px;line-height:1.55;margin:0 0 18px;">Welcome to <strong>Plates &amp; Profit</strong> — restaurant reality, small-business finance, and the math of building while operating.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border-top:1px solid #d6cab8;border-bottom:1px solid #d6cab8;">
            <tr><td style="padding:16px 0;font-size:15px;line-height:1.7;">
              <strong>What you’ll get:</strong><br>
              • One practical issue each Sunday morning<br>
              • Cash flow, labor, food cost, audits, exit math, and AI ops<br>
              • No guru fog. No fake scoreboard. Operator notes only.
            </td></tr>
          </table>
          <p style="font-size:16px;line-height:1.55;margin:0 0 24px;">Start with the archive, then watch for the next issue Sunday.</p>
          <p style="margin:0 0 28px;"><a href="https://henriktelle.com/#archive" style="display:inline-block;background:#211b16;color:#fffaf1;text-decoration:none;padding:14px 18px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Read the archive →</a></p>
          <p style="font-size:15px;line-height:1.55;margin:0;color:#4d443c;">— Henrik Telle<br><span style="color:#6d6258;">Plates &amp; Profit</span></p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#211b16;color:#fffaf1;font-size:12px;line-height:1.5;">You subscribed at henriktelle.com. Every newsletter email should include a one-click unsubscribe link.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject, text, html };
}

async function sendWelcomeEmail({ email, name }) {
  if (!mailer || !SEND_WELCOME_EMAIL) return { skipped: true };
  const welcome = brandedWelcomeEmail({ name });
  await mailer.sendMail({
    from: process.env.MAIL_FROM || CONTACT_EMAIL,
    to: email,
    replyTo: CONTACT_EMAIL,
    subject: welcome.subject,
    text: welcome.text,
    html: welcome.html
  });
  return { ok: true };
}

function requireAdmin(request, reply) {
  const configured = process.env.ADMIN_TOKEN;
  const provided = request.headers['x-admin-token'] || request.query?.token;
  if (!configured) {
    reply.code(503).send({ error: 'ADMIN_TOKEN is not configured.' });
    return false;
  }
  if (provided !== configured) {
    reply.code(401).send({ error: 'Unauthorized.' });
    return false;
  }
  return true;
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function rowsToCsv(rows, columns) {
  return [columns.join(','), ...rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','))].join('\n');
}

app.get('/health', async () => ({ ok: true }));

app.post('/api/subscribe', async (request, reply) => {
  const { email, name = '', source = 'homepage', consent = true } = request.body || {};
  const normalized = String(email || '').trim().toLowerCase();
  const subscriberName = cleanName(name);
  if (!validEmail(normalized)) return reply.code(400).send({ error: 'Enter a valid email address.' });
  if (!consent) return reply.code(400).send({ error: 'Consent is required to subscribe.' });

  let ghlStatus = 'not_configured';
  let ghlContactId = null;
  try {
    const ghl = await upsertGhlSubscriber({ email: normalized, name: subscriberName, source });
    ghlStatus = ghl.skipped ? 'not_configured' : 'synced';
    ghlContactId = ghl.contactId;
  } catch (error) {
    request.log.error({ err: error, email: normalized }, 'GHL subscriber sync failed');
    ghlStatus = `error:${error.statusCode || 'unknown'}`;
  }

  let welcomeSent = false;
  try {
    const welcome = await sendWelcomeEmail({ email: normalized, name: subscriberName });
    welcomeSent = Boolean(welcome.ok);
  } catch (error) {
    request.log.error({ err: error, email: normalized }, 'Welcome email failed');
  }

  db.prepare(`INSERT INTO subscribers (email, name, source, consent, ghl_contact_id, ghl_status, welcome_sent_at, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name=excluded.name,
      source=excluded.source,
      consent=excluded.consent,
      ghl_contact_id=COALESCE(excluded.ghl_contact_id, subscribers.ghl_contact_id),
      ghl_status=excluded.ghl_status,
      welcome_sent_at=COALESCE(excluded.welcome_sent_at, subscribers.welcome_sent_at),
      user_agent=excluded.user_agent,
      updated_at=CURRENT_TIMESTAMP`)
    .run(normalized, subscriberName, String(source).slice(0, 80), consent ? 1 : 0, ghlContactId, ghlStatus, welcomeSent ? new Date().toISOString() : null, request.headers['user-agent'] || '');

  if (mailer) {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || CONTACT_EMAIL,
      to: CONTACT_EMAIL,
      subject: 'New Plates & Profit subscriber',
      text: `${subscriberName ? subscriberName + ' <' + normalized + '>' : normalized} subscribed from ${source}. GHL status: ${ghlStatus}.`
    });
  }
  return { ok: true, ghl: ghlStatus === 'synced' ? 'synced' : 'queued', welcomeEmail: welcomeSent ? 'sent' : 'ghl-workflow' };
});

app.post('/api/inquiry', async (request, reply) => {
  const { name = '', email, message } = request.body || {};
  const normalized = String(email || '').trim().toLowerCase();
  if (!validEmail(normalized)) return reply.code(400).send({ error: 'Enter a valid email address.' });
  if (!message || String(message).trim().length < 10) return reply.code(400).send({ error: 'Tell me a little more about what you need.' });
  db.prepare('INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)').run(String(name).slice(0, 120), normalized, String(message).slice(0, 5000));
  if (mailer) {
    await mailer.sendMail({ from: process.env.MAIL_FROM || CONTACT_EMAIL, to: CONTACT_EMAIL, replyTo: normalized, subject: 'New Plates & Profit inquiry', text: `${name}\n${normalized}\n\n${message}` });
  }
  return { ok: true };
});

app.get('/admin/subscribers.csv', async (request, reply) => {
  if (!requireAdmin(request, reply)) return;
  const rows = db.prepare('SELECT id, email, name, source, ghl_contact_id, ghl_status, welcome_sent_at, created_at, updated_at FROM subscribers ORDER BY created_at DESC').all();
  return reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', 'attachment; filename="subscribers.csv"')
    .send(rowsToCsv(rows, ['id', 'email', 'name', 'source', 'ghl_contact_id', 'ghl_status', 'welcome_sent_at', 'created_at', 'updated_at']));
});

app.get('/admin/leads.csv', async (request, reply) => {
  if (!requireAdmin(request, reply)) return;
  const rows = db.prepare('SELECT id, name, email, message, created_at FROM inquiries ORDER BY created_at DESC').all();
  return reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', 'attachment; filename="leads.csv"')
    .send(rowsToCsv(rows, ['id', 'name', 'email', 'message', 'created_at']));
});

app.get('/admin/welcome-email-preview', async (request, reply) => {
  if (!requireAdmin(request, reply)) return;
  const welcome = brandedWelcomeEmail({ name: request.query?.name || 'Henrik' });
  return reply.header('content-type', 'text/html; charset=utf-8').send(welcome.html);
});

app.post('/admin/newsletter', async (request, reply) => {
  if (!requireAdmin(request, reply)) return;
  if (!mailer) return reply.code(503).send({ error: 'SMTP is not configured; cannot send newsletter.' });
  const { subject, text, html, testEmail } = request.body || {};
  if (!subject || (!text && !html)) return reply.code(400).send({ error: 'subject and text or html are required.' });
  const recipients = testEmail
    ? [String(testEmail).trim().toLowerCase()].filter(validEmail)
    : db.prepare('SELECT email FROM subscribers ORDER BY created_at ASC').all().map((row) => row.email);
  if (!recipients.length) return reply.code(400).send({ error: 'No valid recipients.' });
  for (const to of recipients) {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || CONTACT_EMAIL,
      to,
      replyTo: CONTACT_EMAIL,
      subject: String(subject).slice(0, 180),
      text: text || undefined,
      html: html || undefined
    });
  }
  return { ok: true, sent: recipients.length };
});

app.register(fastifyStatic, { root: path.join(__dirname, 'public'), prefix: '/' });
app.setNotFoundHandler((request, reply) => reply.sendFile('index.html'));

app.listen({ port: PORT, host: HOST });
