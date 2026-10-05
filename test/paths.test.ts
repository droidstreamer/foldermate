import { describe, expect, it } from 'vitest'
import { deleteKeys, prune, renameKeys } from '../src/core/paths'

const make = () => ({ A: '1', 'A/B': '2', 'A/B/C': '3', AB: '4', Z: '5' })

describe('paths', () => {
  it('rename rewrites the folder and assigned descendants only', () => {
    const fc = make()
    expect(renameKeys(fc, 'A', 'X/A2')).toBe(true)
    expect(fc).toEqual({ 'X/A2': '1', 'X/A2/B': '2', 'X/A2/B/C': '3', AB: '4', Z: '5' })
  })
  it('rename of an uncolored folder changes nothing', () => expect(renameKeys(make(), 'Q', 'R')).toBe(false))
  it('rename moves a nested anchor', () => {
    const fc = make()
    renameKeys(fc, 'A/B', 'Z/B')
    expect(fc).toEqual({ A: '1', 'Z/B': '2', 'Z/B/C': '3', AB: '4', Z: '5' })
  })
  it('delete removes the folder and everything beneath, not siblings with a shared prefix', () => {
    const fc = make()
    expect(deleteKeys(fc, 'A')).toBe(true)
    expect(fc).toEqual({ AB: '4', Z: '5' })
  })
  it('prune drops missing folders', () => {
    const fc = make()
    expect(prune(fc, p => p === 'A' || p === 'Z')).toBe(true)
    expect(fc).toEqual({ A: '1', Z: '5' })
  })
})
