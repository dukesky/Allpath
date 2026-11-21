import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTradingBlogPost, signedPct, totalChangePct } from "@/lib/tradingBlog";
import { A, BlogPostShell, Figure, H2, P, Terminal } from "../BlogChrome";
import IndexedChart from "../IndexedChart";
import {
  ACCOUNT,
  DATES,
  EXITS,
  NVDA,
  NVDA_SEQUENCE,
  NVDA_STOP,
  RULES_BEFORE,
  RULES_SINCE,
  SOX,
  SP500
} from "./data";

const post = getTradingBlogPost("semis-slide-what-the-stops-did")!;
const GITHUB = "https://github.com/dukesky/allpath-trading-agent";
const DEMO_GUIDE = `${GITHUB}#try-it-in-one-minute-no-keys`;

const DEMO_COMMANDS = `git clone https://github.com/dukesky/allpath-trading-agent
cd allpath-trading-agent
uv run allpath-trade demo`;

export const metadata: Metadata = {
  title: `${post.title} | AllPath Trading Agent`,
  description: post.summary,
  alternates: { canonical: `https://trading.all-path.com/blog/${post.slug}` },
  openGraph: { title: post.title, description: post.summary, type: "article", publishedTime: post.date }
};

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const FLOW = [
  { step: "Rule triggered", detail: "A condition in the strategy file is met." },
  { step: "Agent review", detail: "The agent reads the chart and the thesis." },
  { step: "Owner confirmation", detail: "The owner confirms on the order card." },
  { step: "Fill recorded", detail: "The order fills and lands in the journal." }
] as const;

const STRIP = [
  { label: "Account", values: ACCOUNT },
  { label: "S&P 500", values: SP500 },
  { label: "SOX", values: SOX }
] as const;

