export type DurationUnit = 'minutes' | 'hours' | 'days'

export type DurationScale = {
  unit: DurationUnit
  axisLabel: string
  suffix: string
  valueFromHours: (hours: number) => number
}

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 3) return 3 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

export function selectDurationUnit(maxHours: number | null): DurationUnit {
  if (maxHours === null) return 'hours'
  if (maxHours < 1) return 'minutes'
  if (maxHours < 48) return 'hours'
  return 'days'
}

export function durationScaleFor(unit: DurationUnit): DurationScale {
  switch (unit) {
    case 'minutes':
      return {
        unit,
        axisLabel: 'Minutes',
        suffix: 'm',
        valueFromHours: (hours) => hours * 60,
      }
    case 'hours':
      return {
        unit,
        axisLabel: 'Hours',
        suffix: 'h',
        valueFromHours: (hours) => hours,
      }
    case 'days':
      return {
        unit,
        axisLabel: 'Days',
        suffix: 'd',
        valueFromHours: (hours) => hours / 24,
      }
  }
}

function trimTrailingZeroes(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export function formatScaledDurationChartValue(displayValue: number, unit: DurationUnit): string {
  const { suffix } = durationScaleFor(unit)
  if (!Number.isFinite(displayValue)) return `—${suffix}`
  if (displayValue === 0) return `0${suffix}`

  const abs = Math.abs(displayValue)
  const sign = displayValue < 0 ? '-' : ''
  if (abs >= 1) {
    return `${sign}${trimTrailingZeroes(abs.toFixed(1))}${suffix}`
  }

  for (let decimals = 1; decimals <= 4; decimals++) {
    const rounded = Number(abs.toFixed(decimals))
    if (rounded > 0) {
      return `${sign}${trimTrailingZeroes(abs.toFixed(decimals))}${suffix}`
    }
  }

  return `${sign}<0.0001${suffix}`
}

export function formatDurationHoursForChart(hours: number, unit: DurationUnit): string {
  const scale = durationScaleFor(unit)
  return formatScaledDurationChartValue(scale.valueFromHours(hours), unit)
}

export function buildDurationAxis(maxNumeric: number): { maxValue: number; ticks: number[]; paddedMax: number } {
  if (maxNumeric <= 0) {
    return { maxValue: 1, ticks: [0, 1], paddedMax: 0 }
  }

  const paddedMax = maxNumeric * 1.15
  const step = niceStep(paddedMax / 4)
  const maxValue = Math.ceil(paddedMax / step) * step
  const tickCount = Math.round(maxValue / step) + 1
  return { maxValue, ticks: Array.from({ length: tickCount }, (_, i) => i * step), paddedMax }
}
