import { App, Modal, PluginSettingTab, Setting } from 'obsidian'
import type FolderMatePlugin from './main'
import { addEntry, removeEntry, usageCount } from './core/settings'
import { addHslPicker } from './hslPicker'
import { COFFEE_BUTTON, COFFEE_URL } from './coffeeButton'

class ConfirmModal extends Modal {
  constructor(app: App, private msg: string, private onYes: () => void) { super(app) }
  onOpen() {
    this.setTitle('Delete color?')
    this.contentEl.createEl('p', { text: this.msg })
    new Setting(this.contentEl)
      .addButton(b => b.setButtonText('Delete').setWarning().onClick(() => { this.onYes(); this.close() }))
      .addButton(b => b.setButtonText('Cancel').onClick(() => this.close()))
  }
  onClose() { this.contentEl.empty() }
}

export class TintSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: FolderMatePlugin) { super(app, plugin) }

  display() {
    const { containerEl: el } = this
    const s = this.plugin.cfg
    el.empty()

    // Header, the same layout as MindmapMate and LevelMate: name, version and author, what it does, tip line, coffee button.
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

    new Setting(el).setName('Color folders with a background')
      .setDesc('Off: the palette color becomes the folder text color. On: it becomes a background band and the text uses the color below.')
      .addToggle(t => t.setValue(s.colorMode === 'background').onChange(v => {
        s.colorMode = v ? 'background' : 'text'
        this.plugin.changed()
        this.display()
      }))

    const bg = s.colorMode === 'background'
    if (bg) { // dependent settings only exist while the background toggle is on, indented under it
      const textRow = new Setting(el).setName('Folder text color').setDesc('Used on every colored folder in background mode.').setClass('tt-sub')
      addHslPicker(textRow, s.textColor, v => { s.textColor = v; this.plugin.changed() })
      new Setting(el).setName('Fade background by depth').setClass('tt-sub')
        .setDesc('Steps 100, 70, 50, then 35% from the third level below the colored folder.')
        .addToggle(t => t.setValue(s.fadeEnabled).onChange(v => { s.fadeEnabled = v; this.plugin.changed() }))
    }

    new Setting(el).setName('Explorer').setHeading()
    new Setting(el).setName('Bold folder names').setDesc('Every folder name in the file explorer is shown in bold.')
      .addToggle(t => t.setValue(s.boldFolders).onChange(v => { s.boldFolders = v; this.plugin.changed() }))
    new Setting(el).setName('Indent lines').setDesc('The thin vertical lines beside expanded folders. Off by default: the contents background shows what belongs where.')
      .addToggle(t => t.setValue(s.guideLines).onChange(v => { s.guideLines = v; this.plugin.changed(); this.display() }))
    new Setting(el).setName('Indent line thickness').setDesc('How thick the indent lines are, 1 to 5 px. Grayed out while Indent lines is off.')
      .addSlider(sl => sl.setLimits(1, 5, 1).setValue(s.guideWidth).setDynamicTooltip().onChange(v => { s.guideWidth = v; this.plugin.changed() }))
      .setDisabled(!s.guideLines)
      .setClass('tt-dim')
    new Setting(el).setName('Contents background opacity').setDesc('Everything inside a colored folder sits on one rounded block of its color, starting at the folder\'s own left edge, so you can see which notes belong to which folder. 0% turns it off. Grayed out while Indent lines is on (one or the other).')
      .addSlider(sl => sl.setLimits(0, 100, 5).setValue(s.fileAlpha).setDynamicTooltip().onChange(v => { s.fileAlpha = v; this.plugin.changed() }))
      .setDisabled(s.guideLines) // after the slider, so it disables it too
      .setClass('tt-dim')
    new Setting(el).setName('Color file names').setDesc('Off: file names use the theme text color. On: every file name in the explorer uses the color below (the open note keeps its Active note colors).')
      .addToggle(t => t.setValue(s.fileTextEnabled).onChange(v => { s.fileTextEnabled = v; this.plugin.changed(); this.display() }))
    if (s.fileTextEnabled) addHslPicker(new Setting(el).setName('File text color').setDesc('Used on every file name.').setClass('tt-sub'), s.fileText, v => { s.fileText = v; this.plugin.changed() })
    new Setting(el).setName('Reveal the open note').setDesc('Each time a note opens, its folders expand in the file explorer and it scrolls into view.')
      .addToggle(t => t.setValue(s.revealActive).onChange(v => { s.revealActive = v; this.plugin.changed() }))

    new Setting(el).setName('Active note').setHeading()
    new Setting(el).setName('Color the active note')
      .setDesc('Off: the open note keeps the theme highlight. On: its row uses the colors below.')
      .addToggle(t => t.setValue(s.activeEnabled).onChange(v => {
        s.activeEnabled = v
        if (v) { s.activeBg ||= '#3B82F6'; s.activeText ||= '#FFFFFF' } // colors the pickers already show, so it works at once
        this.plugin.changed()
        this.display()
      }))
    if (s.activeEnabled) for (const [key, name] of [['activeBg', 'Active background'], ['activeText', 'Active text color']] as const) {
      const row = new Setting(el).setName(name).setDesc('The highlighted row of the open note.')
      addHslPicker(row, s[key] || (key === 'activeBg' ? '#3B82F6' : '#FFFFFF'), v => { s[key] = v; this.plugin.changed() })
    }

    new Setting(el).setName('Palette').setHeading()
    const box = el.createDiv({ cls: 'tt-palette-box' }) // one shared background for every row and the Add button
    const grid = box.createDiv({ cls: 'tt-palette' })
    for (const e of s.palette) {
      const row = new Setting(grid)
        .addText(t => t.setValue(e.name).onChange(v => { e.name = v; this.plugin.changed() }))
      addHslPicker(row, e.color, v => { e.color = v; this.plugin.changed() })
      row
        .addExtraButton(b => b.setIcon('trash').setTooltip('Delete').onClick(() => {
          const n = usageCount(s, e.id)
          const del = () => { removeEntry(s, e.id); this.plugin.changed(); this.display() }
          if (n) new ConfirmModal(this.app, `"${e.name}" is used by ${n} folder${n === 1 ? '' : 's'}. Deleting it removes the color from them.`, del).open()
          else del()
        }))
    }
    new Setting(box).addButton(b => b.setButtonText('Add color').onClick(() => { addEntry(s); this.plugin.changed(); this.display() }))
  }
}
