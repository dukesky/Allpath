import Image from "next/image";
import Link from "next/link";

const CONTACT_EMAIL = "0tianzhang0@gmail.com";

const HERO_CHIPS = [
  "Round Table",
  "One-to-One",
  "Story Personas",
  "File Analysis",
  "Agent Teams"
];

const DETAIL_CARDS = [
  {
    eyebrow: "Multi-agent discussion",
    title: "Build an AI team instead of relying on one answer.",
    body:
      "AllPath lets one user coordinate multiple AI agents in the same conversation. Each agent can use a different role, personality, or model so the discussion surfaces contrast, trade-offs, and stronger decisions.",
    href: "/about"
  },
  {
    eyebrow: "Configurable workflows",
    title: "Move from quick starts to structured collaboration.",
    body:
      "Start from story-based presets, historical figures, or your own custom agent library. Switch between round table and one-to-one modes, upload files, and keep sessions organized as reusable discussions.",
    href: "/chat"
  },
  {
    eyebrow: "For real work",
    title: "Use it for research, product thinking, writing, and strategy.",
    body:
      "AllPath is designed for people who need more than a generic assistant: founders comparing options, creators developing ideas, and teams pressure-testing assumptions before they act.",
    href: "/about"
  }
];

const FEATURE_PANELS = [
  {
    eyebrow: "Quick start",
    title: "Launch a conversation in seconds.",
    body:
      "Choose a story or agent group, start a session, and get an AI team ready to discuss one problem from multiple perspectives."
  },
  {
    eyebrow: "Flexible control",
    title: "Decide who speaks, what they know, and how they respond.",
    body:
      "Each agent can have its own profile, model, and initial rules. Mute participants, direct replies with @ mentions, or let the full team respond together."
  },
  {
    eyebrow: "Built to evolve",
    title: "A foundation for richer human-AI collaboration.",
    body:
      "Today it is a live beta for multi-agent discussion. The long-term direction is a workspace where persistent teams of AI agents help users think, compare, and decide at a higher level."
  }
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top text-slate-950"
      style={{ backgroundImage: "url('/home-cream-bg.svg')" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <Image
                alt="AllPath logo"
                className="object-contain"
                fill
                priority
                sizes="48px"
                src="/allpath-logo-mark.png"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">AllPath</h1>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Beta
                </span>
              </div>
              <p className="text-sm text-slate-600">Where many minds find one path.</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="transition hover:text-primary" href="/about">
              What is AllPath
            </Link>
            <Link className="transition hover:text-primary" href="/contact">
              Contact
            </Link>
            <Link className="rounded-full bg-slate-950 px-5 py-2.5 text-white transition hover:bg-primary" href="/chat">
              Start Your Conversation
            </Link>
          </nav>
        </header>

        <section className="flex min-h-[calc(100vh-7.5rem)] flex-col items-center justify-center py-10">
          <div className="flex w-full flex-col items-center rounded-[2rem] border border-[#eadfcf] bg-white/65 px-6 py-10 shadow-[0_24px_80px_rgba(96,72,32,0.10)] backdrop-blur sm:px-10 lg:px-14 lg:py-14">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">AllPath</p>
            <h2 className="mt-6 max-w-5xl text-center text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Where many minds find one path.
            </h2>
            <p className="mt-6 max-w-3xl text-center text-base leading-8 text-slate-700 sm:text-lg">
              A multi-agent workspace where models think together to reach a better answer.
            </p>

            <div className="mt-12 w-full max-w-4xl rounded-[2rem] border border-[#eadfcf] bg-white/95 p-4 shadow-[0_18px_50px_rgba(96,72,32,0.12)]">
              <div className="rounded-[1.6rem] border border-slate-200 bg-[#fffdf8] px-5 py-5 shadow-inner">
                <p className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                  What should your AI team work on?
                </p>
                <div className="mt-6 flex flex-col gap-4 rounded-[1.4rem] border border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex-1 text-left text-base leading-7 text-slate-500 sm:text-lg">
                    Ask your AI team to brainstorm ideas, challenge assumptions, compare options,
                    or analyze a file together.
                  </p>
                  <Link
                    className="inline-flex h-12 w-12 items-center justify-center self-end rounded-full bg-slate-950 text-xl text-white transition hover:bg-primary sm:self-auto"
                    href="/chat"
                  >
                    ↗
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {HERO_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary"
                href="/chat"
              >
                Start Your Conversation
              </Link>
              <Link
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
                href="/about"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 pb-8 lg:grid-cols-[1.6fr_0.9fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Introducing AllPath
            </p>
            <h3 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              AI collaboration should feel like a team room, not a single reply box.
            </h3>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
              Most AI products optimize for one assistant and one response. AllPath is built for a
              different workflow: one user directing multiple AI participants in the same session,
              letting perspectives collide before the final conclusion.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-white"
                href="/chat"
              >
                Open the Workspace
              </Link>
              <Link
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700"
                href="/about"
              >
                Read About AllPath
              </Link>
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                Live beta
              </p>
              <h4 className="mt-3 text-2xl font-semibold tracking-tight">
                Try the current product now.
              </h4>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                The current beta already supports round table and one-to-one modes, story-based
                agent groups, image and file uploads, and configurable model choices.
              </p>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                Contact
              </p>
              <h4 className="mt-3 text-2xl font-semibold tracking-tight">
                Talk to us about pilots, collaboration, or investment.
              </h4>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                If you want to test AllPath in a real workflow or discuss a partnership, use the
                contact page or email directly.
              </p>
              <a
                className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </article>
          </div>
        </section>

        <section className="grid gap-6 pb-8 md:grid-cols-3">
          {DETAIL_CARDS.map((card) => (
            <article
              key={card.title}
              className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-sm"
            >
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                {card.eyebrow}
              </p>
              <h4 className="mt-4 text-2xl font-semibold tracking-tight">{card.title}</h4>
              <p className="mt-4 text-sm leading-8 text-slate-700">{card.body}</p>
              <Link className="mt-6 inline-block text-sm font-medium text-primary hover:underline" href={card.href}>
                Learn more
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-6 pb-12 lg:grid-cols-3">
          {FEATURE_PANELS.map((panel) => (
            <article
              key={panel.title}
              className="rounded-[2rem] border border-slate-200 bg-[#fffaf2]/95 p-6 shadow-sm"
            >
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                {panel.eyebrow}
              </p>
              <h4 className="mt-4 text-2xl font-semibold tracking-tight">{panel.title}</h4>
              <p className="mt-4 text-sm leading-8 text-slate-700">{panel.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
