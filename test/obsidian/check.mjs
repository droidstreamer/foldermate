// Feature checks for M8 and M9 in a real Obsidian. `npm run build` first, then `npm run obsidian:check`.
import { PORT, SHOTS, call, check, done, ev, shot, sleep } from './drive.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { knobCentre } from './knob.mjs'

// Keep the vault's data.json untouched; settings below live in memory.
await ev(`const p = app.plugins.plugins['foldermate']; p.saveData = async () => {}
  Object.assign(p.cfg, { colorMode: 'background', fadeEnabled: true, textColor: '#FFFFFF', guideLines: true, folderColors: {
    'Fixtures/Projects': 'c1', 'Fixtures/Projects/Design': 'c2', 'Fixtures/Projects/Design/Icons': 'c3', 'Fixtures/Projects/Design/Icons/Sketches': 'c4', 'Fixtures/Projects/Design/Icons/Sketches/Drafts': 'c5' } })
  app.workspace.leftSplit.expand(); await app.workspace.getLeaf().setViewState({ type: 'empty' })
  app.workspace.getLeavesOfType('file-explorer')[0] ?? await app.workspace.getLeftLeaf(false).setViewState({ type: 'file-explorer' })
  await new Promise(r => setTimeout(r, 400))
  const fe = app.workspace.getLeavesOfType('file-explorer')[0].view
  for (const p of ['Fixtures','Fixtures/Projects','Fixtures/Projects/Design','Fixtures/Projects/Design/Icons','Fixtures/Projects/Design/Icons/Sketches','Fixtures/Projects/Design/Icons/Sketches/Drafts']) { const it = fe.fileItems[p]; if (it?.collapsed) await it.setCollapsed(false) }
  p.refresh(); await new Promise(r => setTimeout(r, 600)); return 1`)

// Geometry of every colored row: band left vs caret, band right vs row right, guide color, alpha.
const rows = await ev(`return [...document.querySelectorAll('.nav-files-container .nav-folder-title.tt-bg')].map(r => {
  const b = getComputedStyle(r, '::before'), rr = r.getBoundingClientRect(), caret = r.querySelector('.collapse-icon')?.getBoundingClientRect()
  const up = r.closest('.nav-folder-children'), kids = r.parentElement.querySelector(':scope > .nav-folder-children'), kb = kids && getComputedStyle(kids)
  return { path: r.dataset.path, left: parseFloat(b.left), width: parseFloat(b.width), rowW: rr.width, caretLeft: caret ? caret.left - rr.left : null, top: b.top, h: parseFloat(b.height), rowH: rr.height,
    mb: parseFloat(getComputedStyle(r).marginBottom), radius: b.borderTopLeftRadius, bg: b.backgroundColor, guide: kb && kb.borderLeftColor, lineX: kids ? kids.getBoundingClientRect().left - rr.left : null, parentLine: up ? up.getBoundingClientRect().left - rr.left + 1 : 0 } })`)
console.table(rows)
check('every expanded colored row is painted (7 or more)', rows.length >= 7, rows.length)
check('every band has rounded corners', rows.every(r => r.radius === '6px'))
check('band runs to the row edge', rows.every(r => Math.abs(r.left + r.width - r.rowW) < 1.5))
check('band is full row height', rows.every(r => Math.abs(r.h - r.rowH) < 1.5))
check('band starts just before the caret (level 1 and deeper alike)', rows.slice(1).every(r => r.caretLeft - r.left > 2 && r.caretLeft - r.left < 12), rows.map(r => Math.round(r.caretLeft - r.left)).join(','))
check('band starts right of the parent indent line', rows.slice(1).every(r => r.left >= r.parentLine), rows.map(r => `${Math.round(r.left)}>=${Math.round(r.parentLine)}`).join(' '))
check('gap of at least 2px between rows', rows.every(r => r.mb >= 2))
check('alpha steps differ for levels 0-3', new Set(rows.slice(0, 4).map(r => r.bg)).size === 4)
check('guide line takes the folder color', rows.filter(r => r.lineX !== null).every(r => r.guide && r.guide !== 'rgba(0, 0, 0, 0)'), rows.map(r => r.guide).join(' '))
await shot('m8-background')

