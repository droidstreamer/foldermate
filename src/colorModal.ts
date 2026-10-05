import { App, Modal } from 'obsidian'
import { isHex } from './core/resolver'
import type { PaletteEntry } from './core/settings'

// "Set folder color": lists palette entries (swatch + name); choosing one calls onPick.
export class ColorModal extends Modal {
  constructor(app: App, private palette: PaletteEntry[], private folder: string, private onPick: (id: string) => void) {
    super(app)
  }

  onOpen() {
    this.setTitle(`Folder color: ${this.folder}`)
    if (!this.palette.length) this.contentEl.createEl('p', { text: 'The palette is empty. Add colors in FolderMate settings.' })
    for (const e of this.palette) {
      const row = this.contentEl.createEl('button', { cls: 'tt-modal-row' })
      const swatch = row.createSpan({ cls: 'tt-swatch' })
      if (isHex(e.color)) swatch.style.setProperty('background-color', e.color)
      row.createSpan({ text: e.name })
      row.addEventListener('click', () => { this.onPick(e.id); this.close() })
    }
  }

  onClose() { this.contentEl.empty() }
}
