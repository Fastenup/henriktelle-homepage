/* global React */
/* Henrik Telle — Personal brand hub. The site IS the publication. */
/* Components: Masthead, Hero, Stats, Departments, Archive, Projects, Hire, Footer */

const { useState, useEffect, useRef } = React;

const SITE_CONFIG = window.SITE_CONFIG || {};
const CONTACT_EMAIL = SITE_CONFIG.contactEmail || 'henrik@henriktelle.com';
const BOOKING_URL = SITE_CONFIG.bookingUrl || `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Plates & Profit advisory inquiry')}`;
const SOCIAL_LINKS = SITE_CONFIG.socialLinks || {};

async function submitSubscriber(email, source) {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not subscribe right now.');
  return payload;
}


async function submitInquiry(payload) {
  const response = await fetch('/api/inquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not send this right now.');
  return data;
}

function LeadForm() {
  const [form, setForm] = useState({ name: '', email: '', restaurant: '', need: '' });
  const [state, setState] = useState({ status: 'idle', message: '' });
  function update(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  async function onSubmit(e) {
    e.preventDefault();
    setState({ status: 'loading', message: 'Sending…' });
    try {
      await submitInquiry({
        name: form.name,
        email: form.email,
        message: `Restaurant / company: ${form.restaurant || 'Not provided'}\n\nWhat they need:\n${form.need}`
      });
      setForm({ name: '', email: '', restaurant: '', need: '' });
      setState({ status: 'success', message: 'Got it. I’ll reply directly if it looks like a fit.' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }
  return (
    <form className="lead-form" onSubmit={onSubmit} data-status={state.status}>
      <div className="lead-form-row">
        <input required placeholder="Your name" value={form.name} onChange={(e) => update('name', e.target.value)} disabled={state.status === 'loading'} />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} disabled={state.status === 'loading'} />
      </div>
      <input placeholder="Restaurant / company" value={form.restaurant} onChange={(e) => update('restaurant', e.target.value)} disabled={state.status === 'loading'} />
      <textarea required minLength="10" placeholder="What do you need help with? Cash flow, inventory, exit math, audit prep, AI ops…" value={form.need} onChange={(e) => update('need', e.target.value)} disabled={state.status === 'loading'} />
      <button type="submit" disabled={state.status === 'loading'}>{state.status === 'loading' ? 'SENDING…' : 'SEND THE BRIEF →'}</button>
      {state.message && <div className={`form-message ${state.status}`} role="status">{state.message}</div>}
    </form>
  );
}

function SubscribeForm({ variant = 'coupon' }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });
  const className = variant === 'cta' ? 'cta-form' : 'coupon-form';
  async function onSubmit(e) {
    e.preventDefault();
    setState({ status: 'loading', message: 'Adding you…' });
    try {
      await submitSubscriber(email, variant);
      setEmail('');
      setState({ status: 'success', message: 'You’re on the list. Check your inbox for confirmation.' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }
  return (
    <form className={className} onSubmit={onSubmit} data-status={state.status}>
      {variant !== 'cta' && <label className="coupon-label" htmlFor="email">YOUR EMAIL</label>}
      <div className={variant === 'cta' ? undefined : 'coupon-row'}>
        <input
          id={variant === 'cta' ? undefined : 'email'}
          type="email"
          required
          placeholder={variant === 'cta' ? 'your@email.com' : 'operator@yourrestaurant.com'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state.status === 'loading'}
        />
        <button type="submit" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'ADDING…' : 'SUBSCRIBE →'}
        </button>
      </div>
      {state.message && <div className={`form-message ${state.status}`} role="status">{state.message}</div>}
    </form>
  );
}


/* =====================================================================
   MASTHEAD — top bar styled like a newspaper masthead
   ===================================================================== */
function Masthead({ now }) {
  return (
    <header className="masthead">
      <div className="masthead-row">
        <div className="mast-left">
          <a href="#top" className="mast-mark">
            P<em>&amp;</em>P
          </a>
          <div className="mast-credit">
            <div className="mast-name">HENRIK TELLE</div>
            <div className="mast-sub">PUBLISHER · OPERATOR · MIAMI, FL</div>
          </div>
        </div>

        <nav className="mast-nav">
          <a href="#newsletter">Newsletter</a>
          <a href="#projects">Projects</a>
          <a href="#hire">Hire</a>
          <a href="#archive">Archive</a>
        </nav>

        <div className="mast-right">
          <div className="mast-issue">VOL. I · NO. 000</div>
          <div className="mast-date">{now}</div>
        </div>
      </div>
    </header>
  );
}

/* =====================================================================
   HERO — wordmark, tagline, email signup (subscription coupon)
   ===================================================================== */
function Hero() {
  return (
    <section className="hero" id="top">
      {/* Decorative oversized ampersand */}
      <div className="hero-deco" aria-hidden="true">&amp;</div>

      <div className="hero-grid">
        <div className="hero-text">
          <div className="hero-eyebrow">
            <span className="line"></span>
            A NEWSLETTER · AN OPERATOR NOTEBOOK
            <span className="line"></span>
          </div>

          <h1 className="hero-wordmark">
            Plates <em>&amp;</em> Profit
          </h1>

          <p className="hero-tag">
            Restaurant reality, small-business finance &amp; the math
            of <em>building while operating.</em>
          </p>

          <p className="hero-byline">
            Written every Sunday at 6am, before service prep, by
            Henrik Telle &mdash; three-restaurant operator, one exit
            for $220K, currently shipping useful things for operators.
          </p>
        </div>

        <div className="hero-form-wrap" id="newsletter">
          <div className="coupon">
            <div className="coupon-corner tl">+</div>
            <div className="coupon-corner tr">+</div>
            <div className="coupon-corner bl">+</div>
            <div className="coupon-corner br">+</div>

            <div className="coupon-stamp">
              <div className="stamp-inner">
                <div className="stamp-row">FREE</div>
                <div className="stamp-row stamp-mid">FOREVER</div>
                <div className="stamp-row">NO &middot; SPAM</div>
              </div>
            </div>

            <div className="coupon-head">
              <span className="coupon-tag">SUBSCRIPTION COUPON</span>
              <span className="coupon-no">№ 000</span>
            </div>

            <div className="coupon-title">
              Subscribe to <em>Plates &amp; Profit.</em>
            </div>
            <div className="coupon-sub">
              One issue, every Sunday. ~9 minutes. Free.
            </div>

            <SubscribeForm variant="coupon" />

            <div className="coupon-foot">
              <span>● 0 readers</span>
              <span>● first issue in progress</span>
              <span>● Unsubscribe in one click</span>
            </div>
          </div>

          <div className="hero-quote">
            <span className="hq-mark">&ldquo;</span>
            <p>
              The only newsletter I forward to my GM.
            </p>
            <div className="hq-attr">
              &mdash; M. Vasquez, two-unit operator, Tampa
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   STATS — ticker-style ribbon
   ===================================================================== */
function Stats() {
  const items = [
    { num: "0", lbl: "READERS" },
    { num: "0", lbl: "ISSUES SHIPPED" },
    { num: "3", lbl: "RESTAURANTS OPERATED" },
    { num: "$220K", lbl: "EXIT" },
    { num: "4hrs", lbl: "SAAS BUDGET / WEEK" },
    { num: "0", lbl: "SPONSORS, EVER" },
  ];
  return (
    <section className="stats">
      <div className="stats-head">
        <span className="stats-tag">THE LEDGER · Q2 2026</span>
        <span className="stats-meta">UPDATED WEEKLY · NO ROUNDING</span>
      </div>
      <div className="stats-grid">
        {items.map((s, i) => (
          <div className="stat" key={i}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   DEPARTMENTS — the 5 content pillars, as a TOC
   ===================================================================== */
const PILLARS = [
  {
    n: "01",
    name: "Restaurant Reality",
    accent: "orange",
    desc: "The food-cost lie, the labor math, what audit week actually looks like from the line.",
    count: "beat 01",
  },
  {
    n: "02",
    name: "Small Biz Finance",
    accent: "gold",
    desc: "Four numbers every operator should know cold. Break-even, cash runway, the truth behind the P&L.",
    count: "beat 02",
  },
  {
    n: "03",
    name: "Operator's Exit",
    accent: "blue",
    desc: "Exit math without the victory lap: brokers, debt, taxes, working capital, and what actually reaches the bank.",
    count: "beat 03",
  },
  {
    n: "04",
    name: "Building While Operating",
    accent: "green",
    desc: "Shipping SaaS in 4 hours a week — Sundays, 5–7am, before prep — while running two businesses.",
    count: "beat 04",
  },
  {
    n: "05",
    name: "Miami Money",
    accent: "purple",
    desc: "Sales tax, audits, hurricanes, hiring lines, the cost of doing business in South Florida.",
    count: "beat 05",
  },
];

function Departments() {
  return (
    <section className="depts" id="archive">
      <div className="section-head">
        <span className="section-tag">THE DEPARTMENTS</span>
        <h2 className="section-title">
          Five beats. <em>One operator's notebook.</em>
        </h2>
        <p className="section-sub">
          Everything I plan to write fits one of these five. The tone is practical: what happened, what the numbers said, and what I would do differently next time.
        </p>
      </div>

      <div className="depts-list">
        {PILLARS.map((p) => (
          <a className="dept" key={p.n} data-accent={p.accent} href="#archive">
            <div className="dept-n">{p.n}</div>
            <div className="dept-body">
              <div className="dept-name">{p.name}</div>
              <div className="dept-desc">{p.desc}</div>
            </div>
            <div className="dept-meta">
              <div className="dept-count">{p.count}</div>
              <div className="dept-arrow">→</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   ARCHIVE PREVIEW — 6 recent issues as mini magazine covers
   ===================================================================== */
const ISSUES = [
  {
    no: "001",
    accent: "gold",
    dept: "SMALL BIZ FINANCE",
    headline: "Profit is not cash. Cash is not peace.",
    pull: "A plain-English breakdown of the numbers operators should know before the accountant sends the packet.",
    date: "COMING SOON",
    read: "draft",
  },
  {
    no: "002",
    accent: "orange",
    dept: "RESTAURANT REALITY",
    headline: "The food-cost number is only the start of the argument.",
    pull: "Waste, prep, comps, training, theft, bad ordering, and the weird Tuesday that ruins your perfect spreadsheet.",
    date: "COMING SOON",
    read: "draft",
  },
  {
    no: "003",
    accent: "blue",
    dept: "OPERATOR'S EXIT",
    headline: "Exit math: what the headline price never tells you.",
    pull: "A careful version of the seller math: debt, fees, taxes, adjustments, and the number that actually matters.",
    date: "COMING SOON",
    read: "draft",
  },
]

function Archive() {
  return (
    <section className="archive">
      <div className="section-head">
        <span className="section-tag">FROM THE ARCHIVE</span>
        <h2 className="section-title">
          The first drafts. <em>Built from real operator notes.</em>
        </h2>
      </div>

      <div className="archive-grid">
        {ISSUES.map((i) => (
          <a className="issue" key={i.no} data-accent={i.accent} href="#archive">
            <div className="issue-top">
              <span className="issue-dept">{i.dept}</span>
              <span className="issue-no">№ {i.no}</span>
            </div>
            <div className="issue-rule"></div>
            <div className="issue-headline">{i.headline}</div>
            <div className="issue-pull">&ldquo;{i.pull}&rdquo;</div>
            <div className="issue-foot">
              <span>{i.date}</span>
              <span>{i.read} · READ →</span>
            </div>
          </a>
        ))}
      </div>

      <a className="archive-all" href="#archive">
        First issue coming soon <span>→</span>
      </a>
    </section>
  );
}

/* =====================================================================
   PODCAST — featured episode + 3 small rows
   ===================================================================== */
const EPISODES = [
  {
    no: "012",
    title: "What I'd tell myself in 2019, with my SBA loan officer in the room.",
    guest: "Solo",
    dur: "42 min",
    date: "MAY 09 · 2026",
  },
  {
    no: "011",
    title: "Hiring a GM you trust enough to leave for a year.",
    guest: "with R. Castellanos",
    dur: "58 min",
    date: "MAY 02 · 2026",
  },
  {
    no: "010",
    title: "The week the hurricane closed three of four restaurants.",
    guest: "Solo",
    dur: "31 min",
    date: "APR 25 · 2026",
  },
];

function Podcast() {
  return (
    <section className="podcast" id="podcast">
      <div className="section-head">
        <div className="section-tag-row">
          <span className="section-tag">ON AIR</span>
          <span className="live-dot"></span>
          <span className="section-sub-inline">
            Two operators, one Zoom, no edits.
          </span>
        </div>
        <h2 className="section-title">
          The <em>Plates &amp; Profit</em> podcast.
        </h2>
      </div>

      <div className="pod-featured">
        <div className="pod-art">
          <div className="pod-art-amp">&amp;</div>
          <div className="pod-art-meta">EP. 013 · DROPPING THIS WEEK</div>
        </div>
        <div className="pod-detail">
          <div className="pod-eyebrow">FEATURED · 1H 04M</div>
          <h3 className="pod-title">
            Selling a restaurant from inside the restaurant: the broker,
            the kitchen, and the day you can't tell anyone yet.
          </h3>
          <p className="pod-desc">
            We recorded this the morning after the wire cleared. Coffee
            was still bad. The line cooks didn't know yet. The broker
            wanted his cut by Friday. We talk about all of it.
          </p>
          <div className="pod-actions">
            <button className="btn-primary">▶ PLAY EPISODE</button>
            <a className="btn-ghost" href="#">Apple ↗</a>
            <a className="btn-ghost" href="#">Spotify ↗</a>
            <a className="btn-ghost" href="#">RSS</a>
          </div>
          <div className="pod-scrubber">
            <div className="pod-scrubber-fill"></div>
            <div className="pod-scrubber-knob"></div>
          </div>
          <div className="pod-scrubber-meta">
            <span>00:00</span>
            <span>1:04:17</span>
          </div>
        </div>
      </div>

      <div className="pod-list">
        {EPISODES.map((e) => (
          <a className="pod-row" key={e.no} href="#podcast">
            <div className="pod-row-n">№ {e.no}</div>
            <div className="pod-row-body">
              <div className="pod-row-title">{e.title}</div>
              <div className="pod-row-meta">{e.guest} · {e.dur}</div>
            </div>
            <div className="pod-row-date">{e.date}</div>
            <div className="pod-row-play">▶</div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   PROJECTS — what Henrik is building / has built
   ===================================================================== */
const PROJECTS = [
  {
    n: "01",
    name: "Jealous Fork",
    status: "Operating — Miami",
    statusColor: "orange",
    one: "Miami-born artisan pancake and brunch concept that grew from food-truck energy into a Kendall restaurant with a loyal local following.",
    metric: "3",
    metricLabel: "RESTAURANTS",
  },
  {
    n: "02",
    name: "Tea & Poets",
    status: "10-year anniversary",
    statusColor: "blue",
    one: "Community tea house, market, and live-events room built around poetry, makers, music, and Miami people who stay longer than planned.",
    metric: "10Y",
    metricLabel: "ANNIVERSARY",
  },
  {
    n: "03",
    name: "Plates & Profit",
    status: "Starting now",
    statusColor: "gold",
    one: "The operator notebook: restaurant reality, small-business finance, and the math of building while operating.",
    metric: "0",
    metricLabel: "ISSUES SHIPPED",
  },
  {
    n: "04",
    name: "PicoCrate",
    status: "Building",
    statusColor: "green",
    one: "AI receptionist and voice-agent systems for small businesses that need calls answered, leads captured, and appointments booked after hours.",
    metric: "24/7",
    metricLabel: "VOICE INTAKE",
  },
  {
    n: "05",
    name: "Culistock",
    status: "Building with restaurants",
    statusColor: "purple",
    one: "Restaurant inventory and operations software for turning purchasing, stock, shift work, and POS signals into practical daily decisions.",
    metric: "OPS",
    metricLabel: "RESTAURANT OS",
  },
]

function Projects() {
  return (
    <section className="projects" id="projects">
      <div className="section-head">
        <span className="section-tag">THE WORKSHOP</span>
        <h2 className="section-title">
          What I'm actually <em>building right now.</em>
        </h2>
        <p className="section-sub">
          Restaurants, publication work, and operator software. Some are public, some are still being built in the back office.
        </p>
      </div>

      <div className="projects-grid">
        {PROJECTS.map((p) => (
          <div className="project" key={p.n} data-accent={p.statusColor}>
            <div className="project-n">{p.n}</div>
            <div className="project-name">{p.name}</div>
            <div className="project-status">
              <span className="project-status-dot"></span>
              {p.status}
            </div>
            <p className="project-one">{p.one}</p>
            <div className="project-metric">
              <div className="pm-num">{p.metric}</div>
              <div className="pm-lbl">{p.metricLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   HIRE — services list
   ===================================================================== */
const SERVICES = [
  {
    name: "The Operator Office Hour",
    price: "$400 · 60 min",
    desc: "Bring one problem. Cash flow, hiring, a vendor dispute, the question your accountant won't answer plainly. We solve it on the call.",
    tag: "MOST BOOKED",
  },
  {
    name: "Exit-Math Review",
    price: "$2,400 · 2 sessions",
    desc: "Before you talk to a broker. We model the SBA, the earn-out, the working-capital adjustment, and the taxes — so you walk into the deal knowing the floor and the ceiling.",
    tag: "FOR SELLERS",
  },
  {
    name: "Pre-Audit Readiness",
    price: "$1,800 · async + 1 call",
    desc: "I look at three years of DR-15s, your POS taxable categories, and how you log comps and voids. You get a written report you can hand to your CPA — or your auditor.",
    tag: "FL OPERATORS",
  },
];

function Hire() {
  return (
    <section className="hire" id="hire">
      <div className="section-head">
        <span className="section-tag">FOR OPERATORS WHO NEED A SECOND BRAIN</span>
        <h2 className="section-title">
          Sometimes you just need someone <em>who's been in the kitchen.</em>
        </h2>
        <p className="section-sub">
          I take a small number of advisory clients per month. Every
          engagement is run by me, personally. There is no team. There
          is no junior analyst. There is just one operator who has
          made most of these mistakes already.
        </p>
      </div>

      <div className="hire-grid">
        {SERVICES.map((s, i) => (
          <div className="service" key={i}>
            <div className="service-tag">{s.tag}</div>
            <div className="service-name">{s.name}</div>
            <div className="service-price">{s.price}</div>
            <p className="service-desc">{s.desc}</p>
            <a className="service-cta" href={BOOKING_URL}>
              Book this <span>→</span>
            </a>
          </div>
        ))}
      </div>

      <div className="hire-footnote">
        <span className="mono">BOOKING LEADS:</span>
        <span className="serif-i">Send the brief below. It saves to the lead inbox and emails Henrik when SMTP is configured.</span>
      </div>

      <div className="lead-box">
        <div className="service-tag">PRACTICAL BOOKING</div>
        <div className="service-name">Start with the problem, not a calendar slot.</div>
        <p className="service-desc">If it is a fit, Henrik can reply with a direct booking link, scope, or next question. Cleaner than letting strangers book random time.</p>
        <LeadForm />
      </div>
    </section>
  );
}

/* =====================================================================
   CTA REPEAT — restate the email signup at bottom
   ===================================================================== */
function CTA() {
  return (
    <section className="cta">
      <div className="cta-deco" aria-hidden="true">END.</div>
      <div className="cta-inner">
        <div className="cta-eyebrow">
          <span className="line"></span>
          ONE MORE THING
          <span className="line"></span>
        </div>
        <h2 className="cta-headline">
          If you read this far, <em>you should be subscribed.</em>
        </h2>
        <SubscribeForm variant="cta" />
        <div className="cta-fine">
          Sundays, 6am ET. Free. Unsubscribe in one click. No sponsors, ever.
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   FOOTER — colophon + legal + social
   ===================================================================== */
function Footer() {
  return (
    <footer className="site-footer">
      <div className="foot-rule"></div>

      <div className="foot-grid">
        <div className="foot-col">
          <div className="foot-mark">
            P<em>&amp;</em>P
          </div>
          <div className="foot-credit">
            HENRIK TELLE<br />
            <span className="muted">Publisher, Editor, Dishwasher.</span>
          </div>
        </div>

        <div className="foot-col">
          <div className="foot-tag">PUBLICATION</div>
          <a href="#newsletter">Newsletter</a>
          <a href="#archive">All issues</a>
        </div>

        <div className="foot-col">
          <div className="foot-tag">WORK</div>
          <a href="#projects">Projects</a>
          <a href="#hire">Hire Henrik</a>
          <a href="#hire">Office hours</a>
          <a href={`mailto:${CONTACT_EMAIL}?subject=Press inquiry`}>Press</a>
        </div>

        <div className="foot-col">
          <div className="foot-tag">ELSEWHERE</div>
          <a href={SOCIAL_LINKS.x || "https://x.com/t838130"}>X</a>
          <a href={SOCIAL_LINKS.linkedin || "https://www.linkedin.com/in/henriktelle"}>LinkedIn</a>
          <a href={SOCIAL_LINKS.threads || "https://www.threads.net/@henkesan"}>Threads</a>
          <a href="mailto:henrik@henriktelle.com">henrik@henriktelle.com</a>
        </div>

        <div className="foot-col foot-colophon">
          <div className="foot-tag">COLOPHON</div>
          <p>
            Set in <em>Georgia</em>, DM Sans, and Courier New. Built
            between restaurant work, software builds, and late-night notes.
            Hand-coded. No template.
          </p>
        </div>
      </div>

      <div className="foot-bottom">
        <span>© 2026 · HENRIK TELLE</span>
        <span className="foot-motto">EAT WELL · COUNT EVERYTHING</span>
        <span>MIAMI, FL · 25.7617° N, 80.1918° W</span>
      </div>
    </footer>
  );
}

/* =====================================================================
   APP shell + Tweaks
   ===================================================================== */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "vibe": "dark",
  "accent": "#f5c518",
  "density": "spacious"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Apply vibe + accent + density to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-vibe', tweaks.vibe);
    root.setAttribute('data-density', tweaks.density);
    root.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.vibe, tweaks.accent, tweaks.density]);

  const now = "TUE · MAY 14 · 2026";

  return (
    <React.Fragment>
      <Masthead now={now} />
      <main className="site">
        <Hero />
        <Stats />
        <Departments />
        <Archive />
        <Projects />
        <Hire />
        <CTA />
      </main>
      <Footer />

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Visual">
          <window.TweakRadio
            label="Vibe"
            value={tweaks.vibe}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'paper', label: 'Paper' },
            ]}
            onChange={(v) => setTweak('vibe', v)}
          />
          <window.TweakColor
            label="Accent"
            value={tweaks.accent}
            options={['#f5c518', '#e8834a', '#5da8f5', '#5dd88a', '#b088f5']}
            onChange={(v) => setTweak('accent', v)}
          />
          <window.TweakRadio
            label="Density"
            value={tweaks.density}
            options={[
              { value: 'compact',   label: 'Compact' },
              { value: 'spacious',  label: 'Spacious' },
            ]}
            onChange={(v) => setTweak('density', v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </React.Fragment>
  );
}

window.App = App;
