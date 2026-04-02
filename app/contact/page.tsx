import Image from "next/image";
import Link from "next/link";

const CONTACT_EMAIL = "contact@all-path.com";

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl p-4">
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
            <p className="text-sm text-slate-600">Contact & Partnership</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link className="transition hover:text-primary" href="/">
            Try AllPath
          </Link>
          <Link className="transition hover:text-primary" href="/about">
            What is AllPath
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Contact & Partnership</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          We are looking for early users, collaborators, and strategic partners who want to
          explore multi-agent AI workflows with us.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Investment</h3>
            <p className="mt-2 text-sm text-slate-700">
              For investors interested in multi-agent AI interaction and future collaboration tools.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Product Collaboration</h3>
            <p className="mt-2 text-sm text-slate-700">
              For teams exploring integrations, co-building, or strategic collaboration around AI
              workspaces.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Pilot Users</h3>
            <p className="mt-2 text-sm text-slate-700">
              For startups, researchers, and creators willing to test AllPath in real workflows.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Research Partnership</h3>
            <p className="mt-2 text-sm text-slate-700">
              For labs and institutions interested in multi-agent reasoning and human-AI
              interaction design.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Email</p>
          <a
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-2 text-sm text-slate-700">
            If you are interested in partnering, piloting, or learning more, send a short note
            with your background, interest area, and what kind of collaboration you have in mind.
          </p>
        </div>
      </section>
    </main>
  );
}
