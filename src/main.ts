import { Plugin, TFile, TFolder, debounce } from 'obsidian'
import { ColorModal } from './colorModal'
import { TintSettingTab } from './settings'
import { Renderer } from './renderer'
import { deleteKeys, prune, renameKeys } from './core/paths'
import { sanitize, type TintSettings } from './core/settings'

export default class FolderMatePlugin extends Plugin {
  cfg!: TintSettings
  private saveSoon = debounce(() => void this.saveData(this.cfg), 500, true)

  private renderer = new Renderer(this.app, () => this.cfg)

  async onload() {
    this.cfg = sanitize(await this.loadData())
    this.addSettingTab(new TintSettingTab(this.app, this))
    this.app.workspace.onLayoutReady(() => {
      // Drop assignments whose folder vanished outside Obsidian.
      if (prune(this.cfg.folderColors, p => this.app.vault.getFolderByPath(p) !== null)) this.saveSoon()
      this.refresh()
    })
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      if (file instanceof TFolder && renameKeys(this.cfg.folderColors, oldPath, file.path)) this.changed()
    }))
    this.registerEvent(this.app.vault.on('delete', file => {
      if (file instanceof TFolder && deleteKeys(this.cfg.folderColors, file.path)) this.changed()
    }))
    this.registerEvent(this.app.workspace.on('layout-change', () => this.refresh()))
    // Obsidian's own "Reveal current file in navigation" (expands the parents, scrolls the note into view); not in the public API.
    this.registerEvent(this.app.workspace.on('file-open', file => {
      if (!file || !this.cfg.revealActive) return
      for (const leaf of this.app.workspace.getLeavesOfType('file-explorer')) (leaf.view as { revealInFolder?: (f: TFile) => void }).revealInFolder?.(file)
    }))

    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (!(file instanceof TFolder) || file.isRoot()) return
      menu.addItem(i => i.setTitle('Set folder color').setIcon('palette').onClick(() =>
        new ColorModal(this.app, this.cfg.palette, file.path, id => this.assign(file.path, id)).open()))
      if (this.cfg.folderColors[file.path]) {
        menu.addItem(i => i.setTitle('Remove folder color').setIcon('eraser').onClick(() => this.assign(file.path, null)))
      }
    }))
  }

  onunload() {
    this.renderer.stop()
    void this.saveData(this.cfg)
  }

  assign(path: string, paletteId: string | null) {
    if (paletteId) this.cfg.folderColors[path] = paletteId
    else delete this.cfg.folderColors[path]
    this.changed()
  }

  // Save (debounced) and repaint; call after any settings change.
  changed() {
    this.saveSoon()
    this.refresh()
  }

  refresh() { this.renderer.refresh() }
}
