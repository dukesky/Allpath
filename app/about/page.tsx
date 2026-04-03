import Image from "next/image";
import Link from "next/link";

const TODAY_ITEMS = [
  "Round Table multi-agent conversations",
  "One-to-One mode with targeted agent mentions",
  "Story-based quick starts and reusable persona groups",
  "Image and file discussion inside chat",
  "Mobile-ready experience for lightweight testing"
];

const NEXT_ITEMS = [
  "Accounts and cloud-persistent sessions",
  "Team collaboration and shared workspaces",
  "Richer evaluation and orchestration controls",
  "Partner pilots and production-grade deployment workflows"
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top" style={{ backgroundImage: "url('/home-cream-bg.svg')" }}>
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Link className="flex items-center gap-3" href="/">
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
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="transition hover:text-primary" href="/chat">
              Try AllPath
            </Link>
            <Link className="transition hover:text-primary" href="/contact">
              Contact
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">What is AllPath</h2>
            <p className="mt-6 text-lg leading-9 text-slate-700 sm:text-xl">
              AllPath is a multi-agent discussion workspace. Instead of working with a single AI
              assistant, one user can bring multiple AI agents into the same conversation, assign
              them different roles or personalities, and compare how they reason through the same
              problem.
            </p>
            <p className="mt-4 text-lg leading-9 text-slate-700 sm:text-xl">
              The goal is not just to get one answer faster. The goal is to create a better
              environment for analysis, brainstorming, disagreement, synthesis, and decision-making.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">The problem</h2>
            <p className="mt-6 text-lg leading-9 text-slate-700 sm:text-xl">
              Most AI products are built around one-to-one chat. That works for simple requests,
              but it breaks down when a problem needs multiple viewpoints, role-based reasoning,
              or structured comparison across different styles of thinking.
            </p>
            <p className="mt-4 text-lg leading-9 text-slate-700 sm:text-xl">
              Real work often looks more like a discussion than a single answer. Product planning,
              research, writing, teaching, and judgment-heavy decisions all benefit from contrast,
              challenge, and synthesis. AllPath is designed around that reality.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">What AllPath does</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xl font-semibold text-slate-900">Round Table discussions</h3>
                <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                  Let multiple agents review the same prompt, react to prior discussion, and produce
                  contrasting viewpoints in one shared thread.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xl font-semibold text-slate-900">One-to-One mode</h3>
                <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                  Talk to a single agent directly, or address several of them selectively when you
                  want narrower responses inside the same session.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xl font-semibold text-slate-900">Story and persona groups</h3>
                <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                  Organize agents into reusable worlds, historical groups, or custom persona
                  libraries so setup becomes fast and expressive.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xl font-semibold text-slate-900">Files and images in context</h3>
                <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                  Upload text files and images into the conversation so agents can analyze the same
                  material together instead of working from disconnected prompts.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Why we are building it</h2>
            <p className="mt-6 text-lg leading-9 text-slate-700 sm:text-xl">
              We believe AI interaction should move beyond one-user-one-agent chat. Many important
              decisions need multiple perspectives, productive disagreement, and deliberate
              synthesis. A single assistant is often too narrow a frame.
            </p>
            <p className="mt-4 text-lg leading-9 text-slate-700 sm:text-xl">
              AllPath is an early step toward a more collaborative human-AI interface: one where
              reasoning can be distributed across roles, models, and viewpoints in a format that
              feels closer to a working group than a solo assistant.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-3xl font-semibold text-slate-900">What exists today</h2>
              <ul className="mt-6 space-y-3 text-base leading-8 text-slate-700 sm:text-lg">
                {TODAY_ITEMS.map((item) => (
                  <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-3xl font-semibold text-slate-900">What comes next</h2>
              <ul className="mt-6 space-y-3 text-base leading-8 text-slate-700 sm:text-lg">
                {NEXT_ITEMS.map((item) => (
                  <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-slate-900">Try it now</h2>
                <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                  The fastest way to understand AllPath is to open the product and start a session.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link className="rounded-xl bg-primary px-5 py-3 text-center text-sm font-medium text-white" href="/chat">
                  Try AllPath
                </Link>
                <Link className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-medium text-slate-700" href="/contact">
                  Contact
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