// M11: clicking a note in the explorer must show the Active background from the first frame, never a theme color first.
await ev(`const p = app.plugins.plugins['foldermate']; Object.assign(p.cfg, { activeEnabled: true, activeBg: '#FF00FF', activeText: '#00FF00' }); p.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
const flash = await ev(`const rows = [...document.querySelectorAll('.nav-files-container .nav-file-title')].filter(r => !r.classList.contains('is-active'))
  const out = []
  for (const row of [rows[0], rows[1]]) {
    const seen = []; let on = true
    const sample = () => { const a = document.querySelector('.nav-files-container .nav-file-title.is-active'); if (a) seen.push(getComputedStyle(a).backgroundColor); if (on) requestAnimationFrame(sample) }
    row.click(); sample(); await new Promise(r => setTimeout(r, 800)); on = false
    out.push([...new Set(seen)])
  }
  return out`)
check('active note shows the Active background from the first frame (M11)', flash.every(s => s.length === 1 && s[0] === 'rgb(255, 0, 255)'), JSON.stringify(flash))
await ev(`const p = app.plugins.plugins['foldermate']; p.cfg.activeEnabled = false; p.refresh(); return 1`)

// M9: disabled options, active colors, settings UI.
await ev(`const p = app.plugins.plugins['foldermate']; const f = app.vault.getFiles()[0]; if (f) await app.workspace.getLeaf().openFile(f)
  p.cfg.activeBg = '#FF00FF'; p.cfg.activeText = '#00FF00'; p.cfg.activeEnabled = false; p.refresh(); await new Promise(r => setTimeout(r, 1500)); return 1`) // M10 reveal flashes the row for about a second
const act = await ev(`const a = document.querySelector('.nav-files-container .nav-file-title.is-active'); if (!a) return null; const c = getComputedStyle(a); return { bg: c.backgroundColor, fg: c.color }`)
const actOff = act
await ev(`const p = app.plugins.plugins['foldermate']; p.cfg.activeEnabled = true; p.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
const act2 = await ev(`const a = document.querySelector('.nav-files-container .nav-file-title.is-active'); const c = getComputedStyle(a); return { bg: c.backgroundColor, fg: c.color }`)
check('active note toggle off: the row keeps the theme colors (round 22)', actOff && actOff.bg !== 'rgb(255, 0, 255)' && actOff.fg !== 'rgb(0, 255, 0)', JSON.stringify(actOff))
check('active note row takes the chosen colors', act2 && act2.bg === 'rgb(255, 0, 255)' && act2.fg === 'rgb(0, 255, 0)', JSON.stringify(act2))
await ev(`app.setting.open(); app.setting.openTabById('foldermate'); await new Promise(r => setTimeout(r, 500)); return 1`)
const dis = async () => ev(`return [...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].filter(s => /Folder text color|Fade background/.test(s.textContent)).map(s => ({ t: s.querySelector('.setting-item-name').textContent, sub: s.classList.contains('tt-sub') }))`)
let d = await dis()
check('options shown, indented under the toggle, in background mode (M11)', d.length === 2 && d.every(x => x.sub), JSON.stringify(d))
await ev(`const t = [...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => /Color folders with a background/.test(s.textContent)).querySelector('.checkbox-container'); t.click(); await new Promise(r => setTimeout(r, 400)); return 1`)
d = await dis()
check('options hidden in text mode (M11)', d.length === 0, JSON.stringify(d))
check("no What's new heading", !(await ev(`return /What's new/.test(app.setting.activeTab.containerEl.textContent)`)))
await ev(`app.setting.activeTab.containerEl.querySelectorAll('button[style*="border-left"]')[3]?.click(); await new Promise(r => setTimeout(r, 400)); return 1`)
// Same picker as MindmapMate: a swatch opens a popover (in the Settings window) with three sliders, a hex field and an eyedropper; a pick applies live.
const pop = () => ev(`const c = app.setting.activeTab.containerEl; return { sliders: c.querySelectorAll('.tt-pop input[type=range]').length, hex: c.querySelector('.tt-pop .tt-hex')?.value, eye: !!c.querySelector('.tt-pop .tt-eyedropper'), reset: !!c.querySelector('.tt-pop .tt-reset') }`)
await ev(`app.setting.activeTab.containerEl.querySelectorAll('.tt-palette button.tt-swatch')[0].click(); await new Promise(r => setTimeout(r, 300)); return 1`)
await ev(`app.setting.activeTab.containerEl.querySelector('.tt-pop').scrollIntoView({ block: 'center' }); return 1`)
const opened = await pop()
check('picker popover opens with three sliders, hex field and Reset, no eyedropper (round 22)', opened.sliders === 3 && opened.hex === '#3B82F6' && !opened.eye && opened.reset, JSON.stringify(opened))
const st = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page' && t.title.startsWith('Settings'))
{ // the knobs sit centred on the tracks (pixel check, in the settings window)
  const w = new WebSocket(st.webSocketDebuggerUrl); await new Promise(r => w.onopen = r); let n = 0
  const wcall = (method, params = {}) => new Promise(r => { const id = ++n; w.addEventListener('message', function h(e) { const m = JSON.parse(e.data); if (m.id === id) { w.removeEventListener('message', h); r(m.result) } }); w.send(JSON.stringify({ id, method, params })) })
  const wev = async src => (await wcall('Runtime.evaluate', { expression: `(async () => { ${src} })()`, awaitPromise: true, returnByValue: true })).result.value
  for (const [i, name] of ['hue', 'saturation', 'lightness'].entries()) {
    const k = await knobCentre(wcall, wev, `document.querySelectorAll('.tt-pop .tt-hsl-track')[${i}]`)
    check(`picker ${name} knob is centred on its track`, Math.abs(k.knob - k.track) <= 1, `knob ${k.knob.toFixed(2)}px, track ${k.track}px`)
  }
  w.close()
}
if (st) {
  const w = new WebSocket(st.webSocketDebuggerUrl); await new Promise(r => w.onopen = r)
  const data = await new Promise(r => { w.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m.result.data) }; w.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } })) })
  writeFileSync(`${SHOTS}/m9-picker.png`, Buffer.from(data, 'base64')); console.log('shot', `${SHOTS}/m9-picker.png`); w.close()
}
async function settingsShot(name) {
  const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page' && t.title.startsWith('Settings'))
  if (!t) return
  const w = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => w.onopen = r)
  const data = await new Promise(r => { w.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m.result.data) }; w.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } })) })
  writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64')); console.log('shot', `${SHOTS}/${name}.png`); w.close()
}
// Typing a hex sets the color live; Reset goes back to the color the picker opened with.
const picked = await ev(`const c = app.setting.activeTab.containerEl, p = app.plugins.plugins['foldermate']
  const hb = c.querySelector('.tt-pop .tt-hex'); hb.value = 'ff8800'; hb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise(r => setTimeout(r, 200))
  const viaHex = p.cfg.palette[0].color
  c.querySelector('.tt-pop .tt-reset').click(); await new Promise(r => setTimeout(r, 200))
  return { viaHex, afterReset: p.cfg.palette[0].color, hex: c.querySelector('.tt-pop .tt-hex').value }`)
