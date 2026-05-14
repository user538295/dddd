export function formatCycleDuration(hours: number | null): string {
  if (hours === null || Number.isNaN(hours)) {
    return '—'
  }
  if (hours < 48) {
    const rounded = Math.round(hours * 10) / 10
    return `${rounded}h`
  }
  const days = hours / 24
  return `${days.toFixed(1)} days`
}
