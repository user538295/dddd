import type { FirstReview } from '~/metrics/pr-cycle-time-dashboard'
import { FirstReviewCard } from './FirstReviewCard'
import { FirstReviewExceptionsPanel } from './FirstReviewExceptionsPanel'
import { FirstReviewTeamTable } from './FirstReviewTeamTable'
import { FirstReviewTrendChart } from './FirstReviewTrendChart'

type Props = {
  firstReview: FirstReview | undefined
}

export function FirstReviewSection({ firstReview }: Props) {
  if (firstReview === undefined) return null
  return (
    <section data-testid="phase02-section" aria-label="First Review Time">
      <div data-testid="phase02-row-1" className="phase02-row-1">
        <FirstReviewCard metric={firstReview.metric} />
        <FirstReviewExceptionsPanel exceptions={firstReview.exceptions} />
      </div>
      <div data-testid="phase02-row-2" className="phase02-row-2">
        <FirstReviewTrendChart weeklyTrend={firstReview.weeklyTrend} />
        <FirstReviewTeamTable rows={firstReview.teamBreakdown} />
      </div>
    </section>
  )
}
