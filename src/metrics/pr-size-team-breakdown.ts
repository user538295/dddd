import { median } from '~/metrics/math'
import type { PrSizeRecord } from '~/metrics/pr-size-types'

export type PrSizeTeamRow = {
  team: string
  prCount: number
  medianLines: number | null
  trend: '↑' | '↓' | '→' | '—'
  largestPrTitle: string
  largestPrRepo: string
  largestPrUrl: string
  largestPrLines: number
}

function hasSize(p: PrSizeRecord): boolean {
  return p.additions !== null && p.deletions !== null
}

function prLines(p: PrSizeRecord): number {
  return p.additions! + p.deletions!
}

function inWindow(pr: PrSizeRecord, window: { from: Date; to: Date }): boolean {
  const m = pr.mergedAt.getTime()
  return m >= window.from.getTime() && m <= window.to.getTime()
}

function computeTrend(
  currentMedian: number | null,
  priorMedian: number | null,
  currentSizedCount: number,
  priorSizedCount: number,
): PrSizeTeamRow['trend'] {
  if (currentSizedCount < 3 || priorSizedCount < 3) return '—'
  if (currentMedian === null || priorMedian === null) return '—'

  if (currentMedian >= priorMedian * 1.1) return '↑'
  if (priorMedian >= currentMedian * 1.1) return '↓'
  return '→'
}

export function getPrSizeTeamBreakdown(
  prs: PrSizeRecord[],
  currentWindow: { from: Date; to: Date },
  priorWindow: { from: Date; to: Date },
): PrSizeTeamRow[] {
  const teams = new Set<string>()
  for (const p of prs) {
    if (p.team !== null) teams.add(p.team)
  }

  const rows: PrSizeTeamRow[] = []

  for (const team of teams) {
    const teamPrs = prs.filter((p) => p.team === team)
    const currentSized = teamPrs.filter((p) => inWindow(p, currentWindow) && hasSize(p))
    if (currentSized.length === 0) continue

    const priorSized = teamPrs.filter((p) => inWindow(p, priorWindow) && hasSize(p))
    const medianLines = median(currentSized.map(prLines))
    const priorMedianLines = median(priorSized.map(prLines))

    let largest = currentSized[0]!
    let largestLines = prLines(largest)
    for (const p of currentSized.slice(1)) {
      const lines = prLines(p)
      if (lines > largestLines) {
        largest = p
        largestLines = lines
      }
    }

    rows.push({
      team,
      prCount: currentSized.length,
      medianLines,
      trend: computeTrend(medianLines, priorMedianLines, currentSized.length, priorSized.length),
      largestPrTitle: largest.title,
      largestPrRepo: largest.repoFullName,
      largestPrUrl: largest.url,
      largestPrLines: largestLines,
    })
  }

  rows.sort((a, b) => {
    if (a.medianLines === null && b.medianLines === null) return a.team.localeCompare(b.team)
    if (a.medianLines === null) return 1
    if (b.medianLines === null) return -1
    if (b.medianLines !== a.medianLines) return b.medianLines - a.medianLines
    return a.team.localeCompare(b.team)
  })

  return rows
}
