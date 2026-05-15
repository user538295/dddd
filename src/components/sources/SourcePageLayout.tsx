import type { ReactNode } from 'react'

import '~/components/sources/source-page.css'

export type SourcePageLayoutProps = {
  title: string
  description: string
  children: ReactNode
}

export function SourcePageLayout({ title, description, children }: SourcePageLayoutProps) {
  return (
    <main className="source-page">
      <div className="source-page__inner">
        <p className="source-page__back">
          <a href="/">← Back to dashboard</a>
        </p>
        <header className="source-page__header">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </main>
  )
}
