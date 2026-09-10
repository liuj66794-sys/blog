import test from 'node:test'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('standalone lesson runtimes parse before they are copied into the static site', () => {
  const root = new URL('../runtime/', import.meta.url)
  for (const name of fs.readdirSync(root).filter(n => /\.(mjs|js)$/.test(n))) {
    execFileSync(process.execPath, ['--check', fileURLToPath(new URL(name, root))], { stdio: 'pipe' })
  }
})
