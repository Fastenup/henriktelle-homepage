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

Current built-in flow:

1. Visitor subscribes on homepage.
2. Email is stored in SQLite.
3. If SMTP is configured, Henrik gets a notification.
4. Export subscribers as CSV or send a basic newsletter via `/admin/newsletter`.

This is functional for early launch. For serious publishing, use one of:

- Buttondown: best clean/simple newsletter tool.
- Beehiiv: best if growth/referral/newsletter analytics matter.
- Ghost: best if you want an owned publication with archive/paywall potential.
- ConvertKit: good creator CRM, more marketing-y.

My recommendation: start with Buttondown or Beehiiv. Keep local SQLite as backup/lead log.

## Third-party/services to connect before launch

1. DNS: point `henriktelle.com` and `www.henriktelle.com` A/AAAA records to the Hetzner server.
2. Email sending: use Postmark, Resend, Mailgun, Brevo, or SMTP from your email provider; fill `SMTP_*` env vars.
3. Newsletter platform, optional but recommended: Beehiiv, Buttondown, Ghost, ConvertKit, or Mailchimp.
4. Lead booking: keep the lead brief form for qualification; optionally add Cal.com/SavvyCal later.
5. Analytics: Plausible, Fathom, Umami, or Google Analytics if you want traffic/conversion tracking.
6. Privacy/legal: add a privacy page because the site collects emails and leads.

## Deploy shape on Hetzner

- Node 20+ process running `npm start` on port 3000.
- Caddy or Nginx terminates TLS and reverse-proxies to `127.0.0.1:3000`.
- Set `ADMIN_TOKEN` to a long random value.
- Configure SMTP if using notifications or built-in newsletter sending.
- Keep `data/` persistent and backed up.