check('typed hex sets the color live; Reset puts it back', picked.viaHex === '#FF8800' && picked.afterReset === '#3B82F6' && picked.hex === '#3B82F6', JSON.stringify(picked))
await ev(`const c = app.setting.activeTab.containerEl; c.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(r => setTimeout(r, 200)); return 1`)
check('Escape puts the popover away', (await pop()).sliders === 0)
// Round 22: the Active note toggle hides the color rows and turns the highlight off; turning it on seeds colors so it works at once.
const tog = async () => ev(`const c = app.setting.activeTab.containerEl, t = [...c.querySelectorAll('.setting-item')].find(s => /Color the active note/.test(s.textContent)); return { has: !!t, rows: [...c.querySelectorAll('.setting-item-name')].filter(n => /^Active (background|text color)$/.test(n.textContent)).length, on: t?.querySelector('.checkbox-container')?.classList.contains('is-enabled') }`)
const t1 = await tog()
await ev(`const t = [...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => /Color the active note/.test(s.textContent)).querySelector('.checkbox-container'); t.click(); await new Promise(r => setTimeout(r, 400)); return 1`)
const t2 = await tog(), bodyOff = await ev(`return document.body.classList.contains('tt-active-bg')`)
await ev(`const t = [...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => /Color the active note/.test(s.textContent)).querySelector('.checkbox-container'); t.click(); await new Promise(r => setTimeout(r, 400)); return 1`)
const t3 = await tog(), bodyOn = await ev(`return document.body.classList.contains('tt-active-bg')`)
check('Active note toggle: on shows both color rows, off hides them and clears the highlight (round 22)', t1.has && t1.on && t1.rows === 2 && !t2.on && t2.rows === 0 && !bodyOff && t3.on && t3.rows === 2 && bodyOn, JSON.stringify([t1, t2, bodyOff, t3, bodyOn]))

