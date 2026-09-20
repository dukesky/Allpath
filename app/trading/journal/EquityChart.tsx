/**
 * Equity trend for the public trading journal — one point per published
 * trading day, colored by that day's direction.
 *
 * Server-rendered inline SVG on purpose: this page is `force-dynamic` and
 * carries no client JS today, and a single line chart does not justify
 * shipping a charting library to every visitor. Hover comes from native
 * `<title>` elements, which work without JS and are read by screen readers.
 *
 * The plot is rendered twice at different aspect ratios (one shown per
 * breakpoint via Tailwind). A single wide viewBox scaled down to a phone
 * shrinks its own axis text to roughly 5px — unreadable — and CSS cannot
 * reach inside a viewBox to fix that.
 */

type Point = {
  date: string;
  equity: number;
  dayChangePct: number | null;
};

type Props = {
  entries: { date: string; equity?: string; day_change_pct?: number | null }[];
  /** The account's starting equity, drawn as a reference line. */
  start?: number;
};

// Same up/down tokens the journal entries already use (emerald-700 /
// red-700), validated as a pair for colorblind separation. Identity never
// rests on color alone here: every point carries a `<title>` with its
// signed percentage, the legend counts each kind of day, and the best and
// worst days are labeled directly.
const UP = "#047857";
const DOWN = "#b91c1c";
const FLAT = "#64748b";
const LINE = "#101727";
const GRID = "#eadfcf";
const AXIS_TEXT = "#64748b";

function shortMoney(n: number): string {
  return `$${Math.round(n / 1000)}k`;
}

function fullMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function signedPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function mmdd(date: string): string {
  const [, m, d] = date.split("-");
  return m && d ? `${m}-${d}` : date;
}

/** Evenly spaced tick values spanning [min, max]. */
function ticks(min: number, max: number, count = 4): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

function toneOf(pct: number | null): string {
  // Exactly flat is its own case, not a win: the legend counts up and down
  // days, and a green dot for 0.00% would make those counts disagree with
  // the number of points on the line.
  if (pct === null || pct === 0) return FLAT;
  return pct > 0 ? UP : DOWN;
}

type PlotProps = {
  points: Point[];
  start: number;
  min: number;
  max: number;
  w: number;
  h: number;
  pad: { top: number; right: number; bottom: number; left: number };
  font: number;
  maxXLabels: number;
  className: string;
  ariaLabel: string;
};

