import Image from "next/image";
import Link from "next/link";

const CONTACT_EMAIL = "0tianzhang0@gmail.com";
const GITHUB_URL = "https://github.com/dukesky";

type ProductStatus = "Live" | "Beta" | "Paused";

interface Product {
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  status: ProductStatus;
  statusNote: string;
  href: string;
  hrefLabel: string;
  external?: boolean;
  repo: string;
  secondary?: { label: string; href: string };
  accent: string;
  mark: string;
  logo?: string;
}

const PRODUCTS: Product[] = [
  {
    name: "Trading Agent",
    tagline: "It proposes. You approve.",
    description:
      "A self-hosted trading agent that watches your strategies, explains its reasoning, and never places an order without your sign-off.",
    highlights: [
      "YAML strategies checked hourly",
      "Chat with memory on web and Telegram",
      "Nightly reflection on its own calls"
    ],
    status: "Live",
    statusNote: "Paper trading",
    href: "/trading",
    hrefLabel: "Explore Trading Agent",
    repo: "https://github.com/dukesky/allpath-trading-agent",
    secondary: { label: "Live journal", href: "/trading/journal" },
    accent: "from-emerald-500/20 to-emerald-500/0",
    mark: "📈"
  },
  {
    name: "Personal Agent",
    tagline: "A local agent that teaches itself to you.",
    description:
      "Starts as a plain chat and adds one capability at a time — connect a model, link Telegram, schedule a morning briefing — all on your own machine.",
    highlights: [
      "Runs locally, your data stays put",
      "Every side effect needs your approval",
      "Grows with you, one step at a time"
    ],
    status: "Beta",
    statusNote: "Open source",
    href: "/agent",
    hrefLabel: "Explore Personal Agent",
    repo: "https://github.com/dukesky/allpath-agent",
    accent: "from-sky-500/20 to-sky-500/0",
    mark: "🧭"
  },
  {
    name: "PolarBear",
    tagline: "Hybrid search for small businesses.",
    description:
      "No-code, AI-enhanced site search for SMEs: upload a product CSV, paste two lines of code, and shoppers get keyword plus semantic search.",
    highlights: [
      "Keyword + semantic vector search",
      "Embeds in Shopify, WordPress, Wix",
      "Search and click analytics"
    ],
    status: "Beta",
    statusNote: "Demo online",
    href: "https://polarbear-frontend-vcpindq3cq-uc.a.run.app",
    hrefLabel: "Open PolarBear",
    external: true,
    repo: "https://github.com/dukesky/PolarBear",
    accent: "from-indigo-500/20 to-indigo-500/0",
    mark: "🐻‍❄️",
    logo: "/polarbear-logo.png"
  }
];

const STATUS_STYLES: Record<ProductStatus, string> = {
  Live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Beta: "border-sky-200 bg-sky-50 text-sky-700",
  Paused: "border-slate-200 bg-slate-100 text-slate-600"
};

function ProductCard({ product }: { product: Product }) {
  const primaryProps = product.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(96,72,32,0.12)] lg:p-7">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${product.accent}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-2xl shadow-sm">
          {product.logo ? (
            <Image alt={`${product.name} logo`} className="object-contain p-1" fill sizes="48px" src={product.logo} />
          ) : (
            product.mark
          )}
        </span>
        <div className="text-right">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[product.status]}`}
          >
            {product.status}
          </span>
          <p className="mt-1 text-[11px] text-slate-500">{product.statusNote}</p>
        </div>
      </div>

      <h3 className="relative mt-5 text-2xl font-semibold tracking-tight">{product.name}</h3>
      <p className="relative mt-1 text-sm font-medium text-primary">{product.tagline}</p>
      <p className="relative mt-4 text-sm leading-7 text-slate-700">{product.description}</p>

      <ul className="relative mt-5 space-y-2 text-sm text-slate-600">
        {product.highlights.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="text-slate-400">
              —
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-7">
        <Link
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary"
          href={product.href}
          {...primaryProps}
        >
          {product.hrefLabel} {product.external ? "↗" : "→"}
        </Link>
        {product.secondary && (
          <Link className="text-sm font-medium text-slate-700 hover:text-primary" href={product.secondary.href}>
            {product.secondary.label}
          </Link>
        )}
        <a
          className="text-sm font-medium text-slate-500 hover:text-primary"
          href={product.repo}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub ↗
        </a>
      </div>
    </article>
  );
}

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
              href="https://polarbear-frontend-vcpindq3cq-uc.a.run.app"
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.name} product={product} />
            ))}
          </div>
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
