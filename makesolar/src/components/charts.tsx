import { useState, type PointerEvent, type ReactNode } from "react";
import { formatHour } from "../solar/sunPosition";
import { MONTH_NAMES } from "../solar/energy";
import { formatCompact, formatNumber, niceTicks } from "../utils/format";

const W = 300;
const H = 150;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

interface FrameProps {
  label: string;
  yTicks: number[];
  yMax: number;
  yFormat: (v: number) => string;
  xTicks: { x: number; label: string }[];
  onMove?: (svgX: number) => void;
  onLeave?: () => void;
  tooltip?: { x: number; y: number; content: ReactNode } | null;
  children: ReactNode;
}

function ChartFrame({ label, yTicks, yMax, yFormat, xTicks, onMove, onLeave, tooltip, children }: FrameProps) {
  function handleMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    onMove?.(((e.clientX - rect.left) / rect.width) * W);
  }

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        onPointerMove={onMove ? handleMove : undefined}
        onPointerLeave={onLeave}
      >
        {yTicks.map((t) => {
          const y = PAD.top + PH - (t / yMax) * PH;
          return (
            <g key={t}>
              <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
              <text className="chart-tick" x={PAD.left - 6} y={y} textAnchor="end" dominantBaseline="middle">
                {yFormat(t)}
              </text>
            </g>
          );
        })}
        {xTicks.map((t) => (
          <text key={t.label + t.x} className="chart-tick" x={t.x} y={H - 6} textAnchor="middle">
            {t.label}
          </text>
        ))}
        {children}
      </svg>
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

const xAt = (frac: number) => PAD.left + frac * PW;
const yAt = (v: number, max: number) => PAD.top + PH - (v / max) * PH;

/* ───────── Потужність протягом дня ───────── */

interface DayChartProps {
  hours: number[];
  powerKw: number[];
  currentHour: number;
}

export function DayChart({ hours, powerKw, currentHour }: DayChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(0, ...powerKw);
  const yTicks = niceTicks(peak || 1, 3);
  const yMax = yTicks[yTicks.length - 1];

  const pts = hours.map((h, i) => [xAt(h / 24), yAt(powerKw[i], yMax)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${xAt(1)},${yAt(0, yMax)}L${xAt(0)},${yAt(0, yMax)}Z`;

  const nearest = (h: number) => {
    let best = 0;
    for (let i = 1; i < hours.length; i++) if (Math.abs(hours[i] - h) < Math.abs(hours[best] - h)) best = i;
    return best;
  };
  const cur = nearest(currentHour);
  const hi = hover ?? cur;

  return (
    <ChartFrame
      label={`Потужність станції протягом ясного дня, пік ${formatNumber(peak, 1)} кВт`}
      yTicks={yTicks}
      yMax={yMax}
      yFormat={(v) => formatNumber(v, yMax < 3 ? 1 : 0)}
      xTicks={[0, 6, 12, 18, 24].map((h) => ({ x: xAt(h / 24), label: `${h}:00` }))}
      onMove={(x) => setHover(nearest(Math.min(24, Math.max(0, ((x - PAD.left) / PW) * 24))))}
      onLeave={() => setHover(null)}
      tooltip={
        hover !== null
          ? {
              x: pts[hover][0],
              y: pts[hover][1],
              content: (
                <>
                  <b>{formatNumber(powerKw[hover], 2)} кВт</b>
                  <span>{formatHour(hours[hover])}</span>
                </>
              ),
            }
          : null
      }
    >
      <path className="chart-area" d={area} />
      <path className="chart-line" d={line} />
      <line className="chart-cursor" x1={pts[hi][0]} x2={pts[hi][0]} y1={PAD.top} y2={yAt(0, yMax)} />
      <circle className="chart-dot" cx={pts[hi][0]} cy={pts[hi][1]} r={4} />
    </ChartFrame>
  );
}

/* ───────── Виробіток по місяцях ───────── */

export function MonthChart({ values }: { values: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const yTicks = niceTicks(Math.max(1, ...values), 3);
  const yMax = yTicks[yTicks.length - 1];
  const slot = PW / 12;
  const bw = Math.min(16, slot - 4);

  return (
    <ChartFrame
      label="Виробіток по місяцях, кВт·год"
      yTicks={yTicks}
      yMax={yMax}
      yFormat={formatCompact}
      xTicks={MONTH_NAMES.map((m, i) => ({ x: PAD.left + slot * (i + 0.5), label: i % 2 === 0 ? m : "" }))}
      onMove={(x) => {
        const i = Math.floor((x - PAD.left) / slot);
        setHover(i >= 0 && i < 12 ? i : null);
      }}
      onLeave={() => setHover(null)}
      tooltip={
        hover !== null
          ? {
              x: PAD.left + slot * (hover + 0.5),
              y: yAt(values[hover], yMax),
              content: (
                <>
                  <b>{formatNumber(values[hover])} кВт·год</b>
                  <span>{MONTH_NAMES[hover]}</span>
                </>
              ),
            }
          : null
      }
    >
      {values.map((v, i) => {
        const x = PAD.left + slot * (i + 0.5) - bw / 2;
        const y = yAt(v, yMax);
        const h = Math.max(0, yAt(0, yMax) - y);
        const r = Math.min(4, h, bw / 2);
        // скруглений лише верх, основа пласка
        const d = `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${y + h}Z`;
        return <path key={i} className="chart-bar" data-dim={hover !== null && hover !== i ? "" : undefined} d={d} />;
      })}
    </ChartFrame>
  );
}

/* ───────── Окупність ───────── */

interface PaybackChartProps {
  points: { year: number; cumulative: number }[];
  cost: number;
  paybackYears: number | null;
}

export function PaybackChart({ points, cost, paybackYears }: PaybackChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const years = points[points.length - 1]?.year ?? 25;
  const yTicks = niceTicks(Math.max(cost, ...points.map((p) => p.cumulative), 1), 3);
  const yMax = yTicks[yTicks.length - 1];
  const pts = points.map((p) => [xAt(p.year / years), yAt(p.cumulative, yMax)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const costY = yAt(cost, yMax);

  return (
    <ChartFrame
      label="Накопичена економія за роками порівняно з вартістю станції"
      yTicks={yTicks}
      yMax={yMax}
      yFormat={formatCompact}
      xTicks={[0, 5, 10, 15, 20, 25].filter((y) => y <= years).map((y) => ({ x: xAt(y / years), label: `${y} р` }))}
      onMove={(x) => {
        const y = Math.round(((x - PAD.left) / PW) * years);
        setHover(y >= 0 && y <= years ? y : null);
      }}
      onLeave={() => setHover(null)}
      tooltip={
        hover !== null
          ? {
              x: pts[hover][0],
              y: pts[hover][1],
              content: (
                <>
                  <b>{formatNumber(points[hover].cumulative)} грн</b>
                  <span>{hover} р.</span>
                </>
              ),
            }
          : null
      }
    >
      {cost > 0 && (
        <>
          <line className="chart-ref" x1={PAD.left} x2={W - PAD.right} y1={costY} y2={costY} />
          <text className="chart-ref-label" x={PAD.left + 4} y={costY - 5}>
            Вартість станції
          </text>
        </>
      )}
      <path className="chart-line" d={line} />
      {paybackYears !== null && (
        <circle className="chart-dot" cx={xAt(paybackYears / years)} cy={costY} r={4} />
      )}
      {hover !== null && <circle className="chart-dot" cx={pts[hover][0]} cy={pts[hover][1]} r={4} />}
    </ChartFrame>
  );
}
