import type { PrSizeException } from '~/metrics/pr-cycle-time-dashboard'
import { CardHowToRead } from '~/components/dashboard/card-how-to-read'

type Props = {
  exceptions: PrSizeException[]
}

export function PrSizeExceptionsPanel({ exceptions }: Props) {
  if (exceptions.length === 0) return null

  return (
    <section
      className="pr-dashboard__card"
      data-testid="pr-size-exceptions"
      aria-label="Oversized PR exceptions"
    >
      <h3 className="pr-dashboard__card-title">Oversized PR exceptions</h3>
      <CardHowToRead>
        Teams where at least half of merged PRs in this range exceed twice that team&apos;s median
        size. Chronically large teams are not flagged because their median adjusts to their norm.
      </CardHowToRead>
      <ul className="pr-dashboard__exception-list">
        {exceptions.map((e) => (
          <li
            key={`${e.type}-${e.team}-${e.message}`}
            className="pr-dashboard__exception-row"
            data-exception-type={e.type}
          >
            <IconWarning className="pr-dashboard__exception-icon" />
            <div className="pr-dashboard__exception-body">
              <div className="pr-dashboard__exception-title-row">
                <span className="pr-dashboard__exception-title">{e.team}</span>
                <span className="pr-dashboard__exception-metric">{e.message}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4L3 18h16L11 4z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 9v4M11 16h.01" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
