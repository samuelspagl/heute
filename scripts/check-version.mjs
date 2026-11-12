import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/
const initialVersion = '0.1.0'

function readRelease(directory, label, allowMissing = false) {
  const versionPath = join(directory, 'VERSION')
  const changelogPath = join(directory, 'CHANGELOG.md')
  if (allowMissing && !existsSync(versionPath) && !existsSync(changelogPath)) return null

  const version = readFileSync(versionPath, 'utf8').trim()
  if (!versionPattern.test(version)) {
    throw new Error(`${label}: VERSION muss das Format MAJOR.MINOR.PATCH haben.`)
  }

  const headings = readFileSync(changelogPath, 'utf8').matchAll(/^##[ \t]+(.+?)\s*$/gm)
  const latest = [...headings].map(([, heading]) => heading)
    .find(heading => !/^(?:\[Unreleased\]|Unreleased)$/i.test(heading))
  const changelogVersion = latest?.match(/^\[([^\]]+)\](?: - \d{4}-\d{2}-\d{2})?$/)?.[1]
  if (changelogVersion !== version) {
    throw new Error(`${label}: Die neueste Überschrift in CHANGELOG.md muss „## [${version}]“ lauten.`)
  }
  return version
}

function isNewer(version, baseVersion) {
  const incoming = version.split('.').map(BigInt)
  const base = baseVersion.split('.').map(BigInt)
  for (let index = 0; index < incoming.length; index++) {
    if (incoming[index] !== base[index]) return incoming[index] > base[index]
  }
  return false
}

try {
  const [pullRequest, main] = process.argv.slice(2)
  if (!pullRequest || !main) throw new Error('Aufruf: bun scripts/check-version.mjs <PR-Verzeichnis> <main-Verzeichnis>')

  const version = readRelease(pullRequest, 'PR')
  const baseVersion = readRelease(main, 'main', true)
  if (!baseVersion) {
    if (version !== initialVersion) throw new Error(`Die erste Version muss ${initialVersion} sein.`)
    console.log(`Erste Version ${version} geprüft.`)
  } else {
    if (!isNewer(version, baseVersion)) {
      throw new Error(`PR-Version ${version} muss höher sein als ${baseVersion} auf main.`)
    }
    console.log(`PR-Version ${version} ist höher als ${baseVersion} auf main.`)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
