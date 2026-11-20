import Link from "next/link";
import type { Metadata } from "next";
import { formatPostDate, listTradingBlogPosts } from "@/lib/tradingBlog";
import { BlogFrame } from "./BlogChrome";

export const metadata: Metadata = {
  title: "Blog — AllPath Trading Agent",
  description:
    "Notes from building and running an open-source, self-hosted trading agent: what the paper account did, what broke, and what we changed.",
  alternates: { canonical: "https://trading.all-path.com/blog" }
};

export default function TradingBlogIndex() {
  const posts = listTradingBlogPosts();
  return (
    <BlogFrame heading="Blog">
      <section className="rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-8 backdrop-blur lg:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Trading Agent · blog</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">What the account did, and what we learned.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          Write-ups from running the agent on its public paper account. The numbers come from the same
          fills that appear in the{" "}
          <Link className="font-medium text-primary hover:underline" href="/trading/journal">
            live journal
          </Link>
          , including the trades that did not work.
        </p>
      </section>

      <section className="mt-6 space-y-6">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="rounded-[2rem] border border-[#eadfcf] bg-white/70 p-6 backdrop-blur transition hover:border-primary/40 lg:p-8"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
              <Link className="transition hover:text-primary" href={`/trading/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{post.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary"
                href={`/trading/blog/${post.slug}`}
              >
                Read the post
              </Link>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </BlogFrame>
  );
}
