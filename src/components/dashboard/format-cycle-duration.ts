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

/** Mockup-style day label for table cells (e.g. "9 days", "2.8 days"). */
/** Previous-period median beside a trend (extra precision for sub-hour values). */
export function formatPreviousMedianReference(hours: number | null): string {
  if (hours === null || Number.isNaN(hours)) {
    return '—'
  }
  if (hours < 48) {
    if (hours < 1) {
      const rounded = Math.round(hours * 1000) / 1000
      return `${rounded}h`
    }
    const rounded = Math.round(hours * 10) / 10
    return `${rounded}h`
  }
  const days = hours / 24
  return `${days.toFixed(1)} days`
}

export function formatDurationHumanDays(hours: number | null): string {
  if (hours == null || Number.isNaN(hours)) {
    return '—'
  }
  const days = hours / 24
  const rounded = Math.round(days * 10) / 10
  const unit = rounded === 1 ? 'day' : 'days'
  return `${rounded} ${unit}`
}
