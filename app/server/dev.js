// Carrega o .env aqui para o Express e o Vite (proxy de /api) usarem a mesma PORT.
import './env.js'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const processes = [
  spawn(process.execPath, ['server/index.js'], { cwd: projectDirectory, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: projectDirectory, stdio: 'inherit' }),
]

let stopping = false
function stop(exitCode) {
  if (stopping) return
  stopping = true
  process.exitCode = exitCode
  for (const child of processes) child.kill()
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error(error)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stop(code || 1)
  })
}

process.on('SIGINT', () => stop(130))
process.on('SIGTERM', () => stop(143))
