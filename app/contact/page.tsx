"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const CONTACT_EMAIL = "0tianzhang0@gmail.com";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top" style={{ backgroundImage: "url('/home-cream-bg.svg')" }}>
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
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
            <Link className="transition hover:text-primary" href="/about">
              What is AllPath
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-4xl font-semibold text-slate-900 sm:text-5xl">Contact & Partnership</h2>
          <p className="mt-5 text-lg leading-9 text-slate-700 sm:text-xl">
            We are looking for early users, collaborators, and strategic partners who want to
            explore multi-agent AI workflows with us.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold text-slate-900">Investment</h3>
              <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                For investors interested in multi-agent AI interaction and future collaboration tools.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold text-slate-900">Product Collaboration</h3>
              <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                For teams exploring integrations, co-building, or strategic collaboration around AI
                workspaces.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold text-slate-900">Pilot Users</h3>
              <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                For startups, researchers, and creators willing to test AllPath in real workflows.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold text-slate-900">Research Partnership</h3>
              <p className="mt-3 text-base leading-8 text-slate-700 sm:text-lg">
                For labs and institutions interested in multi-agent reasoning and human-AI
                interaction design.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h3 className="text-3xl font-semibold text-slate-900">Contact Me</h3>
            <p className="mt-4 text-base leading-8 text-slate-700 sm:text-lg">
              Tell us who you are, what you are working on, and how you would like to collaborate
              with AllPath.
            </p>
            <p className="mt-5 text-lg font-semibold text-slate-900">Email</p>
            <a
              className="mt-2 inline-block text-lg font-medium text-primary hover:underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                className="rounded-xl bg-primary px-5 py-3 text-center text-sm font-medium text-white"
                href={`mailto:${CONTACT_EMAIL}?subject=AllPath%20Partnership%20Inquiry`}
              >
                Send Email
              </a>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700"
                onClick={() => void copyEmail()}
              >
                {copied ? "Email copied" : "Copy Email"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
