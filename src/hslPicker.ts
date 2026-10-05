import { setIcon, type Setting } from 'obsidian'
import { hexToHsl, hslToHex, type Hsl } from './core/color'
import { isHex } from './core/resolver'

const MAX = [360, 100, 100], NAMES = ['Hue', 'Saturation', 'Lightness']

// Same picker as MindmapMate's settings: a swatch button opens a popover with hue, saturation and lightness sliders over
// tracks that show what each would give, a hex field and a Reset button (back to the color it opened with). Every change applies
// at once; Escape or a click outside puts the popover away. `value` must pass isHex.
export function addHslPicker(s: Setting, value: string, onChange: (hex: string) => void) {
  s.controlEl.addClass('tt-color')
  return s.addButton(b => {
    const swatch = b.buttonEl
    swatch.addClass('tt-swatch')
    swatch.setAttribute('aria-label', 'Pick a color')
    swatch.style.setProperty('background', value)
    const doc = swatch.ownerDocument
    let pop: HTMLElement | null = null

    const close = () => {
      pop?.remove(); pop = null
      doc.removeEventListener('mousedown', outside, true); doc.removeEventListener('keydown', esc, true)
    }
    const outside = (e: MouseEvent) => { if (pop && !pop.contains(e.target as Node) && !swatch.contains(e.target as Node)) close() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }

    const open = () => {
      pop = s.controlEl.createDiv({ cls: 'tt-pop' })
      const box = pop.createDiv({ cls: 'tt-hsl' })
      let hsl: Hsl = hexToHsl(value)
      const sliders = NAMES.map((name, i) => {
        const r = box.createEl('input', { type: 'range', cls: 'tt-hsl-track' })
        r.min = '0'; r.max = String(MAX[i]); r.setAttribute('aria-label', name)
        r.addEventListener('input', () => { hsl[i] = Number(r.value); apply(hslToHex(...hsl)) })
        return r
      })
      const row = box.createDiv({ cls: 'tt-row' })
      const preview = row.createSpan({ cls: 'tt-swatch' })
      const hexBox = row.createEl('input', { type: 'text', cls: 'tt-hex' })
      hexBox.setAttribute('aria-label', 'Hex color')
      const commitTyped = () => {
        const v = '#' + hexBox.value.trim().replace(/^#/, '').toUpperCase()
        if (isHex(v)) { hsl = hexToHsl(v); apply(v) } else hexBox.value = value
      }
      hexBox.addEventListener('blur', commitTyped)
      hexBox.addEventListener('keydown', e => { if (e.key === 'Enter') commitTyped() })
      const first = value // what Reset goes back to
      const reset = row.createEl('button', { cls: 'tt-reset' })
      reset.setAttribute('aria-label', 'Reset to the color before')
      setIcon(reset, 'rotate-ccw')
      reset.addEventListener('click', () => { hsl = hexToHsl(first); apply(first) })
      const paint = (hex: string) => {
        value = hex
        const [h, sat, l] = hsl
        swatch.style.setProperty('background', hex)
        preview.style.setProperty('background', hex)
        hexBox.value = hex
        const tracks = [
          `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map(d => `hsl(${d} 100% 50%)`).join(', ')})`,
          `linear-gradient(to right, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`,
          `linear-gradient(to right, hsl(${h} ${sat}% 0%), hsl(${h} ${sat}% 50%), hsl(${h} ${sat}% 100%))`,
        ]
        sliders.forEach((r, i) => { r.value = String(hsl[i]); r.style.setProperty('background', tracks[i]) })
      }
      const apply = (hex: string) => { paint(hex); onChange(hex) }
      paint(value) // show the current color without reporting a change
      doc.addEventListener('mousedown', outside, true); doc.addEventListener('keydown', esc, true)
    }
    b.onClick(() => (pop ? close() : open()))
  })
}
