#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'public', 'assets', 'newsletter-data.js');

function usage() {
  console.error(`Usage:
  node scripts/publish-newsletter.mjs path/to/draft.md
  node scripts/publish-newsletter.mjs --stdin < draft.md

Draft format:
---
no: 004
title: The issue title
subtitle: Optional deck / subject note
dept: SMALL BIZ FINANCE
accent: gold
pull: Short archive-card pull quote
read: 8 min
date: ISSUE 004
---

## This Week's Numbers
- **82%** — Cash-flow stat.

Paragraph text...`);
  process.exit(1);
}

function readInput() {
  const arg = process.argv[2];
  if (!arg) usage();
  if (arg === '--stdin') return fs.readFileSync(0, 'utf8');
  return fs.readFileSync(path.resolve(process.cwd(), arg), 'utf8');
}

function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!text.startsWith('---\n')) return [{}, text];
  const end = text.indexOf('\n---', 4);
  if (end === -1) return [{}, text];
  const metaText = text.slice(4, end).trim();
  const body = text.slice(end + 4).trim();
  const meta = {};
  for (const line of metaText.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    meta[key] = value.replace(/^['"]|['"]$/g, '').trim();
  }
  return [meta, body];
}

function flushParagraph(blocks, paragraphLines) {
  if (!paragraphLines.length) return;
  const text = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return;
  blocks.push({ type: /^[-—]\s*Henrik\.?$/i.test(text) ? 'signoff' : 'p', text });
  paragraphLines.length = 0;
}

function flushList(blocks, listItems) {
  if (!listItems.length) return;
  blocks.push({ type: 'ul', items: [...listItems] });
  listItems.length = 0;
}

function parseMarkdownBlocks(body) {
  const lines = body.split('\n');
  const blocks = [];
  const paragraph = [];
  const list = [];
  let titleFromBody = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph(blocks, paragraph);
      flushList(blocks, list);
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph(blocks, paragraph);
      flushList(blocks, list);
      titleFromBody ||= line.slice(2).trim();
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph(blocks, paragraph);
      flushList(blocks, list);
      blocks.push({ type: 'h3', text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph(blocks, paragraph);
      flushList(blocks, list);
      blocks.push({ type: 'h4', text: line.slice(4).trim() });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph(blocks, paragraph);
      list.push(bullet[1].trim());
      continue;
    }
    flushList(blocks, list);
    paragraph.push(line);
  }
  flushParagraph(blocks, paragraph);
  flushList(blocks, list);
  return { titleFromBody, blocks };
}

function nextIssueNo(existing) {
  const max = existing.reduce((acc, issue) => Math.max(acc, Number(issue.no) || 0), 2);
  return String(max + 1).padStart(3, '0');
}

function loadExisting() {
  if (!fs.existsSync(dataPath)) return [];
  const source = fs.readFileSync(dataPath, 'utf8');
  const match = source.match(/window\.NEWSLETTER_ISSUES\s*=\s*([\s\S]*?);\s*$/);
  if (!match) return [];
  try { return JSON.parse(match[1]); } catch { return []; }
}

function readEstimate(blocks) {
  const words = blocks.flatMap((block) => block.items || [block.text || '']).join(' ').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min`;
}

const raw = readInput();
const existing = loadExisting();
const [meta, body] = parseFrontmatter(raw);
const { titleFromBody, blocks } = parseMarkdownBlocks(body);
const no = String(meta.no || nextIssueNo(existing)).padStart(3, '0');
const title = meta.title || meta.headline || titleFromBody;
if (!title) throw new Error('Newsletter draft needs a title in frontmatter or a # heading.');
if (!blocks.length) throw new Error('Newsletter draft has no body content.');

const issue = {
  no,
  accent: meta.accent || 'gold',
  dept: meta.dept || 'PLATES & PROFIT',
  title,
  headline: meta.headline || title,
  subtitle: meta.subtitle || '',
  pull: meta.pull || meta.subtitle || blocks.find((block) => block.type === 'p')?.text?.slice(0, 180) || 'Operator notes from Henrik Telle.',
  date: meta.date || `ISSUE ${no}`,
  read: meta.read || readEstimate(blocks),
  kicker: meta.kicker || `THE PLATES & PROFIT WEEKLY · ISSUE ${no}`,
  blocks,
};

const filtered = existing.filter((item) => item.no !== issue.no);
filtered.push(issue);
filtered.sort((a, b) => Number(a.no) - Number(b.no));
fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.writeFileSync(dataPath, `window.NEWSLETTER_ISSUES = ${JSON.stringify(filtered, null, 2)};\n`);
console.log(`Published issue ${issue.no}: ${issue.title}`);
console.log(`Updated ${path.relative(root, dataPath)} with ${filtered.length} dynamic issue(s).`);
