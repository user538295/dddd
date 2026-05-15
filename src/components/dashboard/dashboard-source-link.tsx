import type { ReactNode } from 'react'

export type DashboardSourceLinkProps = {
  href: string
  children: ReactNode
  className?: string
}

/** Link to an in-app source drill-down page (local DB provenance). */
export function DashboardSourceLink({ href, children, className }: DashboardSourceLinkProps) {
  const classes = ['pr-dashboard__source-link', className].filter(Boolean).join(' ')
  return (
    <a href={href} className={classes}>
      {children}
    </a>
  )
}
