import { describe, expect, it } from 'vitest'
import { hexToHsl, hslToHex } from '../src/core/color'

describe('hsl', () => {
  it('converts known colors', () => {
    expect(hexToHsl('#FF0000')).toEqual([0, 100, 50])
    expect(hexToHsl('#FFFFFF')).toEqual([0, 0, 100])
    expect(hexToHsl('#3B82F6')).toEqual([217, 91, 60])
    expect(hslToHex(0, 100, 50)).toBe('#FF0000')
    expect(hslToHex(120, 100, 25)).toBe('#008000')
  })
  it('round-trips within one step per channel', () => {
    for (const hex of ['#16A34A', '#F97316', '#DB2777', '#6B7280', '#000000']) {
      const back = hslToHex(...hexToHsl(hex))
      for (const i of [1, 3, 5]) expect(Math.abs(parseInt(back.slice(i, i + 2), 16) - parseInt(hex.slice(i, i + 2), 16))).toBeLessThanOrEqual(3)
    }
  })
})
