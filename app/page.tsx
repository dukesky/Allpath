import Image from "next/image";
import Link from "next/link";
import { ProductShowcase } from "./ProductShowcase";
import { POLARBEAR_URL } from "./products";

const CONTACT_EMAIL = "0tianzhang0@gmail.com";
const GITHUB_URL = "https://github.com/dukesky";

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top text-slate-950"
      style={{ backgroundImage: "url('/home-cream-bg.svg')" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="relative z-20 mb-6 sm:sticky sm:top-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <Link className="flex items-center gap-3" href="/">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <Image
                alt="AllPath logo"
                className="object-contain"
                fill
                priority
                sizes="44px"
                src="/allpath-logo-mark.png"
              />
            </div>
            <div>
              <p className="text-xl font-semibold">AllPath</p>
              <p className="text-sm text-slate-600">Open-source AI agents with a human in the loop.</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
            <a className="transition hover:text-primary" href="#products">
              Products
            </a>
            <Link className="transition hover:text-primary" href="/trading">
              Trading
            </Link>
            <Link className="transition hover:text-primary" href="/agent">
              Personal Agent
            </Link>
            <a
              className="transition hover:text-primary"
              href={POLARBEAR_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              PolarBear
            </a>
            <Link className="transition hover:text-primary" href="/contact">
              Contact
            </Link>
            <a
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400"
              href={GITHUB_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub ↗
            </a>
          </nav>
        </header>

        <section className="flex flex-col items-center px-2 pb-10 pt-12 text-center sm:pt-16">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">AllPath</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Small AI agents that do real work — and ask before they act.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
            AllPath is a family of open-source projects. Each one is built to run on your own terms,
            show its reasoning, and keep a person in charge of every consequential step.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary"
              href="#products"
            >
              Browse the products
            </a>
            <a
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
              href={GITHUB_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              View on GitHub
            </a>
          </div>
        </section>

        <section className="scroll-mt-28 pb-10" id="products">
          <div className="mb-5 flex items-end justify-between gap-4 px-1">
            <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
            <p className="hidden text-sm text-slate-500 sm:block">All open source · self-hostable</p>
          </div>
          <ProductShowcase />
        </section>

        <section className="pb-10">
          <h2 className="mb-4 px-1 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Experiments
          </h2>
          <Link
            className="group flex flex-col gap-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 p-5 transition hover:border-slate-400 hover:bg-white/80 sm:flex-row sm:items-center sm:justify-between"
            href="/chat"
          >
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-800">Group Chat</p>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Archived beta
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The original AllPath: put several AI personas in one room — round table or one-to-one —
                and let their perspectives collide. No longer actively developed; bring your own
                OpenRouter API key.
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-slate-700 group-hover:text-primary">
              Try it →
            </span>
          </Link>
        </section>

        <footer className="flex flex-col gap-3 border-t border-slate-200/80 px-1 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AllPath</p>
          <div className="flex flex-wrap gap-5">
            <a className="hover:text-primary" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            <Link className="hover:text-primary" href="/about">
              About Group Chat
            </Link>
            <a className="hover:text-primary" href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
