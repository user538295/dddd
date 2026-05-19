import type { PrCycleTimeDashboard } from '~/metrics/pr-cycle-time-dashboard'

export type WeeklyTrendHoursPoint = { weekStart: string; medianHours: number | null }
export type WeeklyTrendLinesPoint = { weekStart: string; medianLines: number | null }
export type WeeklyTrendPoint = WeeklyTrendHoursPoint | WeeklyTrendLinesPoint

const VB_W = 560
const VB_H = 220
const PAD_L = 48
const PAD_R = 20
const PAD_T = 32
const PAD_B = 48

function shortWeekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return weekStart
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 3) return 3 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

function buildAxis(maxNumeric: number, linesMode: boolean): { maxValue: number; ticks: number[] } {
  if (!linesMode && maxNumeric <= 8) {
    const maxValue = clamp(Math.ceil(Math.max(5, maxNumeric) * 10) / 10, 1, 99)
    const topTick = Math.max(5, Math.ceil(maxValue))
    return { maxValue, ticks: Array.from({ length: topTick + 1 }, (_, i) => i) }
  }

  const minTop = linesMode ? 10 : 5
  const paddedMax = Math.max(minTop, maxNumeric)
  const step = niceStep(paddedMax / 4)
  const maxValue = Math.ceil(paddedMax / step) * step
  const tickCount = Math.round(maxValue / step) + 1
  return { maxValue, ticks: Array.from({ length: tickCount }, (_, i) => i * step) }
}

type Pt = { i: number; x: number; y: number; value: number }

function isLinesPoint(point: WeeklyTrendPoint): point is WeeklyTrendLinesPoint {
  return 'medianLines' in point
}

function chartValue(point: WeeklyTrendPoint): number | null {
  if (isLinesPoint(point)) return point.medianLines
  return point.medianHours == null ? null : point.medianHours / 24
}

function joinPath(points: Pt[], fromIdx: number, toIdx: number): string {
  let d = ''
  for (let j = fromIdx; j <= toIdx; j++) {
    const p = points[j]!
    d += j === fromIdx ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
  }
  return d
}

export function WeeklyTrendChart({
  weeklyTrend,
  ariaLabel = '8-week PR cycle time trend',
  yAxisLabel = 'Days',
}: {
  weeklyTrend: PrCycleTimeDashboard['weeklyTrend'] | WeeklyTrendLinesPoint[]
  ariaLabel?: string
  yAxisLabel?: string
}) {
  const linesMode = weeklyTrend.length > 0 && isLinesPoint(weeklyTrend[0]!)
  const n = weeklyTrend.length
  const innerW = VB_W - PAD_L - PAD_R
  const innerH = VB_H - PAD_T - PAD_B

  const chartValues = weeklyTrend.map((p) => chartValue(p))
  const numeric = chartValues.filter((v): v is number => v != null && Number.isFinite(v))
  const { maxValue, ticks: yTicks } = buildAxis(Math.max(...numeric, 0.1), linesMode)

  const xAt = (i: number) => PAD_L + (n <= 1 ? innerW / 2 : (i / Math.max(1, n - 1)) * innerW)
  const yAt = (value: number) => PAD_T + (1 - value / maxValue) * innerH

  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const value = chartValues[i]
    if (value != null && Number.isFinite(value)) {
      pts.push({ i, x: xAt(i), y: yAt(value), value })
    }
  }

  let pathBlack = ''
  let pathOrange = ''
  if (pts.length >= 2) {
    if (pts.length === 2) {
      pathOrange = joinPath(pts, 0, 1)
    } else {
      pathBlack = joinPath(pts, 0, pts.length - 2)
      pathOrange = joinPath(pts, pts.length - 2, pts.length - 1)
    }
  } else if (pts.length === 1) {
    pathBlack = ''
    pathOrange = ''
  }

  const formatPointLabel = (value: number) => (linesMode ? String(Math.round(value)) : value.toFixed(1))
  const formatTickLabel = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

  return (
    <div className="pr-dashboard__chart-wrap">
      <svg
        className="pr-dashboard__chart-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <text x={PAD_L} y={18} fill="#6b7280" fontSize="11" fontWeight="500">
          {yAxisLabel}
        </text>

        {yTicks.map((t) => {
          const yy = yAt(t)
          return (
            <g key={t}>
              <line x1={PAD_L} y1={yy} x2={VB_W - PAD_R} y2={yy} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 4" />
              <text x={PAD_L - 8} y={yy + 4} fill="#9ca3af" fontSize="10" textAnchor="end">
                {formatTickLabel(t)}
              </text>
            </g>
          )
        })}

        {pathBlack ? (
          <path
            d={pathBlack}
            fill="none"
            stroke="#111827"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {pathOrange ? (
          <path
            d={pathOrange}
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {pts.map((p, idx) => {
          const isLast = idx === pts.length - 1
          return (
            <g key={p.i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isLast ? 6 : 5}
                fill="#fff"
                stroke={isLast ? '#d97706' : '#111827'}
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={p.y - 12}
                fill={isLast ? '#d97706' : '#111827'}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {formatPointLabel(p.value)}
              </text>
            </g>
          )
        })}

        {weeklyTrend.map((p, i) => (
          <text
            key={p.weekStart}
            x={xAt(i)}
            y={VB_H - 12}
            fill="#6b7280"
            fontSize="10"
            fontWeight="500"
            textAnchor="middle"
          >
            {shortWeekLabel(p.weekStart)}
          </text>
        ))}
      </svg>
    </div>
  )
}
