import { CardHowToRead } from '~/components/dashboard/card-how-to-read'
import { WeeklyTrendChart } from '~/components/dashboard/weekly-trend-chart'

type Point = { weekStart: string; medianHours: number | null }

type Props = {
  weeklyTrend: Point[]
}

export function FirstReviewTrendChart({ weeklyTrend }: Props) {
  return (
    <section className="pr-dashboard__card" data-testid="first-review-trend" aria-label="8-week First Review trend">
      <h3 className="pr-dashboard__card-title">8-week First Review trend</h3>
      <CardHowToRead>
        Weekly median open-to-first-human-review time for PRs merged in each week. Weeks with no qualifying reviews
        appear as gaps.
      </CardHowToRead>
      <WeeklyTrendChart weeklyTrend={weeklyTrend} ariaLabel="8-week First Review trend" />
      <ol data-testid="first-review-weekly-trend-list" className="pr-dashboard__sr-only">
        {weeklyTrend.map((p) => (
          <li key={p.weekStart} data-week-start={p.weekStart}>
            <span className="week">{p.weekStart}</span>
            <span className="median">{p.medianHours === null ? '—' : `${(p.medianHours / 24).toFixed(1)} days`}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
