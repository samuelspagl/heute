import { readdir, readFile, realpath, mkdir, writeFile, copyFile, rm } from 'node:fs/promises'
import { join, relative } from 'node:path'

// Inventory the installed platform, including build tools and nested dependencies.
// This preserves shipped notices; it is not a legal compatibility decision.
const output = '.licenses'
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
const visited = new Set()
const packages = []
async function modules(directory) {
  let entries
  try { entries = await readdir(directory, { withFileTypes: true }) }
  catch (error) { if (error.code === 'ENOENT') return; throw error }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.name.startsWith('@')) { await modules(path); continue }
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const resolved = await realpath(path)
    if (visited.has(resolved)) continue
    visited.add(resolved)
    let pkg
    try { pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') continue; throw error }
    if (!pkg.name || !pkg.version) continue
    const id = `${pkg.name.replaceAll('/', '__')}@${pkg.version}`
    const notices = []
    async function collect(dir) {
      for (const file of await readdir(dir, { withFileTypes: true })) {
        if (file.name === 'node_modules' || file.isSymbolicLink()) continue
        const source = join(dir, file.name)
        if (file.isDirectory()) { await collect(source); continue }
        if (!/^(licen[cs]e|copying|copyright|notice)([._-]|$)/i.test(file.name)
          && !(dir === path && /^(readme([._-]|$)|versions\.json$)/i.test(file.name))) continue
        const name = relative(path, source)
        const destination = join(output, id, name)
        await mkdir(join(destination, '..'), { recursive: true })
        await copyFile(source, destination)
        if (/^(licen[cs]e|copying|copyright|notice)([._-]|$)/i.test(file.name)) notices.push(name)
      }
    }
    await collect(path)
    packages.push({ name: pkg.name, version: pkg.version, license: pkg.license ?? pkg.licenses ?? 'UNKNOWN', repository: pkg.repository ?? null, notices: notices.sort() })
    await modules(join(path, 'node_modules'))
  }
}
await modules('node_modules')
if (!packages.length) throw new Error('No installed packages found; run bun install first.')
packages.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`))
await writeFile(join(output, 'packages.json'), JSON.stringify(packages, null, 2) + '\n')
console.log(`Collected notices for ${packages.length} installed packages in ${output}.`)
console.log(`Review required: ${packages.filter(p => p.license === 'UNKNOWN').map(p => p.name).join(', ') || 'no missing license metadata'}`)
console.log(`${packages.filter(p => !p.notices.length).length} packages ship no separate license/notice file; see packages.json.`)
