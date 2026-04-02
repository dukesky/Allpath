import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4">
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-sm text-slate-600">What is AllPath</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link className="transition hover:text-primary" href="/">
            Try AllPath
          </Link>
          <Link className="transition hover:text-primary" href="/contact">
            Contact
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">What is AllPath</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            AllPath is a multi-agent discussion workspace. Instead of chatting with a single AI,
            you can bring multiple agents into the same conversation, assign them different roles
            or personalities, and compare how they reason through the same problem.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            The goal is not just to generate one answer faster. The goal is to create a better
            thinking environment for analysis, brainstorming, debate, and decision-making.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">What you can do today</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Round Table discussions</h3>
              <p className="mt-2 text-sm text-slate-700">
                Let multiple agents review the same prompt, react to prior discussion, and produce
                contrasting viewpoints.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">One-to-One mode</h3>
              <p className="mt-2 text-sm text-slate-700">
                Talk to individual agents directly, or address all of them at once with targeted
                mentions.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Story and persona groups</h3>
              <p className="mt-2 text-sm text-slate-700">
                Organize agents into reusable story worlds, historical groups, or custom persona
                libraries.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Files and images</h3>
              <p className="mt-2 text-sm text-slate-700">
                Upload text files and images into the conversation so agents can analyze shared
                material together.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Our goal</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            We believe AI interaction should move beyond one-user-one-agent chat. Many real
            decisions need multiple perspectives, productive disagreement, and structured synthesis.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            AllPath is an early step toward a more collaborative human-AI interface: one where
            reasoning can be distributed across roles, models, and viewpoints in a way that feels
            closer to a working group than a solo assistant.
          </p>
        </section>
      </div>
    </main>
  );
}
