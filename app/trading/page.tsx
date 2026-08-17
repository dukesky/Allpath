import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AllPath Trading Agent — a self-hosted trading agent that proposes, never acts alone",
  description:
    "An open-source, self-hosted LLM trading agent: YAML strategies watched hourly, a chat agent with memory, an after-close reflection loop — and a human approval gate in front of every order. Paper trading by default.",
  alternates: { canonical: "https://trading.all-path.com" }
};

const GITHUB = "https://github.com/dukesky/allpath-trading-agent";
const CONTACT_EMAIL = "0tianzhang0@gmail.com";

/* The trust boundary, drawn as the pipeline it actually is. Only the human
   node carries the accent — everything the agent does is grey until you act. */
const PIPELINE = [
  { label: "rule fires", detail: "price < 150 in your YAML strategy", who: "sentinel" },
  { label: "agent researches", detail: "reads the chart, your memory, the thesis", who: "agent" },
  { label: "proposal queued", detail: "order or strategy change, with a diff", who: "agent" },
  { label: "you approve", detail: "web, phone push, or Telegram link", who: "you" },
  { label: "risk gate", detail: "deterministic caps — cannot be bypassed", who: "code" },
  { label: "paper order", detail: "Alpaca paper account by default", who: "broker" }
] as const;

const PILLARS = [
  {
    eyebrow: "Strategy sentinel",
    title: "Write the plan once. It gets checked every hour.",
    body:
      "Strategies are plain YAML: a thesis, a target weight, and rules like `price < 140 → sell all`. During market hours the sentinel evaluates every active strategy on your interval, arms and fires rules, and queues anything that needs a decision.",
    shot: "strategies",
    alt: "Strategies page: cards for four fictional strategies with horizon and bias chips, live price and day change, and colour-coded key levels."
  },
  {
    eyebrow: "An agent that remembers",
    title: "Talk to it in the browser or in Telegram — same agent, same memory.",
    body:
      "Ask what a position looks like against its plan, tighten a stop, draft a new strategy. It keeps four layers of memory (your profile, strategies, per-stock notes, lessons) and consolidates them nightly, so it gets less generic the longer you use it.",
    shot: "chat",
    alt: "Chat page: the agent answers a question about NVDA with a small table, then queues a stop-loss change for approval."
  },
  {
    eyebrow: "Nightly reflection",
    title: "After the close, it re-reads the day and tells you what it thinks.",
    body:
      "A bounded reflection session reviews every strategy against the day's fills, prices, and triggers, writes durable lessons into memory, and — when a thesis has drifted — proposes a revision. You get the report on your phone; the proposal waits on the Pending page.",
    shot: "reviews",
    alt: "Pending page: a reflection-proposed strategy revision shown as a side-by-side diff, and a triggered buy order with its price context, each with Approve and Reject."
  }
] as const;

const GUARANTEES = [
  ["Paper by default", "Alpaca paper trading out of the box. Live trading is a deliberate .env change, not a checkbox."],
  ["Every order waits for you", "The agent can only propose. Web, one-tap link, or Telegram — but a human clicks Approve."],
  ["Risk gate in code", "Position caps and daily limits are deterministic Python the LLM cannot reach around."],
  ["Strategy edits are diffs", "Chat drafts and reflection proposals land as side-by-side diffs. Nothing writes to a strategy file except your approval."],
  ["Runs on your machine", "SQLite, local YAML, your own API keys. Nothing leaves your box but the calls you configured."],
  ["Honest state", "Draft strategies are labelled not monitored. Fills show submitted vs filled. A stale heartbeat shows as stale."]
] as const;

