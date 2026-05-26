import { spawn } from 'node:child_process'
import path from 'node:path'

import { clearE2eRefreshStubForLocalCommand, loadLocalEnv, LOCAL_ENV_KEYS } from './local-env'

loadLocalEnv({ preferDotenvKeys: LOCAL_ENV_KEYS })
clearE2eRefreshStubForLocalCommand()

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
