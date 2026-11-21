import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPostDate, type TradingBlogPost } from "@/lib/tradingBlog";
import CopyButton from "../CopyButton";

const GITHUB = "https://github.com/dukesky/allpath-trading-agent";

/** Cream page frame, sticky header and footer shared by the blog pages.
    Same shell as the live journal, so the three pages read as one site. */
export function BlogFrame({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <main
      className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top text-slate-950"
      style={{ backgroundImage: "url('/home-cream-bg.svg')" }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="z-20 mb-6 sm:sticky sm:top-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
              href="/trading"
            >
              <Image alt="AllPath logo" className="object-contain" fill sizes="44px" src="/allpath-logo-mark.png" />
            </Link>
            <div>
              <p className="text-lg font-semibold leading-tight">{heading}</p>
              <p className="text-sm text-slate-600">
                <Link className="hover:text-primary" href="/trading">
                  Trading Agent
                </Link>{" "}
                · notes from the build
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="transition hover:text-primary" href="/trading">
              About the agent
            </Link>
            <Link className="transition hover:text-primary" href="/trading/journal">
              Live journal
            </Link>
            <Link className="transition hover:text-primary" href="/trading/blog">
              Blog
            </Link>
            <a className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-primary" href={GITHUB}>
              GitHub
            </a>
          </nav>
        </header>

        {children}

        <footer className="mt-10 rounded-2xl border border-slate-200 bg-white/88 px-5 py-4 text-sm text-slate-600 backdrop-blur">
          Built in the open:{" "}
          <a className="font-medium text-primary hover:underline" href={GITHUB}>
            source on GitHub
          </a>
          . Paper account; past demo performance means nothing. Not investment advice.
        </footer>
      </div>
    </main>
  );
}

/** One post: title block, disclaimer, then the body in a readable measure. */
export function BlogPostShell({ post, children }: { post: TradingBlogPost; children: ReactNode }) {
  return (
    <BlogFrame heading="Blog">
      <article className="rounded-[2rem] border border-[#eadfcf] bg-white/75 px-5 py-8 shadow-[0_24px_80px_rgba(96,72,32,0.08)] backdrop-blur sm:px-10 sm:py-12">
        <div className="mx-auto max-w-[44rem]">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            <Link className="hover:underline" href="/trading/blog">
              Blog
            </Link>{" "}
            · <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.12] tracking-tight sm:text-[2.6rem]">{post.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{post.summary}</p>
          <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {post.note ?? "Paper trading, not real money. Nothing here is financial advice or a promise of returns."}
          </p>
          <div className="mt-8">{children}</div>
          <p className="mt-10 border-t border-[#eadfcf] pt-6 text-sm text-slate-600">
            <Link className="font-medium text-primary hover:underline" href="/trading/blog">
              ← All posts
            </Link>
          </p>
        </div>
      </article>
    </BlogFrame>
  );
}

/* ── Body building blocks, so every post gets the same typography ───────── */

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-[17px] leading-[1.65] text-slate-800 sm:text-[18px]">{children}</p>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-11 text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:mt-12">{children}</h2>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.86em] text-slate-900">{children}</code>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const className = "font-medium text-primary underline-offset-2 hover:underline";
  return href.startsWith("/") ? (
    <Link className={className} href={href}>
      {children}
    </Link>
  ) : (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

/** Dark block for commands, with a language label and a copy button.
    `copy` is what lands on the clipboard: runnable commands only. */
export function Terminal({ children, copy, label = "Shell" }: { children: string; copy?: string; label?: string }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-[#101727]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</span>
        <CopyButton label="Copy" text={copy ?? children} />
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-slate-100">{children}</pre>
    </div>
  );
}

/** A figure with a caption: chart, image, table or snippet. */
export function Figure({ children, caption }: { children: ReactNode; caption: ReactNode }) {
  return (
    <figure className="mt-8 rounded-2xl border border-[#eadfcf] bg-white/80 p-4 sm:p-5">
      {children}
      <figcaption className="mt-3 text-sm leading-6 text-slate-600">{caption}</figcaption>
    </figure>
  );
}