// M10 settings screen: header, two-column palette, round swatches.
const prefs = await ev(`const c = app.setting.activeTab.containerEl, g = c.querySelector('.tt-palette'), items = g ? [...g.children] : []
  const b = items.slice(0, 2).map(i => i.getBoundingClientRect())
  return { name: c.querySelector('.tt-about-name')?.textContent, title: c.querySelector('.tt-about-title')?.textContent, desc: !!c.querySelector('.tt-about p'),
    entries: items.length, sameRow: b.length === 2 && Math.abs(b[0].top - b[1].top) < 2 && b[1].left > b[0].right,
    round: [...c.querySelectorAll('button.tt-swatch')].every(x => getComputedStyle(x).borderRadius === '50%'), swatches: c.querySelectorAll('button.tt-swatch').length,
    explorer: ['Bold folder names', 'Indent lines', 'Indent line thickness', 'Contents background opacity', 'Reveal the open note'].every(n => c.textContent.includes(n)) && !/Indent line opacity|Folder rails/.test(c.textContent),
    fileMin: c.querySelector('.setting-item:has(.setting-item-name) input[type=range]') && [...c.querySelectorAll('.setting-item')].find(s => /Contents background opacity/.test(s.textContent)).querySelector('input[type=range]').min,
    box: (() => { const bx = c.querySelector('.tt-palette-box'), add = bx && [...bx.querySelectorAll('button')].find(x => x.textContent === 'Add color'), last = g && g.lastElementChild; return !!add && !!last && bx.contains(add) && add.getBoundingClientRect().top - last.getBoundingClientRect().bottom > 2 && getComputedStyle(bx).backgroundColor !== 'rgba(0, 0, 0, 0)' })() }`)
const VER = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url))).version
check(`Preferences header: name, "v${VER} · by Droid", description (M10)`, prefs.name === 'FolderMate' && prefs.title === `v${VER} · by Droid` && prefs.desc, JSON.stringify(prefs))
const hdr = await ev(`const c = app.setting.activeTab.containerEl, tip = c.querySelector('.tt-about-tip'), f = c.querySelector('.tt-about-footer'), img = f?.querySelector('img')
  return { tip: tip?.textContent, tipLeft: !!tip && ['left','start'].includes(getComputedStyle(tip).textAlign), end: !!f && getComputedStyle(f).justifyContent === 'flex-end',
    order: f ? [...f.children].map(x => x.tagName + ':' + (x.textContent || '')).join('|') : '', imgH: img ? Math.round(img.getBoundingClientRect().height) : 0,
    below: !!tip && !!f && f.getBoundingClientRect().top >= tip.getBoundingClientRect().bottom, href: f?.querySelector('a')?.getAttribute('href') }`)
