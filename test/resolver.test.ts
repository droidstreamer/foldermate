import { describe, expect, it } from 'vitest'
import { alphaFor, isHex, resolve } from '../src/core/resolver'

const fc = { Projects: 'c1', 'Projects/Design/Icons': 'c2' }

describe('resolve', () => {
  it('anchor is level 0', () => expect(resolve('Projects', fc)).toEqual({ paletteId: 'c1', level: 0, anchor: 'Projects' }))
  it('counts folders below the anchor', () => expect(resolve('Projects/Design', fc)?.level).toBe(1))
  it('inner anchor wins and restarts at 0', () => {
    expect(resolve('Projects/Design/Icons', fc)).toEqual({ paletteId: 'c2', level: 0, anchor: 'Projects/Design/Icons' })
    expect(resolve('Projects/Design/Icons/A/B', fc)).toEqual({ paletteId: 'c2', level: 2, anchor: 'Projects/Design/Icons' })
  })
  it('uncolored folders and root resolve to null', () => {
    expect(resolve('Other/Sub', fc)).toBeNull()
    expect(resolve('/', fc)).toBeNull()
    expect(resolve('', fc)).toBeNull()
  })
  it('is case-sensitive and ignores prototype keys', () => {
    expect(resolve('projects', fc)).toBeNull()
    expect(resolve('constructor', {})).toBeNull()
  })
  it('does not match a sibling that shares a prefix', () => expect(resolve('Projects2', fc)).toBeNull())
})

describe('alphaFor', () => {
  it('steps 100/70/50/35 and stays at 35 from level 3', () =>
    expect([0, 1, 2, 3, 4, 9].map(l => alphaFor(l, true))).toEqual([1, 0.7, 0.5, 0.35, 0.35, 0.35]))
  it('is 1 at every level when fade is off', () => expect(alphaFor(7, false)).toBe(1))
})

describe('isHex', () => {
  it('accepts #RRGGBB only', () => {
    expect(isHex('#3B82F6')).toBe(true)
    for (const bad of ['3B82F6', '#FFF', '#GGGGGG', 'red', '#3B82F6;x', null, 5]) expect(isHex(bad)).toBe(false)
  })
})
