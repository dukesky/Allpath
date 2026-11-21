import { indexTo100, signedPct, totalChangePct } from "@/lib/tradingBlog";

/**
 * Line chart of several series rebased to 100 on the first date.
 *
 * Server-rendered inline SVG, no chart library and no client JS, like the
 * journal's equity chart. It is rendered twice at different aspect ratios
 * (one per breakpoint): a single wide viewBox scaled down to a phone shrinks
 * its own text to about 6px, and CSS cannot reach inside a viewBox.
 *
 * Every line is labelled at its right end with its name and total change, so
 * no series is identified by colour alone.
 */

export type ChartSeries = {
  label: string;
  values: readonly number[];
  color: string;
  /** The series the post is about: drawn heavier. */
  emphasis?: boolean;
  /** SVG dash pattern, e.g. "6 4". Solid when omitted. */
  dash?: string;
};

type Props = {
  dates: readonly string[];
  series: readonly ChartSeries[];
  title: string;
};

const GRID = "#eadfcf";
const AXIS_TEXT = "#64748b";

function mmdd(date: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m, d] = date.split("-").map(Number);
  return m && d ? `${months[m - 1]} ${d}` : date;
}

function Plot({ dates, series, title, width, height, compact }: Props & { width: number; height: number; compact: boolean }) {
  const pad = { top: 16, right: compact ? 112 : 132, bottom: 30, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const indexed = series.map((s) => ({ ...s, idx: indexTo100(s.values), change: totalChangePct(s.values) }));
  const all = indexed.flatMap((s) => s.idx);
  const min = Math.floor(Math.min(...all) / 10) * 10;
  const max = 100 + 5;
  const x = (i: number) => pad.left + (i / (dates.length - 1)) * innerW;
  const y = (v: number) => pad.top + ((max - v) / (max - min)) * innerH;
  const gridValues: number[] = [];
  for (let v = min; v <= 100; v += compact ? 20 : 10) gridValues.push(v);
  if (!gridValues.includes(100)) gridValues.push(100);

  // End labels: start at each line's last point, then push apart so they
  // never overlap (lowest line keeps its place, the rest move up).
  const gap = compact ? 13 : 15;
  const labels = indexed
    .map((s) => ({ s, ly: y(s.idx[s.idx.length - 1]) }))
    .sort((a, b) => b.ly - a.ly);
  for (let i = 1; i < labels.length; i += 1) {
    if (labels[i - 1].ly - labels[i].ly < gap) labels[i].ly = labels[i - 1].ly - gap;
  }

  const tickEvery = compact ? 6 : 3;
  const fontSize = compact ? 11.5 : 12;

  return (
    <svg
      aria-label={title}
      className="h-auto w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {gridValues.map((v) => (
        <g key={v}>
          <line
            stroke={v === 100 ? "#94a3b8" : GRID}
            strokeDasharray={v === 100 ? "4 4" : undefined}
            x1={pad.left}
            x2={pad.left + innerW}
            y1={y(v)}
            y2={y(v)}
          />
          <text fill={AXIS_TEXT} fontFamily="ui-monospace, monospace" fontSize={fontSize} textAnchor="end" x={pad.left - 6} y={y(v) + 4}>
            {v}
          </text>
        </g>
      ))}
      {dates.map((d, i) =>
        (i % tickEvery === 0 && dates.length - 1 - i >= tickEvery) || i === dates.length - 1 ? (
          <text
            key={d}
            fill={AXIS_TEXT}
            fontFamily="ui-monospace, monospace"
            fontSize={fontSize}
            textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}
            x={x(i)}
            y={height - 8}
          >
            {mmdd(d)}
          </text>
        ) : null
      )}
      {indexed.map((s) => (
        <polyline
          key={s.label}
          fill="none"
          points={s.idx.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          stroke={s.color}
          strokeDasharray={s.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={s.emphasis ? 3 : 1.75}
        >
          <title>{`${s.label}: ${signedPct(s.change)}`}</title>
        </polyline>
      ))}
      {indexed.map((s) => (
        <circle key={s.label} cx={x(dates.length - 1)} cy={y(s.idx[s.idx.length - 1])} fill={s.color} r={s.emphasis ? 4 : 3} />
      ))}
      {labels.map(({ s, ly }) => (
        <text
          key={s.label}
          fill={s.color}
          fontFamily="ui-monospace, monospace"
          fontSize={fontSize}
          fontWeight={s.emphasis ? 700 : 500}
          x={pad.left + innerW + 9}
          y={ly + 4}
        >
          {s.label} {signedPct(s.change)}
        </text>
      ))}
    </svg>
  );
}

export default function IndexedChart(props: Props) {
  return (
    <>
      <div className="sm:hidden">
        <Plot {...props} compact height={300} width={360} />
      </div>
      <div className="hidden sm:block">
        <Plot {...props} compact={false} height={360} width={704} />
      </div>
    </>
  );
}