check('header matches MindmapMate: tip line, then "Made with care" beside the 30px coffee button, right-aligned', hdr.tip === 'If you enjoy this plugin, please consider a small tip, I would greatly appreciate it!' && hdr.tipLeft && hdr.end && hdr.order === 'SPAN:Made with care|A:' && hdr.imgH === 30 && hdr.below && hdr.href === 'https://buymeacoffee.com/droidstreamer', JSON.stringify(hdr))
check('palette in two columns (M10)', prefs.entries >= 2 && prefs.sameRow, JSON.stringify(prefs))
check('every swatch is round (M10)', prefs.swatches > 0 && prefs.round, prefs.swatches)
check('Explorer section: Indent lines toggle replaces the two sliders, no rails (M11)', prefs.explorer)
check('Contents background opacity slider reaches 0% (M11)', prefs.fileMin === '0', prefs.fileMin)
check('palette rows and Add color share one box (M11)', prefs.box)
// M11d (USB note): Indent lines and Contents background are one or the other: lines on grays the slider out and no blocks are drawn.
const excl = async () => ev(`const c = app.setting.activeTab.containerEl, row = n => [...c.querySelectorAll('.setting-item')].find(s => s.querySelector('.setting-item-name')?.textContent === n)
  const sl = row('Contents background opacity'); return { lines: row('Indent lines').querySelector('.checkbox-container').classList.contains('is-enabled'), gray: sl.classList.contains('is-disabled') && +getComputedStyle(sl).opacity < 0.6, sliderOff: sl.querySelector('input[type=range]').disabled, blocks: document.querySelectorAll('.nav-files-container .tt-block').length }`)
const clickLines = () => ev(`[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => s.querySelector('.setting-item-name')?.textContent === 'Indent lines').querySelector('.checkbox-container').click(); await new Promise(r => setTimeout(r, 400)); return 1`)
const e1 = await excl(); await clickLines(); const e2 = await excl(); await clickLines(); const e3 = await excl()
const [eOn, eOff] = e1.lines ? [e1, e2] : [e2, e1]
check('Indent lines on: Contents background opacity grayed out and no blocks drawn (M11d)', eOn.lines && eOn.gray && eOn.sliderOff && eOn.blocks === 0, JSON.stringify(eOn))
check('Indent lines off: the slider is usable again and blocks return (M11d)', !eOff.lines && !eOff.gray && !eOff.sliderOff && eOff.blocks > 0, JSON.stringify(eOff))
check('toggling twice restores the starting state (M11d)', e3.lines === e1.lines && e3.gray === e1.gray, JSON.stringify([e1, e3]))
await ev(`[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => s.querySelector('.setting-item-name')?.textContent === 'Indent lines').scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200)); return 1`)
await settingsShot('m11d-lines-' + (e3.lines ? 'on' : 'off'))
await ev(`app.setting.activeTab.containerEl.querySelector('.tt-about').scrollIntoView(); await new Promise(r => setTimeout(r, 200)); return 1`)
await settingsShot('m10-prefs-top')
await ev(`app.setting.activeTab.containerEl.querySelector('.tt-palette').scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200)); return 1`)
await settingsShot('m10-prefs-palette')
await ev(`app.setting.close(); return 1`)

