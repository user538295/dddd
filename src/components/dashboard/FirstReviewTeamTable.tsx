import type { FirstReviewTeamRow } from '~/metrics/pr-cycle-time-dashboard'

type Props = {
  rows: FirstReviewTeamRow[]
}

function fmtHours(h: number | null): string {
  return h === null ? '—' : `${h.toFixed(1)}h`
}

function fmtPercent(p: number | null): string {
  return p === null ? '—' : `${p >= 0 ? '+' : ''}${p.toFixed(0)}%`
}

function fmtCount(n: number | null): string {
  return n === null ? '—' : String(n)
}

export function FirstReviewTeamTable({ rows }: Props) {
  return (
    <section data-testid="first-review-team-table" aria-label="First Review team breakdown">
      <table aria-label="First Review team breakdown">
        <caption>First Review team breakdown</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">First Review</th>
            <th scope="col">Review Trend</th>
            <th scope="col">No-review Merges</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} data-testid="first-review-team-empty">
                No team data in range
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.team}>
                <td>{r.team}</td>
                <td>{fmtHours(r.medianHours)}</td>
                <td>{fmtPercent(r.trendPercent)}</td>
                <td>{fmtCount(r.noReviewMergeCount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
