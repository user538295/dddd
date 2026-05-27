export const WEEKLY_TREND_CHART_VIEWBOX_WIDTH = 560
export const WEEKLY_TREND_CHART_VIEWBOX_HEIGHT = 220

/** Explicit average glyph width for deterministic label bounds (no DOM measurement). */
export const DETACHED_VALUE_LABEL_AVG_CHAR_WIDTH = 6.5
export const DETACHED_VALUE_LABEL_FONT_SIZE = 11
export const DETACHED_VALUE_LABEL_LINE_HEIGHT = 14
export const DETACHED_VALUE_LABEL_PADDING_X = 4
export const DETACHED_VALUE_LABEL_PADDING_Y = 4
export const DETACHED_MARKER_RADIUS = 5
const LABEL_GAP_PX = 8

export type LayoutRect = { x: number; y: number; width: number; height: number }

export type DetachedMarkerLayoutInput = {
  markerX: number
  markerY: number
  valueLabel: string
  viewBoxWidth?: number
  viewBoxHeight?: number
}

export type DetachedMarkerLayout = {
  markerRect: LayoutRect
  valueLabelRect: LayoutRect
  valueLabelX: number
  valueLabelY: number
  valueLabelAnchor: 'middle'
}

function valueLabelRectSize(valueLabel: string): { width: number; height: number } {
  const width =
    valueLabel.length * DETACHED_VALUE_LABEL_AVG_CHAR_WIDTH + DETACHED_VALUE_LABEL_PADDING_X * 2
  const height = DETACHED_VALUE_LABEL_LINE_HEIGHT + DETACHED_VALUE_LABEL_PADDING_Y * 2
  return { width, height }
}

function markerRectAt(markerX: number, markerY: number, radius: number): LayoutRect {
  return {
    x: markerX - radius,
    y: markerY - radius,
    width: radius * 2,
    height: radius * 2,
  }
}

export function clampLayoutRect(
  rect: LayoutRect,
  viewBoxWidth: number,
  viewBoxHeight: number,
): LayoutRect {
  const width = Math.min(rect.width, viewBoxWidth)
  const height = Math.min(rect.height, viewBoxHeight)
  let x = rect.x
  let y = rect.y
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + width > viewBoxWidth) x = viewBoxWidth - width
  if (y + height > viewBoxHeight) y = viewBoxHeight - height
  return { x, y, width, height }
}

function labelRectAboveMarker(markerX: number, markerY: number, labelSize: { width: number; height: number }): LayoutRect {
  return {
    x: markerX - labelSize.width / 2,
    y: markerY - DETACHED_MARKER_RADIUS - LABEL_GAP_PX - labelSize.height,
    width: labelSize.width,
    height: labelSize.height,
  }
}

function labelRectBelowMarker(markerX: number, markerY: number, labelSize: { width: number; height: number }): LayoutRect {
  return {
    x: markerX - labelSize.width / 2,
    y: markerY + DETACHED_MARKER_RADIUS + LABEL_GAP_PX,
    width: labelSize.width,
    height: labelSize.height,
  }
}

function rectFitsViewBox(rect: LayoutRect, viewBoxWidth: number, viewBoxHeight: number): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewBoxWidth && rect.y + rect.height <= viewBoxHeight
}

export function layoutDetachedMarker(input: DetachedMarkerLayoutInput): DetachedMarkerLayout {
  const viewBoxWidth = input.viewBoxWidth ?? WEEKLY_TREND_CHART_VIEWBOX_WIDTH
  const viewBoxHeight = input.viewBoxHeight ?? WEEKLY_TREND_CHART_VIEWBOX_HEIGHT
  const labelSize = valueLabelRectSize(input.valueLabel)
  const markerRect = markerRectAt(input.markerX, input.markerY, DETACHED_MARKER_RADIUS)

  const above = labelRectAboveMarker(input.markerX, input.markerY, labelSize)
  const below = labelRectBelowMarker(input.markerX, input.markerY, labelSize)
  const aboveClamped = clampLayoutRect(above, viewBoxWidth, viewBoxHeight)
  const valueLabelRect = rectFitsViewBox(above, viewBoxWidth, viewBoxHeight)
    ? above
    : rectFitsViewBox(below, viewBoxWidth, viewBoxHeight)
      ? below
      : aboveClamped

  const valueLabelX = valueLabelRect.x + valueLabelRect.width / 2
  const valueLabelY =
    valueLabelRect.y + DETACHED_VALUE_LABEL_PADDING_Y + DETACHED_VALUE_LABEL_LINE_HEIGHT * 0.75

  return {
    markerRect,
    valueLabelRect,
    valueLabelX,
    valueLabelY,
    valueLabelAnchor: 'middle',
  }
}
