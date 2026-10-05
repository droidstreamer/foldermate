import { App, Modal, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian'
import type FolderMatePlugin from './main'
import { addEntry, removeEntry, usageCount, type TintSettings } from './core/settings'
import { addHslPicker } from './hslPicker'
import { COFFEE_BUTTON, COFFEE_URL } from './coffeeButton'

class ConfirmModal extends Modal {
  constructor(app: App, private msg: string, private onYes: () => void) { super(app) }
  onOpen() {
    this.setTitle('Delete color?')
    this.contentEl.createEl('p', { text: this.msg })
    new Setting(this.contentEl)
      .addButton(b => b.setButtonText('Delete').setDestructive().onClick(() => { this.onYes(); this.close() }))
      .addButton(b => b.setButtonText('Cancel').onClick(() => this.close()))
  }
  onClose() { this.contentEl.empty() }
}

type Key = Exclude<keyof TintSettings, 'schemaVersion' | 'palette' | 'folderColors'> | 'background'

// Declarative settings (Obsidian 1.13+), so every row shows up in Obsidian's settings search. Plain toggles and sliders are
// `control` rows; rows with the color picker or an indent (tt-sub) are `render` rows built as before.
export class TintSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: FolderMatePlugin) { super(app, plugin); this.containerEl.addClass('tt-settings') }

  getControlValue(key: string): unknown {
    const s = this.plugin.cfg
    return key === 'background' ? s.colorMode === 'background' : s[key as keyof TintSettings]
  }

  setControlValue(key: string, value: unknown) {
    const s = this.plugin.cfg as unknown as Record<string, unknown>
    if (key === 'background') this.plugin.cfg.colorMode = value ? 'background' : 'text'
    else s[key] = value
    if (key === 'activeEnabled' && value) { this.plugin.cfg.activeBg ||= '#3B82F6'; this.plugin.cfg.activeText ||= '#FFFFFF' } // colors the pickers already show, so it works at once
    this.plugin.changed()
    this.refreshDomState() // shows, hides and grays out the rows that depend on this one
  }

  getSettingDefinitions(): SettingDefinitionItem<Key>[] {
    const s = this.plugin.cfg
    const changed = () => this.plugin.changed()
    const picker = (name: string, desc: string, get: () => string, set: (v: string) => void, visible: () => boolean, sub = true) => ({
      name, desc, visible,
      render: (row: Setting) => { if (sub) row.setClass('tt-sub'); addHslPicker(row, get(), v => { set(v); changed() }) },
    })
    const bg = () => s.colorMode === 'background'

    return [
      { name: 'FolderMate', searchable: false, render: row => this.header(row) },
      { type: 'group', items: [
        { name: 'Color folders with a background', desc: 'Off: the palette color becomes the folder text color. On: it becomes a background band and the text uses the color below.', control: { type: 'toggle', key: 'background' } },
        picker('Folder text color', 'Used on every colored folder in background mode.', () => s.textColor, v => { s.textColor = v }, bg),
        { name: 'Fade background by depth', desc: 'Steps 100, 70, 50, then 35% from the third level below the colored folder.', visible: bg,
          render: row => { row.setClass('tt-sub').addToggle(t => t.setValue(s.fadeEnabled).onChange(v => { s.fadeEnabled = v; changed() })) } },
      ] },
      { type: 'group', heading: 'Explorer', items: [
        { name: 'Bold folder names', desc: 'Every folder name in the file explorer is shown in bold.', control: { type: 'toggle', key: 'boldFolders' } },
        { name: 'Indent lines', desc: 'The thin vertical lines beside expanded folders. Off by default: the contents background shows what belongs where.', control: { type: 'toggle', key: 'guideLines' } },
        { name: 'Indent line thickness', desc: 'How thick the indent lines are, 1 to 5 px. Grayed out while Indent lines is off.',
          control: { type: 'slider', key: 'guideWidth', min: 1, max: 5, step: 1, displayFormat: v => `${v} px`, disabled: () => !s.guideLines } },
        { name: 'Contents background opacity', desc: 'Everything inside a colored folder sits on one rounded block of its color, starting at the folder\'s own left edge, so you can see which notes belong to which folder. 0% turns it off. Grayed out while Indent lines is on (one or the other).',
          control: { type: 'slider', key: 'fileAlpha', min: 0, max: 100, step: 5, displayFormat: v => `${v}%`, disabled: () => s.guideLines } },
        { name: 'Color file names', desc: 'Off: file names use the theme text color. On: every file name in the explorer uses the color below (the open note keeps its Active note colors).', control: { type: 'toggle', key: 'fileTextEnabled' } },
        picker('File text color', 'Used on every file name.', () => s.fileText, v => { s.fileText = v }, () => s.fileTextEnabled),
        { name: 'Reveal the open note', desc: 'Each time a note opens, its folders expand in the file explorer and it scrolls into view.', control: { type: 'toggle', key: 'revealActive' } },
      ] },
      { type: 'group', heading: 'Active note', items: [
        { name: 'Color the active note', desc: 'Off: the open note keeps the theme highlight. On: its row uses the colors below.', control: { type: 'toggle', key: 'activeEnabled' } },
        picker('Active background', 'The highlighted row of the open note.', () => s.activeBg || '#3B82F6', v => { s.activeBg = v }, () => s.activeEnabled, false),
        picker('Active text color', 'The highlighted row of the open note.', () => s.activeText || '#FFFFFF', v => { s.activeText = v }, () => s.activeEnabled, false),
      ] },
      { type: 'group', heading: 'Palette', items: [
        { name: 'Palette', aliases: ['colors', 'add color'], render: row => this.palette(row) },
      ] },
    ]
  }

  // Header, the same layout as MindmapMate and LevelMate: name, version and author, what it does, tip line, coffee button.
  private header(row: Setting) {
    const el = row.settingEl
    el.empty()
    el.addClass('tt-about-row')
    const { version, author } = this.plugin.manifest
    const about = el.createDiv({ cls: 'tt-about' })
    about.createDiv({ cls: 'tt-about-name', text: 'FolderMate' })
    about.createDiv({ cls: 'tt-about-title', text: `v${version} · by ${author}` })
    about.createEl('p', {
      text: 'Color a folder and everything inside it in the file explorer. Right-click a folder to give it a color from your palette: its name, its subfolders and its notes take that color, as text or as rounded background bands that fade with depth.',
    })
    about.createDiv({ cls: 'tt-about-tip', text: 'If you enjoy this plugin, please consider a small tip, I would greatly appreciate it!' })
    const footer = about.createDiv({ cls: 'tt-about-footer' })
    footer.createSpan({ text: 'Made with care' })
    const coffee = footer.createEl('a', { cls: 'tt-coffee', href: COFFEE_URL, attr: { target: '_blank', rel: 'noopener', 'aria-label': 'Buy me a coffee' } })
    coffee.createEl('img', { attr: { src: COFFEE_BUTTON, alt: 'Buy me a coffee' } })
  }

  // Palette editor: two columns of name, color and delete, then Add color, on one shared background.
  private palette(row: Setting) {
    const s = this.plugin.cfg
    const el = row.settingEl
    el.empty()
    el.addClass('tt-palette-row')
    const redraw = () => { this.plugin.changed(); this.palette(row) }
    const box = el.createDiv({ cls: 'tt-palette-box' })
    const grid = box.createDiv({ cls: 'tt-palette' })
    for (const e of s.palette) {
      const r = new Setting(grid).addText(t => t.setValue(e.name).onChange(v => { e.name = v; this.plugin.changed() }))
      addHslPicker(r, e.color, v => { e.color = v; this.plugin.changed() })
      r.addExtraButton(b => b.setIcon('trash').setTooltip('Delete').onClick(() => {
        const n = usageCount(s, e.id)
        const del = () => { removeEntry(s, e.id); redraw() }
        if (n) new ConfirmModal(this.app, `"${e.name}" is used by ${n} folder${n === 1 ? '' : 's'}. Deleting it removes the color from them.`, del).open()
        else del()
      }))
    }
    new Setting(box).addButton(b => b.setButtonText('Add color').onClick(() => { addEntry(s); redraw() }))
  }
}
