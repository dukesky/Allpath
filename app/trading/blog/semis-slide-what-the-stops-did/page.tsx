import type { Metadata } from "next";
import { getTradingBlogPost, signedPct } from "@/lib/tradingBlog";
import { A, BlogPostShell, Code, H2, P, Terminal } from "../BlogChrome";
import IndexedChart from "../IndexedChart";
import { ACCOUNT, DATES, EXITS, NVDA, SOX, SP500 } from "./data";

const post = getTradingBlogPost("semis-slide-what-the-stops-did")!;
const GITHUB = "https://github.com/dukesky/allpath-trading-agent";

export const metadata: Metadata = {
  title: `${post.title} — AllPath Trading Agent`,
  description: post.summary,
  alternates: { canonical: `https://trading.all-path.com/blog/${post.slug}` },
  openGraph: { title: post.title, description: post.summary, type: "article", publishedTime: post.date }
};

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function Post() {
  return (
    <BlogPostShell post={post}>
      <P>
        AllPath Trading Agent runs a paper account in public. Every fill lands in the{" "}
        <A href="/trading/journal">live journal</A> after the close. On October 28 that account closed at
        $100,653 with $960 in cash. About half of it sat in four semiconductor swing trades (NVDA, TSM, MU,
        AMD) and the rest in large-cap tech. Each trade had the same plan: buy dips into a base, trim into
        strength, sell everything if the base fails.
      </P>
      <P>
        Then the bases failed. From the October 28 close to the November 20 close, the Philadelphia
        Semiconductor index fell 28.0%, NVDA 41.7%, MU 39.5%, the Nasdaq 100 16.0% and the S&amp;P 500
        10.8%. The account fell 11.2%, to $89,389. That is about what the S&amp;P lost, from a portfolio
        that began the stretch fully invested and half in chips.
      </P>

      <figure className="mt-8 rounded-2xl border border-[#eadfcf] bg-white/80 p-4 sm:p-5">
        <IndexedChart
          dates={DATES}
          series={[
            { label: "Account", values: ACCOUNT, color: "#101727", emphasis: true },
            { label: "S&P 500", values: SP500, color: "#64748b", dashed: true },
            { label: "SOX", values: SOX, color: "#0958d9" },
            { label: "NVDA", values: NVDA, color: "#c2410c" }
          ]}
          title="Paper account, S&P 500, Philadelphia Semiconductor index and NVDA, each indexed to 100 at the October 28, 2026 close, through November 20, 2026."
        />
        <figcaption className="mt-3 text-sm leading-6 text-slate-600">
          Indexed to 100 at the October 28 close. All figures in this post are as of the November 20,
          2026 close. Account values are the after-close broker snapshots published to the journal, not
          an audited NAV.
        </figcaption>
      </figure>

      <H2>How a stop works here</H2>
      <P>
        A strategy is a YAML file the owner writes: a thesis, a target weight, and rules such
        as <Code>price &lt; 205 → sell all</Code>. A sentinel checks the rules during market hours. When
        one fires, the agent looks at the chart and the thesis and puts an order card in front of the
        owner with its view. The owner confirms the order on that card, on the web or in Telegram. The
        owner sets the levels, the rules fire, the agent explains, the owner confirms.
      </P>

      <H2>What fired</H2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left font-mono text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4">Sold</th>
              <th className="py-2 pr-4">Ticker</th>
              <th className="py-2 pr-4 text-right">Stop</th>
              <th className="py-2 pr-4 text-right">Fill</th>
              <th className="py-2 pr-4 text-right">Nov 20 close</th>
              <th className="py-2 text-right">Since the sale</th>
            </tr>
          </thead>
          <tbody>
            {EXITS.map((e) => (
              <tr key={`${e.date}-${e.ticker}`} className="border-b border-slate-100 font-mono tabular-nums">
                <td className="py-2 pr-4 text-slate-600">{e.date}</td>
                <td className="py-2 pr-4 font-semibold">{e.ticker}</td>
                <td className="py-2 pr-4 text-right">${e.stop}</td>
                <td className="py-2 pr-4 text-right">{usd(e.soldAt)}</td>
                <td className="py-2 pr-4 text-right">{usd(e.lastClose)}</td>
                <td className="py-2 text-right text-red-700">{signedPct((e.lastClose / e.soldAt - 1) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        GOOGL opened below its stop after earnings, so that sale filled well under the line. By the
        November 12 close the chip positions except AMD were gone and the account was about 68% cash. Over
        the next six sessions the semiconductor index fell another 20.0% and NVDA 24.5%. The account fell
        4.0%. On November 20 alone the index lost 10.7% and NVDA 14.0%; the account lost 1.6%, and its last
        chip position, AMD, was sold at the open by its own stop.
      </P>

      <H2>What went wrong</H2>
      <P>
        The table hides two mistakes. The first is NVDA. The stop sold the whole position at $204.65 on
        October 30, which was the right exit. But the dip-buy rules in the same strategy were still armed,
        so between November 2 and November 10 the account bought NVDA again, $3,000 at a time, seven times.
        The first four fills were a few dollars above the $205 line. The last three were far below it, at
        $191.57, $194.10 and $171.67. The stop was a one-shot rule and had already been used, so it did
        not cover the new shares. The position was sold on November 12 at $156.40. That round trip put
        $21,000 in and took about $16,640 out, a loss of about $4,360.
      </P>
      <P>
        The second is MU and TSM. Their stops first fired on October 15 and no sale followed. A one-shot
        stop that has fired does not fire again, so both positions carried no working exit into
        November 5, when the semiconductor index fell 12.2% in one session. MU finally
        sold at $738.83, 18% under its $905 line. The account&apos;s low point was that day: $87,503, down
        13.1% from October 28.
      </P>
      <P>
        The strategy files have been different since November 10. The stops now re-arm, so one that
        fires without a sale fires again. The buy rules on every failed chip trade are switched off.
      </P>

      <H2>Where it stands</H2>
      <P>
        At the November 20 snapshot the account held $57,500 in cash out of $89,466, about 64%. What is
        left is AAPL, MSFT and TSLA. The chip strategies are still on file with their buy rules disabled,
        and each says the same thing: no re-entry without a fresh, reviewed thesis. Nothing will be bought
        back because a price looks low.
      </P>

      <H2>Try it</H2>
      <P>
        The agent is open source and self-hosted: <A href={GITHUB}>github.com/dukesky/allpath-trading-agent</A>.
        The demo needs no broker account and no LLM key. It runs on sample data with simulated fills.
      </P>
      <Terminal>{`git clone https://github.com/dukesky/allpath-trading-agent
cd allpath-trading-agent
uv run allpath-trade demo
# open http://localhost:8790 and sign in with: demo`}</Terminal>
      <P>
        This post describes a paper account. It is not financial advice, and a few weeks of results say
        nothing about the next few.
      </P>
    </BlogPostShell>
  );
}
