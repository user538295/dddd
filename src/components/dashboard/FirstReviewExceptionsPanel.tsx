import type { FirstReviewException } from '~/metrics/pr-cycle-time-dashboard'

type Props = {
  exceptions: FirstReviewException[]
}

export function FirstReviewExceptionsPanel({ exceptions }: Props) {
  if (exceptions.length === 0) return null
  return (
    <section data-testid="first-review-exceptions" aria-label="Review-latency exceptions">
      <h2>Review-latency exceptions</h2>
      <ul>
        {exceptions.map((e, i) => (
          <li key={i} data-exception-type={e.type}>
            <span className={`severity-${e.severity}`}>{e.severity}</span>
            <strong>{e.team}</strong>
            <p>{e.message}</p>
            {e.prDetails && e.prDetails.length > 0 ? (
              <ul className="pr-details">
                {e.prDetails.map((d) => (
                  <li key={`${d.repo}-${d.prNumber}`}>
                    <span className="pr-title">{d.title}</span>
                    <span className="pr-repo">{d.repo}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
