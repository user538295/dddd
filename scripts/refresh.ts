import { refreshLocalData } from '../src/collector/refresh'
import { loadLocalEnv } from './local-env'

loadLocalEnv({ preferDotenvKeys: ['GITHUB_TOKEN'] })

refreshLocalData()
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2))
    process.exit(summary.status === 'failed' ? 1 : 0)
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
