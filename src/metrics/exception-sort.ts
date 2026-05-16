export type ExceptionSortable = {
  severity: 'warning' | 'info'
  team: string
}

export function sortExceptionsBySeverityThenMagnitude<E extends ExceptionSortable>(
  exceptions: E[],
  lookupAbsTrendPercent: (e: E) => number | null,
): void {
  exceptions.sort((a, b) => {
    const sev = (s: ExceptionSortable['severity']) => (s === 'warning' ? 1 : 0)
    const ds = sev(b.severity) - sev(a.severity)
    if (ds !== 0) return ds

    const ta = lookupAbsTrendPercent(a)
    const tb = lookupAbsTrendPercent(b)
    if (ta === null && tb === null) return a.team.localeCompare(b.team)
    if (ta === null) return 1
    if (tb === null) return -1
    if (tb !== ta) return tb - ta
    return a.team.localeCompare(b.team)
  })
}
