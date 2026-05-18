import { median } from '~/metrics/math'
import type { PrSizeRecord } from '~/metrics/pr-size-types'

export type PrSizeException = {
  type: 'oversized_pr_pattern'
  severity: 'warning'
  team: string
  message: string
  flaggedPrCount: number
  totalPrCount: number
}

function hasSize(p: PrSizeRecord): boolean {
  return p.additions !== null && p.deletions !== null
}

function prLines(p: PrSizeRecord): number {
  return p.additions! + p.deletions!
}

function isFlaggedPr(pr: PrSizeRecord, sized: PrSizeRecord[]): boolean {
  const others = sized.filter((p) => p.id !== pr.id)
  if (others.length === 0) return false

  const teamMedian = median(others.map(prLines))
  if (teamMedian === null) return false

  return prLines(pr) > 2 * teamMedian
}

export function buildPrSizeExceptions(
  teamPrs: Map<string, PrSizeRecord[]>,
): PrSizeException[] {
  const candidates: Array<{
    team: string
    flaggedPrCount: number
    totalPrCount: number
    ratio: number
  }> = []

  for (const [team, prs] of teamPrs) {
    const sized = prs.filter(hasSize)
    if (sized.length < 3) continue

    const flaggedPrCount = sized.filter((p) => isFlaggedPr(p, sized)).length
    const totalPrCount = sized.length
    const ratio = flaggedPrCount / totalPrCount

    if (ratio >= 0.5) {
      candidates.push({ team, flaggedPrCount, totalPrCount, ratio })
    }
  }

  candidates.sort((a, b) => b.ratio - a.ratio || a.team.localeCompare(b.team))

  return candidates.slice(0, 3).map((c) => ({
    type: 'oversized_pr_pattern',
    severity: 'warning',
    team: c.team,
    message: `${c.flaggedPrCount} of ${c.totalPrCount} PRs exceed 2× team median`,
    flaggedPrCount: c.flaggedPrCount,
    totalPrCount: c.totalPrCount,
  }))
}