// M11 explorer (user mockup PNG): one opaque block per colored folder under its open contents, from the folder's own band edge to
// the right edge; nested colored folders cover their parent's block. Indent lines off by default. Bold. Reveal.
const F = `app.plugins.plugins['foldermate']`
await ev(`Object.assign(${F}.cfg, { colorMode: 'background', fileAlpha: 20, boldFolders: false, revealActive: true, guideLines: false }); ${F}.refresh(); await new Promise(r => setTimeout(r, 400)); return 1`)
const blocks = await ev(`return ['Fixtures/Projects', 'Fixtures/Projects/Design', 'Fixtures/Projects/Design/Icons'].map(path => {
  const row = document.querySelector('.nav-folder-title[data-path="' + path + '"]'), kids = row.parentElement.querySelector(':scope > .nav-folder-children')
  const b = getComputedStyle(kids, '::before'), band = getComputedStyle(row, '::before'), rr = row.getBoundingClientRect(), kr = kids.getBoundingClientRect()
  return { path, on: row.parentElement.classList.contains('tt-block'), left: Math.round(kr.left + parseFloat(b.left)), bandLeft: Math.round(rr.left + parseFloat(band.left)),
    right: Math.round(kr.right - parseFloat(b.right)), rowRight: Math.round(rr.right), top: Math.round(kr.top), bottom: Math.round(kr.bottom - parseFloat(b.bottom)), bg: b.backgroundColor, radius: b.borderTopLeftRadius } })`)
console.table(blocks)
check('each open colored folder has a contents block (M11 mockup)', blocks.every(b => b.on), JSON.stringify(blocks.map(b => b.on)))
check("block starts at the folder's own band edge and runs to the right edge", blocks.every(b => Math.abs(b.left - b.bandLeft) < 1.5 && Math.abs(b.right - b.rowRight) < 1.5), blocks.map(b => `${b.left}/${b.bandLeft} ${b.right}/${b.rowRight}`).join(' '))
check('nested block starts further right, leaving the parent a column down the left', blocks[1].left > blocks[0].left && blocks[2].left > blocks[1].left, blocks.map(b => b.left).join(','))
check('nested block lies inside its parent block, so it covers it', blocks[2].top >= blocks[1].top && blocks[2].bottom <= blocks[1].bottom)
check('blocks are opaque (a nested color does not mix with its parent) and rounded', blocks.every(b => !/\/ 0\.|rgba/.test(b.bg) && b.radius === '6px'), blocks.map(b => b.bg).join(' '))
check('no per-file blocks any more', !(await ev(`return document.querySelectorAll('.nav-files-container .tt-file').length`)))
const guide = async path => ev(`const row = document.querySelector('.nav-folder-title[data-path="${path}"]'); const k = getComputedStyle(row.parentElement.querySelector(':scope > .nav-folder-children')); return k.borderInlineStartColor`)
check('indent lines hidden by default (M11)', /rgba\(0, 0, 0, 0\)|transparent/.test(await guide('Fixtures')) && /rgba\(0, 0, 0, 0\)|transparent/.test(await guide('Fixtures/Projects/Design')))
await shot('m11-blocks')
await ev(`${F}.cfg.guideLines = true; ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
check('Indent lines toggle on shows them again', !/rgba\(0, 0, 0, 0\)|transparent/.test(await guide('Fixtures')), await guide('Fixtures'))
await ev(`${F}.cfg.guideLines = false; ${F}.refresh(); return 1`)
const off = await ev(`${F}.cfg.fileAlpha = 0; ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); const n = document.querySelectorAll('.nav-files-container .tt-block').length; ${F}.cfg.fileAlpha = 20; ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); return n`)
check('contents background 0% turns the blocks off', off === 0, off)
// M11c (user note on the mockup): at 100% a folder's contents sit on exactly the color its own band shows. One green parent,
// subfolders inherit it faded: each subfolder's block is its own faded band color, not the parent's.
const keep = await ev(`return ${F}.cfg.folderColors`)
const same = await ev(`Object.assign(${F}.cfg, { fileAlpha: 100, fadeEnabled: true, folderColors: { 'Fixtures/Projects': 'c2' } }); ${F}.refresh(); await new Promise(r => setTimeout(r, 400))
  const out = ['Fixtures/Projects', 'Fixtures/Projects/Design', 'Fixtures/Projects/Design/Icons'].map(path => { const row = document.querySelector('.nav-folder-title[data-path="' + path + '"]')
    return { path, band: getComputedStyle(row, '::before').backgroundColor, block: getComputedStyle(row.parentElement.querySelector(':scope > .nav-folder-children'), '::before').backgroundColor } })
  return out`)
console.table(same)
check('at 100% each folder block is exactly its own band color, faded subfolders included (M11c)', same.every(b => b.block === b.band), JSON.stringify(same))
check('a faded subfolder block differs from its parent block (M11c)', new Set(same.map(b => b.block)).size === 3, same.map(b => b.block).join(' '))
await shot('m11c-100-fade')
await ev(`${F}.cfg.folderColors = ${JSON.stringify(keep)}; ${F}.cfg.fileAlpha = 20; ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
// Active note inside a colored folder shows exactly the Active background (no block tint, no flash).
const inFolder = await ev(`Object.assign(${F}.cfg, { activeEnabled: true, activeBg: '#FF00FF', activeText: '#00FF00' }); ${F}.refresh()
  const row = document.querySelector('.nav-file-title[data-path="Fixtures/Projects/Design/brief.md"]'); const seen = []; let on = true
  const sample = () => { if (row.classList.contains('is-active')) seen.push(getComputedStyle(row).backgroundColor); if (on) requestAnimationFrame(sample) }
  row.click(); requestAnimationFrame(sample); await new Promise(r => setTimeout(r, 800)); on = false; return [...new Set(seen)]`)
