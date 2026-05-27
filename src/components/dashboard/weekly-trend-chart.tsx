import {
  buildDurationAxis,
  durationScaleFor,
  formatScaledDurationChartValue,
  selectDurationUnit,
} from '~/components/dashboard/duration-trend-scale'
import type { DurationScale } from '~/components/dashboard/duration-trend-scale'

export type WeeklyTrendHoursPoint = { weekStart: string; medianHours: number | null }
export type WeeklyTrendLinesPoint = { weekStart: string; medianLines: number | null }
export type DetachedLinesPoint = {
  weekStart: string
  medianLines: number
  label: string
  ariaLabel: string
}
export type WeeklyTrendChartProps =
  | {
      valueMode: 'duration'
      weeklyTrend: WeeklyTrendHoursPoint[]
      ariaLabel?: string
      yAxisLabel?: string
    }
  | {
      valueMode: 'lines'
      weeklyTrend: WeeklyTrendLinesPoint[]
      detachedPoint?: DetachedLinesPoint
      ariaLabel?: string
      yAxisLabel?: string
    }

type WeeklyTrendPoint = WeeklyTrendHoursPoint | WeeklyTrendLinesPoint

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

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 3) return 3 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

function buildLineAxis(maxNumeric: number): { maxValue: number; ticks: number[] } {
  const minTop = 10
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

function chartValue(point: WeeklyTrendPoint, durationScale: DurationScale): number | null {
  if (isLinesPoint(point)) return point.medianLines
  return point.medianHours == null ? null : durationScale.valueFromHours(point.medianHours)
}

function joinPath(points: Pt[], fromIdx: number, toIdx: number): string {
  let d = ''
  for (let j = fromIdx; j <= toIdx; j++) {
    const p = points[j]!
    d += j === fromIdx ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
  }
  return d
}

function contiguousRuns(points: Pt[]): Pt[][] {
  const runs: Pt[][] = []
  for (const point of points) {
    const current = runs.at(-1)
    if (!current || current.at(-1)!.i + 1 !== point.i) {
      runs.push([point])
    } else {
      current.push(point)
    }
  }
  return runs
}

export function WeeklyTrendChart(props: WeeklyTrendChartProps) {
  const linesMode = props.valueMode === 'lines'
  const weeklyTrend = props.weeklyTrend
  const detachedPoint = linesMode ? props.detachedPoint : undefined
  const ariaLabel =
    props.ariaLabel ?? (linesMode ? '8-week PR size trend' : '8-week PR cycle time trend')
  const yAxisLabel = props.yAxisLabel ?? 'Days'

  const seriesSlotCount = weeklyTrend.length
  const slotCount = seriesSlotCount + (detachedPoint ? 1 : 0)
  const innerW = VB_W - PAD_L - PAD_R
  const innerH = VB_H - PAD_T - PAD_B

  const durationHours = linesMode
    ? []
    : (weeklyTrend as WeeklyTrendHoursPoint[])
        .map((p) => p.medianHours)
        .filter((v): v is number => v != null && Number.isFinite(v))
  const durationScale = durationScaleFor(selectDurationUnit(durationHours.length > 0 ? Math.max(...durationHours) : null))
  const chartValues = weeklyTrend.map((p) => chartValue(p, durationScale))
  const numeric = chartValues.filter((v): v is number => v != null && Number.isFinite(v))
  const detachedNumeric = detachedPoint?.medianLines
  const axisNumeric = [...numeric, ...(detachedNumeric != null ? [detachedNumeric] : [])]
  const { maxValue, ticks: yTicks } = linesMode
    ? buildLineAxis(Math.max(...axisNumeric, 0))
    : buildDurationAxis(Math.max(...numeric, 0))

  const xAt = (i: number) =>
    PAD_L + (slotCount <= 1 ? innerW / 2 : (i / Math.max(1, slotCount - 1)) * innerW)
  const yAt = (value: number) => PAD_T + (1 - value / maxValue) * innerH

  const pts: Pt[] = []
  for (let i = 0; i < seriesSlotCount; i++) {
    const value = chartValues[i]
    if (value != null && Number.isFinite(value)) {
      pts.push({ i, x: xAt(i), y: yAt(value), value })
    }
  }

  const pathSegments: Array<{ d: string; stroke: string }> = []
  for (const run of contiguousRuns(pts)) {
    if (run.length < 2) continue
    for (let i = 0; i < run.length - 1; i++) {
      pathSegments.push({
        d: joinPath(run, i, i + 1),
        stroke: run[i + 1] === pts.at(-1) ? '#d97706' : '#111827',
      })
    }
  }

  const formatPointLabel = (value: number) =>
    linesMode ? String(Math.round(value)) : formatScaledDurationChartValue(value, durationScale.unit)
  const formatTickLabel = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))
  const resolvedYAxisLabel = linesMode ? yAxisLabel : durationScale.axisLabel

  const detachedX = detachedPoint ? xAt(seriesSlotCount) : null
  const detachedY =
    detachedPoint != null && detachedNumeric != null ? yAt(detachedNumeric) : null

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
          {resolvedYAxisLabel}
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

        {pathSegments.map((segment) => (
          <path
            key={segment.d}
            d={segment.d}
            fill="none"
            stroke={segment.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

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

        {detachedPoint && detachedX != null && detachedY != null ? (
          <g aria-label={detachedPoint.ariaLabel}>
            <title>{detachedPoint.ariaLabel}</title>
            <circle cx={detachedX} cy={detachedY} r={5} fill="#fff" stroke="#111827" strokeWidth="2" />
            <text
              x={detachedX}
              y={detachedY - 12}
              fill="#111827"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              {formatPointLabel(detachedPoint.medianLines)}
            </text>
          </g>
        ) : null}

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

        {detachedPoint && detachedX != null ? (
          <text
            key={`detached-${detachedPoint.weekStart}`}
            x={detachedX}
            y={VB_H - 12}
            fill="#6b7280"
            fontSize="10"
            fontWeight="500"
            textAnchor="middle"
          >
            {detachedPoint.label}
          </text>
        ) : null}
      </svg>
    </div>
  )
}
