"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCTS, Product, ProductStatus, ProductVisual } from "./products";

const STATUS_STYLES: Record<ProductStatus, string> = {
  Live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Beta: "border-sky-200 bg-sky-50 text-sky-700",
  Paused: "border-slate-200 bg-slate-100 text-slate-600"
};

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function SmartLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  if (isExternal(href) || href.endsWith(".pdf")) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function ProductMark({ product, size = "h-12 w-12" }: { product: Product; size?: string }) {
  return (
    <span
      className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-2xl shadow-sm`}
    >
      {product.logo ? (
        <Image alt={`${product.name} logo`} className="object-contain p-1" fill sizes="48px" src={product.logo} />
      ) : (
        product.mark
      )}
    </span>
  );
}

function ProductCard({
  product,
  index,
  isOpen,
  onToggle
}: {
  product: Product;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      // Single-column (mobile): cards take even order slots so the open
      // details panel can slot in directly beneath the clicked card.
      style={{ "--card-order": index * 2 } as React.CSSProperties}
      className={`max-md:[order:var(--card-order)] group relative flex flex-col overflow-hidden rounded-[2rem] border bg-white/92 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(96,72,32,0.12)] lg:p-7 ${
        isOpen ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${product.accent}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <ProductMark product={product} />
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
        <SmartLink
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary"
          href={product.href}
        >
          {product.hrefLabel} {product.external ? "↗" : "→"}
        </SmartLink>
        <button
          aria-controls={`details-${product.slug}`}
          aria-expanded={isOpen}
          className="text-sm font-medium text-slate-700 hover:text-primary"
          onClick={onToggle}
          type="button"
        >
          {isOpen ? "Hide details ↑" : "Learn more ↓"}
        </button>
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

function Visual({ visual }: { visual: ProductVisual }) {
  if (visual.kind === "image") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a] shadow-[0_20px_60px_rgba(16,23,39,0.25)]">
        <Image
          alt={visual.alt}
          className="h-auto w-full"
          height={visual.height}
          sizes="(min-width: 1024px) 560px, 100vw"
          src={visual.src}
          width={visual.width}
        />
        <figcaption className="px-4 py-3 text-xs leading-5 text-slate-400">{visual.alt}</figcaption>
      </figure>
    );
  }

  const header = (title: string) => (
    <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-3 font-mono text-[11px] text-white/40">{title}</span>
    </div>
  );

  if (visual.kind === "transcript") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a] shadow-[0_20px_60px_rgba(16,23,39,0.25)]">
        {header(visual.title)}
        <div className="space-y-2 px-5 py-4 font-mono text-[12.5px] leading-6">
          {visual.lines.map((line, index) => (
            <p
              key={index}
              className={
                line.speaker === "you"
                  ? "text-white"
                  : line.speaker === "note"
                    ? "text-sky-300/80"
                    : "text-slate-300"
              }
            >
              {line.speaker === "you" && <span className="text-emerald-400">You&gt; </span>}
              {line.text}
            </p>
          ))}
        </div>
      </figure>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#14151a] shadow-[0_20px_60px_rgba(16,23,39,0.25)]">
      {header(visual.title)}
      <pre className="overflow-x-auto whitespace-pre px-5 py-4 font-mono text-[12.5px] leading-6 text-slate-200">
        {visual.code}
      </pre>
      <figcaption className="border-t border-white/10 px-5 py-3 text-xs leading-5 text-slate-400">
        {visual.caption}
      </figcaption>
    </figure>
  );
}

function ProductDetails({ product, onClose }: { product: Product; onClose: () => void }) {
  const { details } = product;

  return (
    <section
      aria-labelledby={`details-title-${product.slug}`}
      className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_80px_rgba(96,72,32,0.12)] sm:p-8 lg:p-10"
      id={`details-${product.slug}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${product.accent}`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProductMark product={product} size="h-14 w-14" />
          <div>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl" id={`details-title-${product.slug}`}>
              {product.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-primary">{product.tagline}</p>
          </div>
        </div>
        <button
          aria-label={`Close ${product.name} details`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>

      <p className="relative mt-6 max-w-3xl text-base leading-8 text-slate-700">{details.pitch}</p>

      <div className="relative mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</h4>
          <ol className="mt-4 space-y-4">
            {details.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <h4 className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {details.principlesTitle}
          </h4>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {details.principles.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-emerald-600">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-2xl border border-slate-200 bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-900">Built for: </span>
            {details.audience}
          </p>
        </div>

        <div className="min-w-0">
          <Visual visual={details.visual} />
        </div>
      </div>

      <div className="relative mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-slate-200 pt-6">
        <SmartLink
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary"
          href={product.href}
        >
          {product.hrefLabel} {product.external ? "↗" : "→"}
        </SmartLink>
        {details.links.map((link) => (
          <SmartLink key={link.href} className="text-sm font-medium text-slate-700 hover:text-primary" href={link.href}>
            {link.label}
            {isExternal(link.href) || link.href.endsWith(".pdf") ? " ↗" : ""}
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

export function ProductShowcase() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollRef = useRef(false);

  const open = useCallback((slug: string | null, scroll: boolean) => {
    shouldScrollRef.current = scroll && slug !== null;
    setOpenSlug(slug);
    // Keep the URL shareable (#trading-agent) without adding history entries.
    const nextUrl = slug ? `#${slug}` : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  // Open the product named in the URL hash, on load and on back/forward.
  useEffect(() => {
    const syncFromHash = () => {
      const slug = window.location.hash.slice(1);
      if (PRODUCTS.some((product) => product.slug === slug)) {
        shouldScrollRef.current = true;
        setOpenSlug(slug);
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (openSlug && shouldScrollRef.current) {
      shouldScrollRef.current = false;
      const target = detailsRef.current;
      if (!target) {
        return;
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      // Smooth scrolling is skipped in some contexts (e.g. throttled tabs);
      // if we haven't moved toward the panel, jump there directly.
      const startY = window.scrollY;
      // Not cleared on cleanup: Strict Mode re-runs this effect after the
      // scroll flag is consumed, and a stray check is harmless.
      window.setTimeout(() => {
        const offTarget = Math.abs(target.getBoundingClientRect().top) > window.innerHeight / 2;
        if (window.scrollY === startY && offTarget) {
          target.scrollIntoView({ block: "start" });
        }
      }, 700);
    }
  }, [openSlug]);

  useEffect(() => {
    if (!openSlug) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        open(null, false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSlug, open]);

  const openIndex = PRODUCTS.findIndex((product) => product.slug === openSlug);
  const openProduct = openIndex >= 0 ? PRODUCTS[openIndex] : null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((product, index) => (
        <ProductCard
          key={product.slug}
          index={index}
          isOpen={product.slug === openSlug}
          onToggle={() => open(product.slug === openSlug ? null : product.slug, product.slug !== openSlug)}
          product={product}
        />
      ))}
      {openProduct && (
        <div
          // Mobile: right after the clicked card. md+: a full-width row below all cards.
          className="col-span-full scroll-mt-6 max-md:[order:var(--details-order)] md:order-last sm:scroll-mt-28"
          ref={detailsRef}
          style={{ "--details-order": openIndex * 2 + 1 } as React.CSSProperties}
        >
          <ProductDetails onClose={() => open(null, false)} product={openProduct} />
        </div>
      )}
    </div>
  );
}
