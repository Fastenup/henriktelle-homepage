# Henrik Telle — Plates & Profit homepage

Production-ready homepage extracted from the standalone concept file and wired for Hetzner hosting.

## Run locally

```bash
npm install
cp .env.example .env
# edit ADMIN_TOKEN and SMTP_* in .env
npm start
```

Open http://localhost:3000.

## What works now

- Static homepage served from `public/index.html`.
- Podcast section is hidden for now.
- Workshop section lists Jealous Fork, Tea & Poets, Plates & Profit, PicoCrate, and Culistock.
- Newsletter signup posts to `POST /api/subscribe`.
- Subscriber emails are persisted in SQLite at `data/subscribers.sqlite`.
- Lead/booking briefs post to `POST /api/inquiry` and are saved in SQLite.
- Optional SMTP notification to Henrik when a signup or lead arrives.
- Protected CSV exports:
  - `GET /admin/subscribers.csv?token=ADMIN_TOKEN`
  - `GET /admin/leads.csv?token=ADMIN_TOKEN`
- Protected newsletter send endpoint:
  - `POST /admin/newsletter` with header `x-admin-token: ADMIN_TOKEN`
  - body: `{ "subject": "...", "text": "..." }`
  - add `"testEmail":"you@example.com"` to send a test without emailing the full list.
- Health check at `/health`.
- Caddy reverse proxy example for `henriktelle.com` + `www.henriktelle.com`.

## Practical lead booking

The site now uses a short lead brief form instead of open calendar booking. That is safer at this stage: people describe the problem first, it saves to SQLite, and Henrik can reply with a booking link only when it is a fit.

If you want calendar automation later, connect Cal.com, SavvyCal, TidyCal, or Calendly and either:

1. Put the calendar link in the reply email, or
2. Replace `bookingUrl` in `public/index.html` with the calendar URL.

## Practical subscriber/newsletter flow

Current GHL-first flow:

1. Visitor subscribes on homepage with first name, email, and consent.
2. The site stores the subscriber in SQLite as a backup/audit log.
3. If `GHL_API_KEY` and `GHL_LOCATION_ID` are configured, the site upserts the contact into GoHighLevel / LeadConnector.
4. The contact gets two tags by default:
   - `plates-profit-newsletter`
   - `plates-profit-welcome-email`
5. In GHL, create a workflow triggered by the `plates-profit-welcome-email` tag and send the branded welcome email template from `templates/ghl-welcome-email.html`.
6. Use GHL Email Campaigns / LC Email for regular Plates & Profit newsletters, filtered by the `plates-profit-newsletter` tag.

Protected preview endpoint:

- `GET /admin/welcome-email-preview?token=ADMIN_TOKEN`

### Discord-to-webpage publishing convention

This repo now has a lightweight webpage publishing path for drafts pasted into the Hermes Discord channel:

1. Paste the draft and start the message with `PUBLISH PLATES & PROFIT`.
2. Include Markdown. Preferred frontmatter:
   ```md
   ---
   no: 004
   title: Your issue title
   subtitle: Optional deck / subject note
   dept: SMALL BIZ FINANCE
   accent: gold
   pull: Short archive-card pull quote
   read: 8 min
   date: ISSUE 004
   ---
   ```
3. Use `##` for main sections, `###` for subsection headings, bullets for number lists, and `**bold**` for emphasized figures.
4. Gram runs `npm run publish:newsletter -- path/to/draft.md`, commits, pushes, and verifies the live page at `https://henriktelle.com/#issue-XXX`.

The script writes formatted issues to `public/assets/newsletter-data.js`. Issues 001 and 002 remain hardcoded; new pasted issues render dynamically with the same archive-card and newspaper article styling.

The old SMTP newsletter endpoint still exists as a fallback/admin utility, but the intended production sender is GHL so unsubscribe/compliance stays inside GHL.

## Third-party/services to connect before launch

1. DNS: point `henriktelle.com` and `www.henriktelle.com` A/AAAA records to the Hetzner server.
2. GHL / LC Email: authenticate `henriktelle.com` as a sending domain in GoHighLevel, then create the welcome workflow triggered by `plates-profit-welcome-email`.
3. Optional SMTP: only needed for owner notifications or direct welcome fallback; fill `SMTP_*` env vars if used.
4. Lead booking: keep the lead brief form for qualification; optionally add Cal.com/SavvyCal later.
5. Analytics: Plausible, Fathom, Umami, or Google Analytics if you want traffic/conversion tracking.
6. Privacy/legal: add a privacy page because the site collects emails and leads.

## Deploy shape on Hetzner

- Node 20+ process running `npm start` on port 3000.
- Caddy or Nginx terminates TLS and reverse-proxies to `127.0.0.1:3000`.
- Set `ADMIN_TOKEN` to a long random value.
- Configure SMTP if using notifications or built-in newsletter sending.
- Keep `data/` persistent and backed up.
