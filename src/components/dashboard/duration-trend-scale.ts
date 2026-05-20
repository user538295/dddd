export type DurationUnit = 'minutes' | 'hours' | 'days'

export type DurationScale = {
  unit: DurationUnit
  axisLabel: string
  suffix: string
  valueFromHours: (hours: number) => number
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
