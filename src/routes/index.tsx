import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

export function Home() {
  return (
    <main>
      <h1>Engineering Decision Dashboard</h1>
    </main>
  )
}