const STEPS = [
  {
    title: "Clone and install",
    code: "git clone https://github.com/dukesky/allpath-trading-agent\ncd allpath-trading-agent\nuv sync"
  },
  {
    title: "Add two keys",
    code: "cp .env.example .env\n# ALPACA_API_KEY / ALPACA_SECRET_KEY  (paper account, free)\n# OPENROUTER_API_KEY  (or OpenAI / Anthropic)"
  },
  {
    title: "Start the web UI",
    code: "uv run allpath-trade serve\n# → http://127.0.0.1:8791  (token printed on first run)"
  },
  {
    title: "Draft a strategy in chat",
    code: "“Buy NVDA on pullbacks under 170, up to 20% of the account,\n hard stop at 140.”\n# → queued on Pending as a diff → Approve → activate on the Strategies page"
  },
  {
    title: "Take it with you",
    code: "Settings → Push (ntfy) or Telegram\n# triggers, fills, reports and approve links on your phone"
  }
] as const;

export default function TradingPage() {
  return (
    <main
      className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top text-slate-950"
      style={{ backgroundImage: "url('/home-cream-bg.svg')" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <Header />

        {/* ── Hero: cream frame, product in its own dark world ─────────────── */}
        <section className="mt-2 grid items-center gap-10 rounded-[2rem] border border-[#eadfcf] bg-white/65 px-6 py-10 shadow-[0_24px_80px_rgba(96,72,32,0.10)] backdrop-blur lg:grid-cols-[1.05fr_1.25fr] lg:px-12 lg:py-14">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary">
              AllPath · Trading Agent
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              A trading agent that proposes.
              <br />
              <span className="text-slate-500">You approve.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Self-hosted, open source. Write strategies in plain YAML, let a sentinel watch them
              every hour, chat with an agent that remembers how you think — and keep a human
              approval gate in front of every single order.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary"
                href={GITHUB}
              >
                <GitHubMark /> View on GitHub
              </a>
              <a
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-primary hover:text-primary"
                href="#quick-start"
              >
                Run it in 5 minutes
              </a>
            </div>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <div>
                <dt>Broker</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-slate-900">Alpaca · paper</dd>
              </div>
              <div>
                <dt>Models</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-slate-900">Any via OpenRouter</dd>
              </div>
              <div>
                <dt>Stack</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-slate-900">Python · SQLite</dd>
              </div>
            </dl>
          </div>

          <figure className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a] shadow-[0_30px_90px_rgba(16,23,39,0.35)]">
              <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-[11px] text-white/40">127.0.0.1:8791 — Dashboard</span>
              </div>
              <Image
                alt="Dashboard: equity curve with week / month / YTD / year tabs, positions table, and compact strategy cards. All figures are demo data."
                className="h-auto w-full"
                height={1180}
                priority
                sizes="(min-width: 1024px) 720px, 100vw"
                src="/trading/dashboard-dark.png"
                width={1280}
              />
            </div>
            <figcaption className="mt-3 text-center font-mono text-[11px] text-slate-500">
              demo data — not a real account
            </figcaption>
          </figure>
        </section>

        {/* ── Signature: the pipeline ────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">How an order happens</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Six hops. One of them is you.
          </h3>
          <ol className="mt-8 grid gap-3 md:grid-cols-6">
            {PIPELINE.map((step, i) => {
              const you = step.who === "you";
              return (
                <li
                  key={step.label}
                  className={`relative rounded-2xl border p-4 ${
                    you
                      ? "border-primary bg-primary/[0.06] shadow-[0_0_0_4px_rgba(9,88,217,0.10)]"
                      : "border-slate-200 bg-white/80"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <span>{step.who}</span>
                    {i < PIPELINE.length - 1 && (
                      <span aria-hidden className="hidden text-slate-300 md:inline">→</span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${you ? "text-primary" : "text-slate-900"}`}>
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
            The agent has no tool that places an order or writes a strategy file. It can research,
            remember, and propose. Approval is a click on the Pending page, a one-time link in a
            notification, or nothing at all — in which case nothing happens.
          </p>
        </section>

        {/* ── Three pillars ──────────────────────────────────────────────────── */}
        <section className="mt-8 space-y-6">
          {PILLARS.map((p, i) => (
            <article
              key={p.eyebrow}
              className={`grid items-center gap-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 p-6 backdrop-blur lg:grid-cols-2 lg:p-10 ${
                i % 2 === 1 ? "lg:[&>figure]:order-first" : ""
              }`}
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">{p.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{p.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{p.body}</p>
              </div>
              <figure className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a] shadow-[0_20px_60px_rgba(16,23,39,0.25)]">
                <Image
                  alt={p.alt}
                  className="h-auto w-full"
                  height={1100}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  src={`/trading/${p.shot}-dark.png`}
                  width={1280}
                />
              </figure>
            </article>
          ))}
        </section>

        {/* ── Guarantees ────────────────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] bg-[#101727] px-6 py-12 text-slate-100 lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">What it will not do</p>
          <h3 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for the boring failure modes: nothing moves money without you.
          </h3>
          <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {GUARANTEES.map(([title, body]) => (
              <li key={title} className="border-t border-white/10 pt-4">
                <p className="font-mono text-sm text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Quick start ───────────────────────────────────────────────────── */}
        <section
          id="quick-start"
          className="mt-8 scroll-mt-24 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12"
        >
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Quick start</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Five minutes to a running agent. Paper account, no card.
          </h3>
          <ol className="mt-8 grid gap-4 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white/85 p-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                </div>
                <pre className="mt-3 flex-1 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#14151a] p-3 font-mono text-[11px] leading-5 text-slate-200">
                  {s.code}
                </pre>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Full setup, the strategy YAML reference, and every safety note are in the{" "}
            <a className="font-medium text-primary underline-offset-2 hover:underline" href={`${GITHUB}#readme`}>
              README
            </a>{" "}
            (English and 中文). Requires Python 3.11+ and{" "}
            <a className="font-medium text-primary underline-offset-2 hover:underline" href="https://docs.astral.sh/uv/">
              uv
            </a>
            .
          </p>
        </section>

        {/* ── Gallery ───────────────────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">More of the UI</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["strategy_detail", "Strategy detail: thesis, rules with live state, version history, and the per-strategy notification toggle."],
              ["memory", "Memory page: the agent's curated layers — profile, strategies, per-stock notes, lessons — read-only, written only through conversation."],
              ["settings", "Settings: model dropdowns from a live catalog, per-channel notification tests, Telegram pairing, one Save."]
            ].map(([shot, alt]) => (
              <figure key={shot} className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a]">
                <Image alt={alt} className="h-auto w-full" height={800} sizes="(min-width: 1024px) 400px, 100vw" src={`/trading/${shot}-dark.png`} width={1280} />
                <figcaption className="px-3 py-2 text-[11px] leading-5 text-slate-400">{alt}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/88 px-5 py-5 text-sm text-slate-600 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p>
            AllPath Trading Agent is an open-source project by the team behind{" "}
            <Link className="font-medium text-slate-900 hover:text-primary" href="/">
              AllPath
            </Link>
            . Not investment advice. Paper trading by default; live trading is at your own risk.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a className="hover:text-primary" href={GITHUB}>
              GitHub
            </a>
            <a className="hover:text-primary" href={`${GITHUB}/blob/main/CHANGELOG.md`}>
              Changelog
            </a>
            <a className="hover:text-primary" href={`mailto:${CONTACT_EMAIL}`}>
              Contact
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-4 z-20 mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" href="/">
          <Image alt="AllPath logo" className="object-contain" fill sizes="48px" src="/allpath-logo-mark.png" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Trading Agent</h1>
            <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-600">
              open source
            </span>
          </div>
          <p className="text-sm text-slate-600">
            by{" "}
            <Link className="hover:text-primary" href="/">
              AllPath
            </Link>
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
        <a className="transition hover:text-primary" href="#quick-start">
          Quick start
        </a>
        <Link className="transition hover:text-primary" href="/">
          AllPath
        </Link>
        <a className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-white transition hover:bg-primary" href={GITHUB}>
          <GitHubMark /> GitHub
        </a>
      </nav>
    </header>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
