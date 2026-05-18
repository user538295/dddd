export type PrSizeRecord = {
  id: string
  number: number
  title: string
  url: string
  repositoryId: string
  repoFullName: string
  team: string | null
  mergedAt: Date
  additions: number | null
  deletions: number | null
  changedFiles: number | null
}
