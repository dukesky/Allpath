import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AllPath Personal Agent — a local agent that teaches itself to you",
  description:
    "An open-source personal agent that runs on your machine and introduces its own capabilities progressively: connect a model in conversation, link Telegram, schedule a daily briefing — every side effect behind your approval, every secret out of model context.",
  alternates: { canonical: "https://agent.all-path.com" }
};

const GITHUB = "https://github.com/dukesky/allpath-agent";
const CONTACT_EMAIL = "0tianzhang0@gmail.com";

/* The curriculum ladder is the product's actual state machine — the page's
   structural sequence is real, not decoration. */
const LADDER = [
  ["unseen", "you haven't met it yet"],
  ["offered", "suggested once, after your answer"],
  ["tried", "you expressed the intent"],
  ["succeeded", "verified by a real execution"],
  ["habitual", "used three times — never taught again"]
] as const;

const SURFACES = [
  {
    title: "The launch card",
    body:
      "Every start shows exactly one next step, chosen from what you haven't learned yet. Finish it — or dismiss it — and the card moves on. It never repeats a lesson you've completed."
  },
  {
    title: "The composer hint",
    body:
      "A quiet one-liner beside the input: the next capability worth trying, phrased as something you can type right now. It advances the moment you connect a channel mid-session."
  },
  {
    title: "The NEXT card",
    body:
      "After an answer — never instead of one — at most one suggestion per session, with cross-session cooldowns. Decline it and it stays declined."
  }
] as const;

const PATH = [
  {
    label: "connect a model",
    detail: "in conversation — API key hidden, verified before saving",
    who: "chat"
  },
  {
    label: "connect Telegram",
    detail: "a four-step guided flow; the bot answers you minutes later",
    who: "chat"
  },
  {
    label: "create automation",
    detail: "say it in Telegram — delivery preselects this conversation",
    who: "chat"
  },
  {
    label: "briefing arrives",
    detail: "next morning, in your pocket, from your own machine",
    who: "you"
  }
] as const;

const GUARANTEES = [
  [
    "Evidence, not vibes",
    "The curriculum advances only on verified execution records — a lesson counts as learned when the tool actually ran, never because a tip was shown."
  ],
  [
    "Every side effect waits",
    "Writing files, running commands, clicking pages: side-effecting tools ask first, with the exact bounded arguments in the approval panel."
  ],
  [
    "Secrets never meet the model",
    "API keys and bot tokens go through hidden input into a local secret store. They never enter conversation history, model context, or logs."
  ],
  [
    "Public internet only",
    "The browser and web lookup refuse local and private addresses — on the first request and on every redirect hop."
  ],
  [
    "Unattended runs can't go rogue",
    "Scheduled jobs keep side-effect tools denied. A denied request marks the run “needs attention” instead of failing silently."
  ],
  [
    "Yours, inspectably",
    "Standard-library Python, SQLite, and plain TOML in ~/.allpath-agent. Nothing leaves your machine but the model calls you configured."
  ]
] as const;

const STEPS = [
  {
    title: "Install",
    hint: "One line. The installer manages Python and a private virtualenv, then opens your first conversation — no API key required to look around.",
    code: "curl -fsSL https://raw.githubusercontent.com/dukesky/allpath-agent/main/scripts/install.sh | sh"
  },
  {
    title: "Connect a model — in the chat",
    hint: "Say it; don't configure it. Use a Claude Code or Codex account you already have, or an API key from Anthropic, OpenAI, Gemini, or Grok. Keys are entered hidden and verified before anything is saved.",
    code: "You> connect a model\n# guided picker → hidden key entry → verified → live"
  },
  {
    title: "Connect Telegram",
    hint: "A four-step guided flow around the official BotFather. Message your bot once afterwards so it becomes a delivery destination.",
    code: "You> connect Telegram\n# BotFather → username → hidden token → verified\nallpath-agent gateway   # start answering from your phone"
  },
  {
    title: "Schedule your briefing",
    hint: "From the terminal or straight from Telegram. The agent collects what's missing, echoes the full plan, and saves only after you confirm.",
    code: "You> create automation\n# name → task → schedule (0 7 * * *) → timezone → confirm\n# delivery: telegram · this conversation"
  },
  {
    title: "Let it run",
    hint: "Install the gateway as a background service and the briefing shows up every morning — no terminal window required.",
    code: "allpath-agent gateway install\nallpath-agent gateway status"
  }
] as const;

