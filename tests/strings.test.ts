import { describe, expect, it } from 'vitest'
import { strings } from '../src/strings'

function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('strings', () => {
  it('de und en haben identische Schlüssel', () => {
    expect(keysOf(strings.de).sort()).toEqual(keysOf(strings.en).sort())
  })
  it('keine leeren Pflichttexte', () => {
    const optional = new Set(['fleet.deNote'])
    for (const lang of ['de', 'en'] as const) {
      for (const k of keysOf(strings[lang])) {
        if (optional.has(k)) continue
        const val = k.split('.').reduce((o, p) => (o as Record<string, never>)[p], strings[lang] as unknown)
        expect(val, `${lang}.${k}`).not.toBe('')
      }
    }
  })
})
