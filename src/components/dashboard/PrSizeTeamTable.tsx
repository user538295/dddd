import type { PrSizeTeamRow } from '~/metrics/pr-cycle-time-dashboard'
import { CardHowToRead } from '~/components/dashboard/card-how-to-read'

type Props = {
  rows: PrSizeTeamRow[]
}

function formatMedianLines(lines: number | null): string {
  if (lines === null) return '—'
  return `${lines} lines`
}

export function PrSizeTeamTable({ rows }: Props) {
  return (
    <section
      className="pr-dashboard__card"
      data-testid="pr-size-team-table"
      aria-label="PR size team breakdown"
    >
      <h3 className="pr-dashboard__card-title">PR size team breakdown</h3>
      <CardHowToRead>
        Per-team median PR size (lines changed) and trend versus the previous period, plus the largest merged PR
        in the window. Repos without a team mapping are excluded.
      </CardHowToRead>
      <div className="pr-dashboard__table-wrap">
        <table className="pr-dashboard__table" aria-label="PR size team breakdown">
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col">PRs merged</th>
              <th scope="col">Median size (lines)</th>
              <th scope="col">Trend</th>
              <th scope="col">Largest PR</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} data-testid="pr-size-team-empty">
                  No team data in range
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.team}>
                  <td>{r.team}</td>
                  <td className="pr-dashboard__num">{r.prCount}</td>
                  <td className="pr-dashboard__num">{formatMedianLines(r.medianLines)}</td>
                  <td className="pr-dashboard__num" data-testid={`pr-size-trend-${r.team}`}>
                    {r.trend}
                  </td>
                  <td>
                    <a
                      href={r.largestPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pr-dashboard__pr-link"
                    >
                      {r.largestPrTitle}{' '}
                      <span className="pr-dashboard__pr-repo">({r.largestPrRepo})</span>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
