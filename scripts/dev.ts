import { spawn } from 'node:child_process'
import path from 'node:path'

import { loadLocalEnv } from './local-env'

loadLocalEnv({ preferDotenvKeys: ['GITHUB_TOKEN'] })

const viteBin = path.join(process.cwd(), 'node_modules', '.bin', 'vite')
const child = spawn(viteBin, ['dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
