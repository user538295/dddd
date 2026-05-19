import { CardHowToRead } from '~/components/dashboard/card-how-to-read'
import { WeeklyTrendChart } from '~/components/dashboard/weekly-trend-chart'

type Point = { weekStart: string; medianLines: number | null }

type Props = {
  weeklyTrend: Point[]
}

export function PrSizeTrendChart({ weeklyTrend }: Props) {
  return (
    <section className="pr-dashboard__card" data-testid="pr-size-trend" aria-label="8-week PR size trend">
      <h3 className="pr-dashboard__card-title">8-week PR Size trend</h3>
      <CardHowToRead>
        Weekly median lines changed (additions plus deletions) for PRs merged in each week. Weeks with no
        qualifying PRs appear as gaps.
      </CardHowToRead>
      <WeeklyTrendChart
        weeklyTrend={weeklyTrend}
        ariaLabel="8-week PR size trend"
        yAxisLabel="Lines"
      />
      <ol data-testid="pr-size-weekly-trend-list" className="pr-dashboard__sr-only">
        {weeklyTrend.map((p) => (
          <li key={p.weekStart} data-week-start={p.weekStart}>
            <span className="week">{p.weekStart}</span>
            <span className="median">{p.medianLines === null ? '—' : `${p.medianLines} lines`}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