export default function Post() {
  return (
    <BlogPostShell post={post}>
      <P>
        A stop looks reassuring in a strategy file. A falling market is where you find out what it actually
        does.
      </P>
      <P>
        On October 28, our public paper account held $100,653, with just $960 in cash. Roughly half the
        portfolio was in four chip stocks: NVDA, TSM, MU, and AMD. The rest was in large-cap tech. We had
        left ourselves very little room for a bad week.
      </P>
      <P>
        The plan for those chip trades was simple: buy dips into a base, trim into strength, and get out if
        the base broke.
      </P>
      <P>Then the bases broke.</P>
      <P>
        By November 20, 17 trading days later, the Philadelphia Semiconductor Index was down 28.0% from the
        October 28 close. NVDA had fallen 41.7%. Our paper account was down 11.2%, to $89,389. The S&amp;P
        500 fell 10.8% over the same stretch, so the account finished slightly behind that benchmark.
      </P>
      <P>
        For a portfolio that started almost fully invested and half in chips, the exits mattered. So did
        the mistakes. Both belong in the story.
      </P>

      <Figure
        caption={
          <>
            The account started nearly fully invested. As positions exited, its exposure changed. All
            series are indexed to 100 at the October 28 close and run through the November 20, 2026 close.
            This is a paper account; its values are the after-close broker snapshots published to the{" "}
            <A href="/trading/journal">live journal</A>, not an audited NAV.
          </>
        }
      >
        <IndexedChart
          dates={DATES}
          series={[
            { label: "Account", values: ACCOUNT, color: "#0958d9", emphasis: true },
            { label: "S&P 500", values: SP500, color: "#64748b" },
            { label: "SOX", values: SOX, color: "#101727", dash: "7 4" },
            { label: "NVDA", values: NVDA, color: "#c2410c", dash: "2 4" }
          ]}
          title="Line chart: the paper account, the S&P 500, the Philadelphia Semiconductor Index (SOX) and NVDA, each indexed to 100 at the October 28, 2026 close, through the November 20, 2026 close. The account ends down 11.2%, the S&P 500 down 10.8%, SOX down 28.0% and NVDA down 41.7%."
        />
        <dl className="mt-4 grid grid-cols-3 divide-x divide-[#eadfcf] rounded-xl border border-[#eadfcf] bg-white text-center">
          {STRIP.map((s) => (
            <div key={s.label} className="px-2 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{s.label}</dt>
              <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 sm:text-lg">
                {signedPct(totalChangePct(s.values))}
              </dd>
            </div>
          ))}
        </dl>
      </Figure>

      <H2>What happens when a rule fires</H2>
      <P>
        In AllPath, the owner writes a strategy in a YAML file: the trade idea, the target position size,
        and the conditions for buying or selling. One exit rule might say: if the price falls below $205,
        sell the whole position.
      </P>
      <P>
        A rule checker, which we call the sentinel, watches those conditions during market hours. When a
        condition is met, the agent reviews the chart and the trade thesis, then presents an order card
        with its recommendation. The owner confirms the order on the web or in Telegram.
      </P>
      <P>
        The sequence matters: a rule triggers, the agent explains, and the owner confirms. The trigger
        itself is not a completed sale, and the stop level is not a guaranteed fill price.
      </P>

      <Figure
        caption={
          <>
            A triggered rule produces a recommendation for the owner to confirm. It is not a fill. The card
            shown is from the keyless demo: sample data, not an order from the account in this post.
          </>
        }
      >
        <ol aria-label="Flow diagram: from a triggered rule to a recorded fill" className="grid gap-3 sm:grid-cols-4">
          {FLOW.map((f, i) => (
            <li key={f.step} className="relative rounded-xl border border-[#eadfcf] bg-white px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Step {i + 1}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{f.step}</p>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">{f.detail}</p>
              {i < FLOW.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -bottom-[18px] left-1/2 z-10 -translate-x-1/2 text-sm text-slate-400 sm:-right-[13px] sm:bottom-auto sm:left-auto sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0"
                >
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 overflow-hidden rounded-xl border border-[#eadfcf] bg-[#f6f3ec]">
          <p className="border-b border-[#eadfcf] bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-600">
            Demo, sample data
          </p>
          {/* On phones the card keeps a readable width and scrolls sideways. */}
          <div className="overflow-x-auto">
            <Image
              alt="An order card from the keyless demo, built on sample data. It shows a buy rule that triggered for NVDA, the trigger condition and price, the agent's recommendation with a short analysis, and Approve and Reject buttons."
              className="h-auto w-full min-w-[560px]"
              height={748}
              sizes="(min-width: 640px) 664px, 560px"
              src="/trading/blog/demo-order-card.png"
              width={1504}
            />
          </div>
        </div>
      </Figure>

      <H2>The exits bought us breathing room</H2>
      <P>
        NVDA first exited on October 30 at $204.65, close to its $205 stop. By November 20, it closed at
        $125.53. TSM and MU sold on November 10. META and GOOGL had also exited; AMD followed on November
        20.
      </P>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#eadfcf] bg-white/80 px-3 py-2 sm:px-5">
        <table className="w-full border-collapse text-[13px] sm:text-sm">
          <caption className="sr-only">
            What actually filled: seven sales in the paper account, with each strategy&apos;s stop level, the
            fill price and the stock&apos;s November 20 close.
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-left font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3" scope="col">Sold</th>
              <th className="py-2 pr-3" scope="col">Ticker</th>
              <th className="py-2 pr-3 text-right" scope="col">Stop</th>
              <th className="py-2 pr-3 text-right" scope="col">Fill</th>
              <th className="py-2 text-right" scope="col">Nov 20 close</th>
            </tr>
          </thead>
          <tbody>
            {EXITS.map((e) => (
              <tr key={`${e.date}-${e.ticker}`} className="border-b border-slate-100 font-mono tabular-nums last:border-0">
                <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{e.date}</td>
                <th className="py-2 pr-3 text-left font-semibold" scope="row">{e.ticker}</th>
                <td className="py-2 pr-3 text-right">${e.stop}</td>
                <td className="py-2 pr-3 text-right">{usd(e.soldAt)}</td>
                <td className="py-2 text-right">{usd(e.lastClose)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Stop = the strategy&apos;s stated threshold. Fill = the paper execution price. The second NVDA row
        closes the re-entry described below; it is not evidence that an active $205 stop protected those
        new shares.
      </p>

      <P>
        GOOGL is a useful reminder of the gap between a line on a chart and a trade. It opened below its
        stop after earnings, and the sale filled well below $308.
      </P>
      <P>
        By the November 12 close, every chip position except AMD was gone, and the account was about 68%
        cash. Over the next six sessions, the chip index fell another 20.0% and NVDA another 24.5%. The
        account fell 4.0%.
      </P>
      <P>
        On November 20 alone, the chip index lost 10.7% and NVDA lost 14.0%. The account lost 1.6%, and
        AMD, its last chip holding, was sold a few minutes after the open. Holding less of what was falling
        made a difference. It did not make the account immune.
      </P>

      <H2>We sold NVDA. Then we bought it back. Seven times.</H2>
      <P>
        The October 30 exit was followed by a much less tidy chapter. The dip-buy rules in the same
        strategy were still active. Between November 2 and November 10, the account bought NVDA seven more
        times, putting in $3,000 each time.
      </P>
      <P>
        The first four fills came between $205.39 and $208.34, just above the $205 stop line. The last
        three came at $191.57, $194.10, and $171.67, already below it.
      </P>
      <P>
        The exit rule was configured to fire once. It had done that on October 30. It did not re-arm to
        cover the new shares. The buy rules, meanwhile, were still happy to find another dip.
      </P>
      <P>
        The rebuilt position finally sold on November 12 at $156.40. About $21,000 went in; about $16,640
        came out. That round trip cost roughly $4,360.
      </P>

      <Figure
        caption={
          <>
            After the first exit, seven dip-buy fills rebuilt the position while the one-shot stop remained
            spent. Fills from the paper account&apos;s trade log, October 30 to November 12, 2026.
          </>
        }
      >
        <table className="w-full border-collapse text-[13px] sm:text-sm">
          <caption className="sr-only">
            NVDA fills in order: the first exit on October 30, seven purchases from November 2 to November
            10, and the final exit on November 12, each with its price and whether it was above or below
            the $205 stop line.
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-left font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pl-2 pr-3" scope="col">Date</th>
              <th className="py-2 pr-3" scope="col">Fill</th>
              <th className="py-2 pr-3 text-right" scope="col">Price</th>
              <th className="py-2 pr-2 text-right" scope="col">vs $205</th>
            </tr>
          </thead>
          <tbody>
            {NVDA_SEQUENCE.map((f, i) => (
              <tr
                key={i}
                className={`border-b border-slate-100 font-mono tabular-nums last:border-0 ${f.side === "sell" ? "bg-slate-100/70 font-semibold" : ""}`}
              >
                <td className="whitespace-nowrap py-2 pl-2 pr-3 text-slate-600">{f.date}</td>
                <td className="py-2 pr-3">{f.what}</td>
                <td className="py-2 pr-3 text-right">{usd(f.price)}</td>
                <td className="whitespace-nowrap py-2 pr-2 text-right text-slate-600">
                  {f.price >= NVDA_STOP ? "above" : "below"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Figure>

      <P>We had written a rule for leaving the trade, but left the door open for coming straight back in.</P>

      <H2>A fired rule is not a finished exit</H2>
      <P>
        MU and TSM exposed the other problem. Their stops first fired on October 15, but no sale followed.
        Because those rules were one-shot, they stayed silent after that. Both positions entered November 5
        without a working exit rule.
      </P>
      <P>
        That day, the semiconductor index fell 12.2%, and the account hit its low for the period: $87,503,
        down 13.1% from October 28. MU eventually sold on November 10 at $738.83, about 18% below its $905
        stop line.
      </P>
      <P>A rule had triggered. The positions were still there. That distinction turned out to be expensive.</P>

      <H2>What we changed</H2>
      <P>
        Since November 10, the strategy files have used stops that re-arm: if a stop fires without a sale,
        it can fire again. We also switched off the buy rules on every failed chip trade.
      </P>

      <Figure
        caption={
          <>
            Two rules from the NVDA strategy file, before and since November 10, 2026, abridged to the
            fields that matter here. The stop gained <code className="font-mono text-[0.9em]">rearm</code>{" "}
            and now applies only while shares are held; the buy rule is{" "}
            <code className="font-mono text-[0.9em]">disabled</code>.
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Before November 10", body: RULES_BEFORE },
            { title: "Since November 10", body: RULES_SINCE }
          ].map((v) => (
            <div key={v.title} className="overflow-hidden rounded-xl bg-[#101727]">
              <p className="border-b border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {v.title} · YAML
              </p>
              <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-[1.55] text-slate-100">{v.body}</pre>
            </div>
          ))}
        </div>
      </Figure>

      <P>
        Those changes address the two failures in this account: an exit signal that could be used up
        without an exit, and buy rules that kept rebuilding a broken trade.
      </P>
      <P>
        They do not guarantee a fill at the stop price. They also do not remove the owner&apos;s
        confirmation step. They make the intended behavior clearer and give an uncompleted exit another
        chance to surface.
      </P>

      <H2>Where the account stands</H2>
      <P>
        The journal entry for November 20, the figure behind the 11.2%, shows $89,389. A separate
        after-close broker snapshot that day showed $89,466, with about $57,500 of it in cash, roughly 64%
        of the portfolio. The remaining holdings were AAPL, MSFT, and TSLA.
      </P>
      <P>
        The chip strategies are still on file, but their buy rules are disabled. Re-entry requires a fresh,
        reviewed thesis. A lower price, on its own, is not one.
      </P>
      <P>
        This stretch left us with a smaller account and a more precise understanding of our own rules. The
        public journal lets readers inspect the fills, including the ones we would have preferred to get
        right the first time.
      </P>

      <H2>Try the workflow yourself</H2>
      <P>
        AllPath Trading Agent is open source and self-hosted. The demo uses sample data and simulated
        fills. You do not need a broker account or an LLM key.
      </P>
      <Terminal copy={DEMO_COMMANDS}>{DEMO_COMMANDS}</Terminal>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Then open http://localhost:8790 and sign in with <code className="font-mono">demo</code>.
      </p>
      <P>
        Start with a strategy, follow a rule into an order card, and see where your confirmation fits. The
        code is here: <A href={GITHUB}>github.com/dukesky/allpath-trading-agent</A>.
      </P>

      <div className="mt-8 rounded-2xl border border-[#eadfcf] bg-white/80 p-5 sm:p-6">
        <p className="text-base font-medium leading-7 text-slate-900 sm:text-lg">
          See how a strategy becomes a recommendation, and where you stay in control.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary"
            href={DEMO_GUIDE}
          >
            Run the demo
          </a>
          <Link
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-primary hover:text-primary"
            href="/trading/journal"
          >
            Read the live journal
          </Link>
        </div>
      </div>

      <p className="mt-8 text-sm leading-6 text-slate-600">
        This is a paper account, with simulated execution and after-close broker snapshots rather than an
        audited NAV. A few weeks of results do not establish how the system will perform in future markets.
        This post is not financial advice.
      </p>
    </BlogPostShell>
  );
}
