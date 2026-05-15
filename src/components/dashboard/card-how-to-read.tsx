import type { ReactNode } from 'react'

export type CardHowToReadProps = {
  children: ReactNode
}

export function CardHowToRead({ children }: CardHowToReadProps) {
  return (
    <details className="pr-dashboard__card-help">
      <summary className="pr-dashboard__card-help-summary">How to read this</summary>
      <div className="pr-dashboard__card-help-body">{children}</div>
    </details>
  )
}
