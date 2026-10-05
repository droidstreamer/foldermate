import { describe, expect, it } from 'vitest'
import { defaultSettings, sanitize } from '../src/core/settings'

describe('sanitize', () => {
  it('returns defaults for junk', () => {
    for (const junk of [null, 5, 'x', [], undefined]) expect(sanitize(junk)).toEqual(defaultSettings())
  })
  it('keeps valid data and drops invalid pieces', () => {
    const s = sanitize({
      palette: [{ id: 'a', name: 'A', color: '#112233' }, { id: 'b', name: 'B', color: 'red' }, { id: 'a', name: 'dup', color: '#000000' }],
      colorMode: 'background', textColor: 'nope', fadeEnabled: false,
      folderColors: { X: 'a', Y: 'b', Z: 5 },
    })
    expect(s.palette).toEqual([{ id: 'a', name: 'A', color: '#112233' }])
    expect(s.colorMode).toBe('background')
    expect(s.textColor).toBe('#FFFFFF')
    expect(s.fadeEnabled).toBe(false)
    expect(s.folderColors).toEqual({ X: 'a' })
  })
  it('clamps fileAlpha (0 reaches "off") and keeps defaults for junk', () => {
    const s = sanitize({ fileAlpha: 33.4, guideLines: false, boldFolders: true, revealActive: 'yes' })
    expect([s.fileAlpha, s.guideLines, s.boldFolders, s.revealActive]).toEqual([33, false, true, true])
    expect(sanitize({ fileAlpha: -5 }).fileAlpha).toBe(0)
    expect(sanitize({ fileAlpha: 'x', guideLines: 'no' }).fileAlpha).toBe(20)
    expect(sanitize({ guideLines: 'no' }).guideLines).toBe(false)
  })
  it('defaults to text mode', () => expect(defaultSettings().colorMode).toBe('text'))
})

import { addEntry, removeEntry, usageCount } from '../src/core/settings'
describe('palette ops', () => {
  it('removeEntry unassigns folders that used it', () => {
    const s = defaultSettings()
    s.folderColors = { A: 'c1', B: 'c2', 'A/C': 'c1' }
    expect(usageCount(s, 'c1')).toBe(2)
    removeEntry(s, 'c1')
    expect(s.folderColors).toEqual({ B: 'c2' })
    expect(s.palette.some(e => e.id === 'c1')).toBe(false)
  })
  it('addEntry makes a unique id', () => {
    const s = defaultSettings()
    removeEntry(s, 'c1')
    const ids = [addEntry(s).id, addEntry(s).id]
    expect(new Set([...ids, ...s.palette.map(e => e.id)]).size).toBe(s.palette.length)
  })
})

describe('active note toggle (round 22)', () => {
  it('is off by default and on for data that already had a color', () => {
    expect(defaultSettings().activeEnabled).toBe(false)
    expect(sanitize({ activeBg: '#112233' }).activeEnabled).toBe(true)
    expect(sanitize({ activeBg: '#112233', activeEnabled: false }).activeEnabled).toBe(false)
  })
})

describe('M11e settings', () => {
  it('clamps guideWidth to 1-5 and validates file text color', () => {
    expect(sanitize({ guideWidth: 99 }).guideWidth).toBe(5)
    expect(sanitize({ guideWidth: 0 }).guideWidth).toBe(1)
    expect(sanitize({ guideWidth: 'x' }).guideWidth).toBe(1)
    expect(sanitize({ fileText: 'red', fileTextEnabled: 'y' })).toMatchObject({ fileText: '#D1D5DB', fileTextEnabled: false })
    expect(sanitize({ fileText: '#112233', fileTextEnabled: true })).toMatchObject({ fileText: '#112233', fileTextEnabled: true })
  })
})
