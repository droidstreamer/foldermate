import type { App } from 'obsidian'
import { alphaFor, isHex, resolve } from './core/resolver'
import type { TintSettings } from './core/settings'

// All explorer selectors live here (see docs/M0-dom-spike.md).
const ROW = '.nav-folder-title[data-path]'
const CLASSES = ['tt-text', 'tt-bg']
const PROPS = ['--tt-color', '--tt-bg', '--tt-alpha', '--tt-left']
const GUIDE = '--nav-indentation-guide-color'
const BLOCK = ['--tt-block-left', '--tt-block-bg', '--tt-block-alpha']
// Nested rows are indented with inline padding; the band starts this far left of the text: just before the caret, right of the parent's indent line.
// ponytail: measured live in the default theme (the caret sits 20px left of the indent, the parent's indent line 8px left of the caret); re-tune if a theme changes the caret or indent size.
const CARET_SPAN = 26

// Marks folder rows in every file-explorer pane with classes and CSS custom properties; styles.css paints them.
export class Renderer {
  private observers = new Map<HTMLElement, MutationObserver>()
  private sig = new WeakMap<HTMLElement, string>()
  private frame = 0

  constructor(private app: App, private getSettings: () => TintSettings) {}

  // Re-sync observers with the open explorer panes, then re-mark every row.
  refresh() {
    this.paintActive()
    const roots = new Set<HTMLElement>()
    for (const leaf of this.app.workspace.getLeavesOfType('file-explorer')) roots.add(leaf.view.containerEl)
    for (const [el, ob] of this.observers) {
      if (!roots.has(el)) { ob.disconnect(); this.observers.delete(el) }
    }
    for (const el of roots) {
      if (!this.observers.has(el)) {
        const ob = new MutationObserver(() => this.schedule())
        ob.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] }) // style: Obsidian sets row indents after creating rows
        this.observers.set(el, ob)
      }
      this.paint(el)
    }
  }

  private schedule() {
    if (this.frame) return
    this.frame = window.requestAnimationFrame(() => { this.frame = 0; for (const el of this.observers.keys()) this.paint(el) })
  }

  // Explorer-wide settings and active-note colors go on <body>; styles.css reads the colors only while their class is set.
  private paintActive() {
    const s = this.getSettings()
    document.body.classList.toggle('tt-bold', s.boldFolders)
    document.body.classList.toggle('tt-noguides', !s.guideLines)
    document.body.classList.toggle('tt-file-text', s.fileTextEnabled && isHex(s.fileText))
    document.body.style.setProperty('--tt-file-text', s.fileText)
    document.body.style.setProperty('--tt-line-w', s.guideWidth - 1 + 'px') // drawn inside the line's box, so layout never shifts
    for (const [key, cls, prop] of [['activeBg', 'tt-active-bg', '--tt-active-bg'], ['activeText', 'tt-active-text', '--tt-active-text']] as const) {
      const on = s.activeEnabled && isHex(s[key])
      document.body.classList.toggle(cls, on)
      if (on) document.body.style.setProperty(prop, s[key])
      else document.body.style.removeProperty(prop)
    }
  }

  private paint(root: HTMLElement) {
    const s = this.getSettings()
    const colors = new Map(s.palette.map(e => [e.id, e.color]))
    const text = isHex(s.textColor) ? s.textColor : '#FFFFFF'
    const leftOf = (row: HTMLElement) => Math.max(0, (parseFloat(row.style.paddingInlineStart || row.style.paddingLeft) || 0) - CARET_SPAN) // root rows have no inline padding
    root.querySelectorAll<HTMLElement>(ROW).forEach(row => {
      const r = resolve(row.dataset.path ?? '', s.folderColors)
      const hex = r && colors.get(r.paletteId)
      if (!r || !hex || !isHex(hex)) return this.clear(row)
      const left = leftOf(row), fade = alphaFor(r.level, s.fadeEnabled)
      this.block(row, hex, left, s.guideLines ? 0 : Math.round(s.fileAlpha * (s.colorMode === 'text' ? 1 : fade))) // at 100% the block is exactly the folder's own band color; none while indent lines are on
      const sig = s.colorMode === 'text' ? `t${hex}` : `b${hex}${left}${fade}${text}`
      if (this.sig.get(row) === sig) return
      this.sig.set(row, sig)
      this.clear(row, false)
      // The indent line takes the color its folder's band shows (faded like the band), so line and band read as one piece.
      row.parentElement?.style.setProperty(GUIDE, s.colorMode === 'text' ? hex : `color-mix(in srgb, ${hex} ${Math.round(fade * 100)}%, var(--background-secondary))`)
      if (s.colorMode === 'text') {
        row.classList.add('tt-text')
        row.style.setProperty('--tt-color', hex)
      } else {
        row.classList.add('tt-text', 'tt-bg')
        row.parentElement?.classList.add('tt-banded') // styles.css: the indent line joins the band
        row.style.setProperty('--tt-left', left + 'px')
        row.style.setProperty('--tt-color', text)
        row.style.setProperty('--tt-bg', hex)
        row.style.setProperty('--tt-alpha', Math.round(fade * 100) + '%')
      }
    })
  }

  // Contents block (user mockup): everything inside a colored folder (own or inherited color) sits on one rounded block of the color its band shows, from its own band's
  // left edge to the right edge, the full height of its open children. Opaque, so a nested colored folder's block covers its
  // parent's; what stays visible of the parent is a column down the left. Painted by styles.css on the children box.
  private block(row: HTMLElement, hex: string, left: number, alpha: number) {
    const folder = row.parentElement, kids = folder?.querySelector<HTMLElement>(':scope > .nav-folder-children')
    if (!folder || !kids || !alpha || !kids.querySelector('.tree-item-self[data-path]')) return this.noBlock(folder)
    const offset = kids.getBoundingClientRect().left - row.getBoundingClientRect().left // rows span the full width, the children box is indented
    const sig = `${hex}${left}${offset}${alpha}`
    if (this.sig.get(folder) === sig) return
    this.sig.set(folder, sig)
    folder.classList.add('tt-block')
    folder.style.setProperty('--tt-block-left', left - offset + 'px')
    folder.style.setProperty('--tt-block-bg', hex)
    folder.style.setProperty('--tt-block-alpha', alpha + '%')
  }

  private noBlock(folder: HTMLElement | null | undefined) {
    if (!folder?.classList.contains('tt-block')) return
    folder.classList.remove('tt-block')
    for (const p of BLOCK) folder.style.removeProperty(p)
    this.sig.delete(folder)
  }

  private clear(row: HTMLElement, forget = true) {
    row.classList.remove(...CLASSES)
    if (row.matches(ROW)) row.parentElement?.classList.remove('tt-banded')
    if (row.matches(ROW) && forget) { row.parentElement?.style.removeProperty(GUIDE); this.noBlock(row.parentElement) }
    for (const p of PROPS) row.style.removeProperty(p)
    if (forget) this.sig.delete(row)
  }

  // Remove everything the plugin added (FR-11).
  stop() {
    document.body.classList.remove('tt-active-bg', 'tt-active-text', 'tt-bold', 'tt-noguides', 'tt-file-text')
    for (const p of ['--tt-active-bg', '--tt-active-text', '--tt-file-text', '--tt-line-w']) document.body.style.removeProperty(p)
    window.cancelAnimationFrame(this.frame)
    this.frame = 0
    for (const [el, ob] of this.observers) {
      ob.disconnect()
      el.querySelectorAll<HTMLElement>(ROW).forEach(row => this.clear(row))
    }
    this.observers.clear()
  }
}
