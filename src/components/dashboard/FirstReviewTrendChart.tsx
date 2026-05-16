type Point = { weekStart: string; medianHours: number | null }

type Props = {
  weeklyTrend: Point[]
}

export function FirstReviewTrendChart({ weeklyTrend }: Props) {
  return (
    <section data-testid="first-review-trend" aria-label="First Review weekly trend">
      <h2>First Review weekly trend</h2>
      <ul>
        {weeklyTrend.map((p) => (
          <li key={p.weekStart} data-week-start={p.weekStart}>
            <span className="week">{p.weekStart}</span>
            <span className="median">{p.medianHours === null ? '—' : `${p.medianHours.toFixed(1)}h`}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