check('active note in a colored folder shows exactly the Active background (M11)', inFolder.length === 1 && inFolder[0] === 'rgb(255, 0, 255)', JSON.stringify(inFolder))
await shot('m11-active-in-folder')
await ev(`${F}.cfg.activeEnabled = false; ${F}.cfg.boldFolders = true; ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
const bold = await ev(`return getComputedStyle(document.querySelector('.nav-folder-title[data-path="Fixtures/Projects"] .nav-folder-title-content')).fontWeight`)
check('bold folder names', Number(bold) >= 600, bold)
await ev(`${F}.cfg.boldFolders = false; ${F}.refresh(); return 1`)
const rev = async on => ev(`${F}.cfg.revealActive = ${on}; const fe = app.workspace.getLeavesOfType('file-explorer')[0].view
  await app.workspace.getLeaf().setViewState({ type: 'empty' }); await fe.fileItems['Fixtures/Projects/Design'].setCollapsed(true); await new Promise(r => setTimeout(r, 300))
  await app.workspace.getLeaf().openFile(app.vault.getFileByPath('Fixtures/Projects/Design/Icons/icon-list.md'), { active: true }); await new Promise(r => setTimeout(r, 600))
  const row = document.querySelector('.nav-file-title[data-path="Fixtures/Projects/Design/Icons/icon-list.md"]'), box = document.querySelector('.nav-files-container').getBoundingClientRect(), rr = row?.getBoundingClientRect()
  return { expanded: !fe.fileItems['Fixtures/Projects/Design'].collapsed, inView: !!rr && rr.top >= box.top && rr.bottom <= box.bottom, focusInExplorer: !!document.activeElement?.closest('.nav-files-container') }`)
const r0 = await rev(false), r1 = await rev(true)
check('reveal off: a collapsed folder stays collapsed', !r0.expanded, JSON.stringify(r0))
check('reveal on: opening a note expands its folders and scrolls it into view, focus stays out of the explorer', r1.expanded && r1.inView && !r1.focusInExplorer, JSON.stringify(r1))

// M11e (USB notes): indent lines join the folder band, thickness slider, file text color.
await ev(`Object.assign(${F}.cfg, { colorMode: 'background', fadeEnabled: true, guideLines: true, guideWidth: 1, fileTextEnabled: false }); ${F}.refresh(); await new Promise(r => setTimeout(r, 400)); return 1`)
const join = () => ev(`return ['Fixtures/Projects', 'Fixtures/Projects/Design'].map(path => { const row = document.querySelector('.nav-folder-title[data-path="' + path + '"]'), kids = row.parentElement.querySelector(':scope > .nav-folder-children'), cs = getComputedStyle(kids)
  return { gap: Math.round((kids.getBoundingClientRect().top - row.getBoundingClientRect().bottom) * 10) / 10, line: cs.borderInlineStartColor, band: getComputedStyle(row, '::before').backgroundColor, w: parseFloat(cs.borderInlineStartWidth) + parseFloat(cs.boxShadow.match(/(-?[0-9.]+)px/)?.[1] ?? 0), left: Math.round(kids.getBoundingClientRect().left * 10) / 10 } })`)
const j1 = await join()
check('indent line starts at the bottom of its folder band, no gap (M11e)', j1.every(j => j.gap <= 0), JSON.stringify(j1.map(j => j.gap)))
check("indent line is the same color as its folder's band (M11e)", j1.every(j => j.line === j.band), JSON.stringify(j1.map(j => [j.line, j.band])))
await shot('m11e-lines-joined')
await ev(`${F}.cfg.guideWidth = 5; ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
const j5 = await join()
check('thickness slider thickens the line without shifting rows (M11e)', j5[0].w >= 4.5 && j1[0].w < 2 && j5.every((j, i) => j.left === j1[i].left), JSON.stringify([j1.map(j => j.w), j5.map(j => j.w), j5.map(j => j.left)]))
await shot('m11e-lines-thick')
await ev(`${F}.cfg.guideWidth = 1; ${F}.refresh(); return 1`)
const ft = () => ev(`return [...document.querySelectorAll('.nav-files-container .nav-file-title:not(.is-active)')].slice(0, 6).map(r => getComputedStyle(r.querySelector('.nav-file-title-content')).color)`)
const ftOff = await ft()
await ev(`Object.assign(${F}.cfg, { fileTextEnabled: true, fileText: '#FF8800' }); ${F}.refresh(); await new Promise(r => setTimeout(r, 300)); return 1`)
const ftOn = await ft()
check('file text color applies to every file name, and is off by default (M11e)', ftOn.length > 0 && ftOn.every(c => c === 'rgb(255, 136, 0)') && ftOff.every(c => c !== 'rgb(255, 136, 0)'), JSON.stringify([ftOff, ftOn]))
await shot('m11e-file-text')
await ev(`${F}.cfg.fileTextEnabled = false; ${F}.refresh(); return 1`)
await ev(`app.setting.open(); app.setting.openTabById('foldermate'); await new Promise(r => setTimeout(r, 500)); return 1`)
const ui = () => ev(`const c = app.setting.activeTab.containerEl, row = n => [...c.querySelectorAll('.setting-item')].find(s => s.querySelector('.setting-item-name')?.textContent === n), th = row('Indent line thickness')
  return { th: !!th, thOff: th?.querySelector('input[type=range]').disabled, picker: !!row('File text color') }`)
const u1 = await ui()
check('Indent line thickness slider exists and is usable while lines are on; no file picker while File names off (M11e)', u1.th && !u1.thOff && !u1.picker, JSON.stringify(u1))
await clickLines()
const u2 = await ui()
check('Indent line thickness grayed out while Indent lines is off (M11e)', u2.thOff, JSON.stringify(u2))
await clickLines()
await ev(`[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => s.querySelector('.setting-item-name')?.textContent === 'Color file names').querySelector('.checkbox-container').click(); await new Promise(r => setTimeout(r, 400)); return 1`)
const u3 = await ui()
check('turning Color file names on shows the File text color picker (M11e)', u3.picker, JSON.stringify(u3))
await ev(`[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(s => s.querySelector('.setting-item-name')?.textContent === 'Indent line thickness').scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200)); return 1`)
await settingsShot('m11e-settings')
await ev(`app.setting.close(); ${F}.cfg.fileTextEnabled = false; ${F}.refresh(); return 1`)
done()
