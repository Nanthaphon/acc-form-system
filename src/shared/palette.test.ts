import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Tailwind fails silently on a colour that does not exist: a class naming a
// shade nobody defined compiles, ships, and simply paints nothing. The build,
// the types and the tests all stay quiet — the mistake surfaces as an
// invisible label in whichever state nobody happened to open. These two tests
// are the only thing standing between a typo and that.

const ROOT = join(__dirname, '..', '..')
const PALETTE = ['clay', 'sand', 'ochre', 'olive', 'brick', 'rose', 'stone']
// What the app used before the Harbor palette. Tailwind still defines these,
// so one left behind goes on working — just in the wrong colour, next to
// everything else that moved.
const RETIRED = ['gray', 'blue', 'indigo', 'slate', 'green', 'amber', 'red', 'emerald', 'yellow']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx?|jsx?)$/.test(name) ? [path] : []
  })
}

/** Every `<name>-<shade>` the palette defines, as "clay-600". */
function definedShades(): Set<string> {
  const config = readFileSync(join(ROOT, 'tailwind.config.js'), 'utf8')
  const shades = new Set<string>()
  for (const block of config.matchAll(/^ {8}(\w+): \{([\s\S]*?)\n {8}\},/gm)) {
    const [, name, body] = block
    for (const shade of body.matchAll(/^\s+(\d+): '#[0-9A-Fa-f]{6}'/gm)) shades.add(`${name}-${shade[1]}`)
  }
  return shades
}

/**
 * A class name only ever reaches Tailwind through a string, so only strings
 * are searched. Prose is not code: a comment weighing `rose-300` against the
 * `red-300` it replaced must not read as either one being in use.
 */
function classText(source: string): string {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  const strings = withoutComments.match(/(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g)
  return strings ? strings.join(' ') : ''
}

/** Colour classes actually written in the app, with the file each came from. */
function usedShades(names: string[]): Map<string, string[]> {
  const pattern = new RegExp(`\\b(${names.join('|')})-(\\d+)\\b`, 'g')
  const found = new Map<string, string[]>()
  for (const file of sourceFiles(join(ROOT, 'src'))) {
    // The kit under src/ui ships as-is from the other project; it is not ours
    // to police, and it already uses the palette it was written against.
    if (file.includes(`${join('src', 'ui')}`)) continue
    for (const m of classText(readFileSync(file, 'utf8')).matchAll(pattern)) {
      const key = `${m[1]}-${m[2]}`
      const where = found.get(key) ?? []
      const short = file.slice(ROOT.length + 1).replace(/\\/g, '/')
      if (!where.includes(short)) where.push(short)
      found.set(key, where)
    }
  }
  return found
}

describe('the colour palette', () => {
  it('defines every shade the app asks for', () => {
    const defined = definedShades()
    const missing = [...usedShades(PALETTE)]
      .filter(([shade]) => !defined.has(shade))
      .map(([shade, files]) => `${shade} (used in ${files.join(', ')})`)

    expect(missing, 'these would paint nothing at all').toEqual([])
  })

  it('has no leftovers from the palette the app used before', () => {
    const leftovers = [...usedShades(RETIRED)]
      .map(([shade, files]) => `${shade} (still in ${files.join(', ')})`)

    expect(leftovers, 'these still work, but in the old colours').toEqual([])
  })
})
