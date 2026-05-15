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

const app = Fastify({ logger: true });
await import('node:fs').then(fs => fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }));
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  source TEXT,
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
  const { email, source = 'homepage' } = request.body || {};
  const normalized = String(email || '').trim().toLowerCase();
  if (!validEmail(normalized)) return reply.code(400).send({ error: 'Enter a valid email address.' });
  db.prepare(`INSERT INTO subscribers (email, source, user_agent) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET source=excluded.source, user_agent=excluded.user_agent, updated_at=CURRENT_TIMESTAMP`)
    .run(normalized, String(source).slice(0, 80), request.headers['user-agent'] || '');
  if (mailer) {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || CONTACT_EMAIL,
      to: CONTACT_EMAIL,
      subject: 'New Plates & Profit subscriber',
      text: `${normalized} subscribed from ${source}.`
    });
  }
  return { ok: true };
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
  const rows = db.prepare('SELECT id, email, source, created_at, updated_at FROM subscribers ORDER BY created_at DESC').all();
  return reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', 'attachment; filename="subscribers.csv"')
    .send(rowsToCsv(rows, ['id', 'email', 'source', 'created_at', 'updated_at']));
});

app.get('/admin/leads.csv', async (request, reply) => {
  if (!requireAdmin(request, reply)) return;
  const rows = db.prepare('SELECT id, name, email, message, created_at FROM inquiries ORDER BY created_at DESC').all();
  return reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', 'attachment; filename="leads.csv"')
    .send(rowsToCsv(rows, ['id', 'name', 'email', 'message', 'created_at']));
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
