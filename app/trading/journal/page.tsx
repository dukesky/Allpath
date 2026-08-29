import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getFirestoreDb } from "@/lib/firestore";

export const metadata: Metadata = {
  title: "Live journal — AllPath Trading Agent",
  description:
    "The daily journal of our hackathon project's live paper-trading account: every fill, the equity curve, and the agent's own end-of-day reflection. Updated after each US market close.",
  alternates: { canonical: "https://trading.all-path.com/journal" }
};

// Re-render at most hourly; the data only changes once per trading day.
export const revalidate = 3600;

type Trade = {
  ticker?: string;
  side?: string;
  qty?: string | null;
  notional?: string | null;
  status?: string;
  filled_at?: string | null;
  filled_avg_price?: string | null;
  filled_qty?: string | null;
  reason?: string;
};

type Entry = {
  date: string;
  equity?: string;
  day_change?: string | null;
  day_change_pct?: number | null;
  trades?: Trade[];
  reflection_summary?: string;
  reflection_body?: string;
  pending_proposals?: number;
};

async function loadEntries(): Promise<Entry[]> {
  try {
    const snapshot = await getFirestoreDb()
      .collection("tradingJournal")
      .orderBy("date", "desc")
      .limit(30)
      .get();
    return snapshot.docs.map((d) => d.data() as Entry);
  } catch {
    return []; // Firestore hiccup → empty state, never a 500 on a public page.
  }
}

function money(v: string | null | undefined): string {
  if (!v) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fillTime(iso: string | null | undefined): string {
  if (!iso) return "fill pending";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "fill pending";
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }) + " ET";
}

export default async function JournalPage() {
  const entries = await loadEntries();
  return (
    <main
      className="min-h-screen bg-[#f8f1e4] bg-cover bg-fixed bg-top text-slate-950"
      style={{ backgroundImage: "url('/home-cream-bg.svg')" }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 mb-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Link className="relative h-11 w-11 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" href="/trading">
              <Image alt="AllPath logo" className="object-contain" fill sizes="44px" src="/allpath-logo-mark.png" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Live journal</h1>
              <p className="text-sm text-slate-600">
                <Link className="hover:text-primary" href="/trading">Trading Agent</Link> · paper account
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="transition hover:text-primary" href="/trading">
              About the agent
            </Link>
            <a
              className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-primary"
              href="https://github.com/dukesky/allpath-trading-agent"
            >
              GitHub
            </a>
          </nav>
        </header>

        <section className="rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-8 backdrop-blur lg:px-10">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Hackathon project · live demo</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            The agent&apos;s own account, one day at a time.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            This is the real day-by-day record of the paper-trading account our agent runs on: every
            fill at its actual price, the equity as it moves, and the agent&apos;s own end-of-day
            reflection — unedited. It publishes itself after each US market close.
          </p>
          <p className="mt-4 inline-block rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Paper trading, not real money. Nothing here is investment advice — it&apos;s a live demo of
            the software.
          </p>
        </section>

        {entries.length === 0 && (
          <section className="mt-6 rounded-[2rem] border border-[#eadfcf] bg-white/70 px-6 py-10 text-center backdrop-blur">
            <p className="text-slate-600">
              No entries yet — the first journal entry lands after the next US market close.
            </p>
          </section>
        )}

        <section className="mt-6 space-y-6">
          {entries.map((e) => (
            <article key={e.date} className="rounded-[2rem] border border-[#eadfcf] bg-white/70 p-6 backdrop-blur lg:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-mono text-lg font-semibold tracking-tight">{e.date}</h3>
                <p className="font-mono text-sm text-slate-700">
                  equity {money(e.equity)}{" "}
                  {typeof e.day_change_pct === "number" && (
                    <span className={e.day_change_pct >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {e.day_change_pct >= 0 ? "+" : ""}
                      {e.day_change_pct.toFixed(2)}%
                    </span>
                  )}
                </p>
              </div>

              {(e.trades?.length ?? 0) > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left font-mono text-xs uppercase tracking-wider text-slate-500">
                        <th className="py-2 pr-4">Side</th>
                        <th className="py-2 pr-4">Ticker</th>
                        <th className="py-2 pr-4">Size</th>
                        <th className="py-2 pr-4">Filled at</th>
                        <th className="py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.trades!.map((t, i) => (
                        <tr key={i} className="border-b border-slate-100 font-mono">
                          <td className={`py-2 pr-4 font-semibold ${t.side === "buy" ? "text-emerald-700" : "text-red-700"}`}>
                            {t.side ?? "—"}
                          </td>
                          <td className="py-2 pr-4">{t.ticker ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {t.filled_qty && Number(t.filled_qty) > 0
                              ? `${Number(t.filled_qty).toFixed(4).replace(/\.?0+$/, "")} sh`
                              : t.notional
                                ? money(t.notional)
                                : t.qty
                                  ? `${t.qty} sh`
                                  : "—"}
                          </td>
                          <td className="py-2 pr-4">{money(t.filled_avg_price)}</td>
                          <td className="py-2 text-slate-600">{fillTime(t.filled_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No trades this day — the sentinel watched, nothing triggered.</p>
              )}

              {e.reflection_summary && (
                <div className="mt-5 rounded-2xl bg-[#101727] p-5 text-slate-100">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                    The agent&apos;s end-of-day reflection
                  </p>
                  <p className="mt-2 text-sm leading-7">{e.reflection_summary}</p>
                  {e.reflection_body && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-mono text-xs text-slate-400 hover:text-slate-200">
                        Read the full report
                      </summary>
                      <pre className="mt-3 max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-6 text-slate-300">
                        {e.reflection_body}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {(e.pending_proposals ?? 0) > 0 && (
                <p className="mt-4 font-mono text-xs text-slate-500">
                  {e.pending_proposals} strategy revision{e.pending_proposals === 1 ? "" : "s"} proposed by the
                  agent, awaiting human approval.
                </p>
              )}
            </article>
          ))}
        </section>

        <footer className="mt-10 rounded-2xl border border-slate-200 bg-white/88 px-5 py-4 text-sm text-slate-600 backdrop-blur">
          Built in the open —{" "}
          <a className="font-medium text-primary hover:underline" href="https://github.com/dukesky/allpath-trading-agent">
            source on GitHub
          </a>
          . Paper account; past demo performance means nothing. Not investment advice.
        </footer>
      </div>
    </main>
  );
}
