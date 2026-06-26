import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const targetDir = join(root, 'public', 'fonts')

const sourceCandidates = [
  join(root, 'node_modules', 'font-pingfang-sc'),
  join(root, '..', 'node_modules', 'font-pingfang-sc'),
  join(root, '..', '..', 'node_modules', 'font-pingfang-sc'),
]

const sourceDir = sourceCandidates.find((dir) => existsSync(dir))

const files = [
  'PingFangSC-Regular.woff2',
  'PingFangSC-Medium.woff2',
  'PingFangSC-Semibold.woff2',
]

if (!sourceDir) {
  console.warn('[copy-pingfang-fonts] font-pingfang-sc not installed, skip')
  process.exit(0)
}

mkdirSync(targetDir, { recursive: true })

for (const file of files) {
  const from = join(sourceDir, file)
  const to = join(targetDir, file)
  if (!existsSync(from)) {
    console.warn(`[copy-pingfang-fonts] missing ${file}`)
    continue
  }
  copyFileSync(from, to)
  console.log(`[copy-pingfang-fonts] ${file}`)
}