function Plot({
  points,
  start,
  min,
  max,
  w,
  h,
  pad,
  font,
  maxXLabels,
  className,
  ariaLabel
}: PlotProps) {
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const x = (i: number) =>
    pad.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const y = (v: number) => pad.top + plotH - ((v - min) / (max - min)) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.equity)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(points.length / maxXLabels));
  const lastIndex = points.length - 1;
  // The final day is always labeled, so a periodic label that lands right
  // next to it would collide with it (at 4 labels on a phone, "09-16" and
  // "09-18" ran together).
  const labelled = new Set<number>([lastIndex]);
  for (let i = 0; i < lastIndex; i += labelEvery) {
    if (lastIndex - i >= labelEvery * 0.6) labelled.add(i);
  }
  const startY = y(start);
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  return (
    <svg
      aria-label={ariaLabel}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      {ticks(min, max).map((t) => (
        <g key={t}>
          <line stroke={GRID} strokeWidth={1} x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} />
          <text
            dominantBaseline="middle"
            fill={AXIS_TEXT}
            fontFamily={mono}
            fontSize={font}
            textAnchor="end"
            x={pad.left - 8}
            y={y(t)}
          >
            {shortMoney(t)}
          </text>
        </g>
      ))}

      {/* Starting equity — the "above or below water" reference. */}
      <line
        stroke="#94a3b8"
        strokeDasharray="4 4"
        strokeWidth={1}
        x1={pad.left}
        x2={w - pad.right}
        y1={startY}
        y2={startY}
      />
      <text
        fill={AXIS_TEXT}
        fontFamily={mono}
        fontSize={font - 1}
        textAnchor="end"
        x={w - pad.right}
        y={startY - 6}
      >
        {fullMoney(start)} start
      </text>

      <path
        d={path}
        fill="none"
        stroke={LINE}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />

      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.equity)}
          fill={toneOf(p.dayChangePct)}
          r={4.5}
          stroke="#ffffff"
          strokeWidth={2}
        >
          <title>{`${p.date} · ${fullMoney(p.equity)} · ${signedPct(p.dayChangePct)}`}</title>
        </circle>
      ))}

      {points.map((p, i) =>
        labelled.has(i) ? (
          <text
            key={`label-${p.date}`}
            fill={AXIS_TEXT}
            fontFamily={mono}
            fontSize={font}
            // The last label sits on the right edge of the plot, so a
            // centered anchor would run past the viewBox and be clipped.
            textAnchor={i === lastIndex ? "end" : "middle"}
            x={i === lastIndex ? w - pad.right : x(i)}
            y={h - font}
          >
            {mmdd(p.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

export default function EquityChart({ entries, start = 100000 }: Props) {
  const points: Point[] = entries
    .map((e) => ({
      date: e.date,
      equity: Number(e.equity),
      dayChangePct:
        typeof e.day_change_pct === "number" && Number.isFinite(e.day_change_pct)
          ? e.day_change_pct
          : null
    }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.equity))
    .sort((a, b) => a.date.localeCompare(b.date));

  // One point cannot show a trend, and zero points means the journal has
  // not published yet — the page's own empty state covers that.
  if (points.length < 2) return null;

  const equities = points.map((p) => p.equity);
  // The start line is part of the story ("are we above water?"), so it
  // belongs inside the domain even when equity never revisits it.
  const rawMin = Math.min(...equities, start);
  const rawMax = Math.max(...equities, start);
  const headroom = (rawMax - rawMin) * 0.12 || Math.max(rawMax * 0.01, 1);
  const min = rawMin - headroom;
  const max = rawMax + headroom;

  const last = points[points.length - 1];
  const totalPct = ((last.equity - start) / start) * 100;
  const rated = points.filter((p) => p.dayChangePct !== null);
  const best = rated.reduce<Point | null>(
    (acc, p) => (acc === null || p.dayChangePct! > acc.dayChangePct! ? p : acc),
    null
  );
  const worst = rated.reduce<Point | null>(
    (acc, p) => (acc === null || p.dayChangePct! < acc.dayChangePct! ? p : acc),
    null
  );
  const upDays = rated.filter((p) => p.dayChangePct! > 0).length;
  const downDays = rated.filter((p) => p.dayChangePct! < 0).length;
  const flatDays = rated.length - upDays - downDays;

  const ariaLabel = `Account equity from ${points[0].date} to ${last.date}, ${fullMoney(
    last.equity
  )}, ${signedPct(totalPct)} against a ${fullMoney(start)} start.`;

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Equity trend</h3>
          <p className="mt-1 text-sm text-slate-600">
            One point per published trading day, from {points[0].date} to {last.date}.
          </p>
        </div>
        <p className="font-mono text-sm text-slate-700">
          {fullMoney(last.equity)}{" "}
          <span className={totalPct >= 0 ? "text-emerald-700" : "text-red-700"}>
            {signedPct(totalPct)} since {fullMoney(start)}
          </span>
        </p>
      </figcaption>

      <Plot
        ariaLabel={ariaLabel}
        className="mt-4 hidden h-auto w-full sm:block"
        font={11}
        h={280}
        max={max}
        maxXLabels={7}
        min={min}
        pad={{ top: 18, right: 18, bottom: 34, left: 60 }}
        points={points}
        start={start}
        w={760}
      />
      <Plot
        ariaLabel={ariaLabel}
        className="mt-4 h-auto w-full sm:hidden"
        font={15}
        h={340}
        max={max}
        maxXLabels={4}
        min={min}
        pad={{ top: 26, right: 14, bottom: 44, left: 62 }}
        points={points}
        start={start}
        w={380}
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: UP }} />
          {upDays} up {upDays === 1 ? "day" : "days"}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DOWN }} />
          {downDays} down {downDays === 1 ? "day" : "days"}
        </span>
        {flatDays > 0 && (
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FLAT }} />
            {flatDays} flat
          </span>
        )}
        {best && (
          <span>
            best {mmdd(best.date)} <span className="text-emerald-700">{signedPct(best.dayChangePct)}</span>
          </span>
        )}
        {worst && (
          <span>
            worst {mmdd(worst.date)} <span className="text-red-700">{signedPct(worst.dayChangePct)}</span>
          </span>
        )}
      </div>
    </figure>
  );
}