export default function AgentPage() {
  return (
    <main
      className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top text-slate-950"
      style={{ backgroundImage: "url('/home-cream-bg.svg')" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <Header />

        {/* ── Hero: the terminal is the product — recreated, not screenshotted ── */}
        <section className="mt-2 grid items-center gap-10 rounded-[2rem] border border-[#eadfcf] bg-white/65 px-6 py-10 shadow-[0_24px_80px_rgba(96,72,32,0.10)] backdrop-blur lg:grid-cols-[1.05fr_1.25fr] lg:px-12 lg:py-14">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary">
              AllPath · Personal Agent
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              A personal agent that
              <br />
              <span className="text-slate-500">teaches itself to you.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Most agents hand you fifty tools and a manual. AllPath starts as a plain chat and
              introduces one capability at a time — when your own messages show you're ready for
              it, and only until you've actually used it.
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
                First briefing by tomorrow
              </a>
            </div>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <div>
                <dt>Runs</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-slate-900">On your machine</dd>
              </div>
              <div>
                <dt>Models</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-slate-900">
                  Claude · OpenAI · Gemini · Grok
                </dd>
              </div>
              <div>
                <dt>Stack</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-slate-900">Python stdlib · SQLite</dd>
              </div>
            </dl>
          </div>

          <figure className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a] font-mono text-[12.5px] leading-relaxed shadow-[0_30px_90px_rgba(16,23,39,0.35)]">
              <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-[11px] text-white/40">allpath-agent</span>
              </div>
              <div className="space-y-3 px-4 py-4 text-slate-300">
                <TermPanel tone="user" label="YOU">
                  <span className="text-sky-300">❯</span> send me a news briefing every morning at 7
                </TermPanel>
                <p className="pl-1 text-[11px] text-slate-500">● create_automation · guided flow</p>
                <TermPanel tone="agent" label="ALLPATH · SETUP">
                  Please confirm this automation:
                  <br />• Morning brief — every day, 7:00 America/Los_Angeles
                  <br />• Delivered to: telegram · this conversation
                </TermPanel>
                <TermPanel tone="user" label="YOU">
                  <span className="text-sky-300">❯</span> confirm
                </TermPanel>
                <TermPanel tone="agent" label="ALLPATH · SETUP">
                  Saved. Next run: tomorrow 07:00.
                </TermPanel>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.07] px-3 py-2 text-emerald-300">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-400/80">
                    NEXT · workspace_files
                  </p>
                  <p className="mt-1 text-[12px] text-emerald-200/90">
                    Start Allpath in a project folder and ask it to explain the codebase.
                  </p>
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center font-mono text-[11px] text-slate-500">
              the actual terminal vocabulary — panels, activity lines, one NEXT card
            </figcaption>
          </figure>
        </section>

        {/* ── Signature: progressive teaching ─────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Why it's different</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            It keeps a curriculum of itself — and tracks what you've actually learned.
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            Sixteen capabilities, each with prerequisites and a lifecycle. Progress moves on
            deterministic evidence — a tool that really executed, a channel that really verified —
            so the agent knows the difference between “I showed you a tip” and “you can do this now.”
          </p>
          <ol className="mt-8 flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {LADDER.map(([state, gloss], i) => (
              <li key={state} className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 ${
                    state === "habitual"
                      ? "border-primary bg-primary/[0.06] text-primary"
                      : "border-slate-300 bg-white/80 text-slate-700"
                  }`}
                >
                  <span className="font-semibold">{state}</span>
                  <span className="ml-2 hidden text-slate-500 sm:inline">{gloss}</span>
                </span>
                {i < LADDER.length - 1 && <span aria-hidden className="text-slate-400">→</span>}
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {SURFACES.map((surface) => (
              <article key={surface.title} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <h4 className="text-sm font-semibold text-slate-900">{surface.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{surface.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            Dismiss any lesson once — it stays dismissed. Nothing curriculum-related ever enters model context.
          </p>
        </section>

        {/* ── The golden path ──────────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">The first hour</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Four conversations. Tomorrow morning it's just there.
          </h3>
          <ol className="mt-8 grid gap-3 md:grid-cols-4">
            {PATH.map((step, i) => {
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
                    {i < PATH.length - 1 && <span aria-hidden className="hidden text-slate-300 md:inline">→</span>}
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${you ? "text-primary" : "text-slate-900"}`}>
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600">
            Every step happens inside the conversation — no config files, no dashboard scavenger
            hunt. The whole path is covered by a deterministic end-to-end test against fake
            transports, and it's the same sequence the launch card walks you through.
          </p>
        </section>

        {/* ── Guarantees ───────────────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Boundaries, in code</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            The safety model is part of the product, not the disclaimer.
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUARANTEES.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Quick start ──────────────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 backdrop-blur lg:px-12" id="quick-start">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Quick start</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            From nothing to a morning briefing, in five steps.
          </h3>
          <ol className="mt-8 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-slate-200 bg-white/80 p-5 lg:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-xl">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                      step {i + 1} / {STEPS.length}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900">{step.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.hint}</p>
                  </div>
                  <pre className="w-full overflow-x-auto rounded-xl bg-[#14151a] px-4 py-3 font-mono text-[12px] leading-6 text-slate-200 lg:max-w-xl">
                    {step.code}
                  </pre>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            Developer preview — expect sharp edges. 300 automated tests and an honest changelog travel with it.
          </p>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/88 px-5 py-5 text-sm text-slate-600 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p>
            AllPath Personal Agent is an open-source project by the team behind{" "}
            <Link className="font-medium text-slate-900 hover:text-primary" href="https://all-path.com">
              AllPath
            </Link>
            . It runs on your machine, with your keys, under your approval.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a className="hover:text-primary" href={GITHUB}>
              GitHub
            </a>
            <a className="hover:text-primary" href={`${GITHUB}/blob/main/CHANGELOG.md`}>
              Changelog
            </a>
            <a className="hover:text-primary" href="https://trading.all-path.com">
              Trading Agent
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

function TermPanel({
  tone,
  label,
  children
}: {
  tone: "user" | "agent";
  label: string;
  children: React.ReactNode;
}) {
  const border = tone === "user" ? "border-sky-500/30" : "border-slate-600/50";
  const labelColor = tone === "user" ? "text-sky-400/90" : "text-slate-400";
  return (
    <div className={`rounded-lg border ${border} bg-white/[0.02] px-3 py-2`}>
      <p className={`text-[10px] uppercase tracking-widest ${labelColor}`}>{label}</p>
      <p className="mt-1 text-[12px] text-slate-200">{children}</p>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-4 z-20 mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <a className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" href="https://all-path.com">
          <Image alt="AllPath logo" className="object-contain" fill sizes="48px" src="/allpath-logo-mark.png" />
        </a>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Personal Agent</h1>
            <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-600">
              developer preview
            </span>
          </div>
          <p className="text-sm text-slate-600">
            by{" "}
            <a className="hover:text-primary" href="https://all-path.com">
              AllPath
            </a>
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
        <a className="transition hover:text-primary" href="#quick-start">
          Quick start
        </a>
        <a className="transition hover:text-primary" href="https://trading.all-path.com">
          Trading Agent
        </a>
        <a className="transition hover:text-primary" href="https://all-path.com">
          AllPath
        </a>
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
