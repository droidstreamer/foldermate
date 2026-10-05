// PRD section 11 acceptance criteria, one check each, in a real Obsidian on ../test-vault (5+ nesting levels).
// `npm run build` first, then `npm run obsidian:acceptance`. Restores the vault's data.json and removes its temp folders when done.
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const VAULT = resolve('../test-vault'), DATA = `${VAULT}/.obsidian/plugins/foldermate/data.json`
const original = readFileSync(DATA, 'utf8')
const PATHS = ['Fixtures/Deep', 'Fixtures/Deep/L1', 'Fixtures/Deep/L1/L2', 'Fixtures/Deep/L1/L2/L3', 'Fixtures/Deep/L1/L2/L3/L4', 'Fixtures/Deep/L1/L2/L3/L4/L5']
mkdirSync(`${VAULT}/${PATHS.at(-1)}`, { recursive: true })
// Restart test: colors are written to disk before Obsidian starts and must come back painted.
const seeded = { schemaVersion: 1, colorMode: 'text', textColor: '#FFFFFF', fadeEnabled: true,
  folderColors: { 'Fixtures/Projects': 'c1', 'Fixtures/Projects/Design/Icons': 'c2', 'Fixtures/Deep': 'c3' } }
writeFileSync(DATA, JSON.stringify(seeded))
try { execSync('pkill -f "[t]inttree-obsidian-profile"') } catch { /* none running */ }
await new Promise(r => setTimeout(r, 2500))

const { SHOTS, call, check, done, ev, sleep } = await import('./drive.mjs')
const cleanup = () => { writeFileSync(DATA, original); rmSync(`${VAULT}/Fixtures/Deep`, { recursive: true, force: true }); rmSync(`${VAULT}/Fixtures/TT Temp`, { recursive: true, force: true }) }
process.on('exit', cleanup)
const P = `app.plugins.plugins['foldermate']`
const settle = (ms = 400) => sleep(ms)
// Expand every folder in the explorer, then repaint.
const expandAll = () => ev(`const fe = app.workspace.getLeavesOfType('file-explorer')[0].view
  for (const p of Object.keys(fe.fileItems).sort()) { const it = fe.fileItems[p]; if (it.collapsed !== undefined && it.collapsed && p !== '/') await it.setCollapsed(false) }
  ${P}.refresh(); await new Promise(r => setTimeout(r, 500)); return 1`)
// One row's look: classes, text color, band (pseudo) background and offsets, caret and icon color.
const look = path => ev(`const r = document.querySelector('.nav-files-container .nav-folder-title[data-path="${path}"]'); if (!r) return null
  const b = getComputedStyle(r, '::before'), c = getComputedStyle(r), caret = r.querySelector('.collapse-icon svg')
  return { cls: [...r.classList].filter(x => x.startsWith('tt-')), color: c.color, name: getComputedStyle(r.querySelector('.nav-folder-title-content')).color, caret: caret && getComputedStyle(caret).color,
    bandBg: b.backgroundColor === 'rgba(0, 0, 0, 0)' ? null : b.backgroundColor, left: parseFloat(b.left), right: parseFloat(b.right), shadow: b.boxShadow, bg: c.backgroundColor, fade: c.getPropertyValue('--tt-alpha') ? parseFloat(c.getPropertyValue('--tt-alpha')) / 100 : null, w: r.getBoundingClientRect().width }`)
const alpha = s => { const m = /\/ ([\d.]+)\)$/.exec(s ?? ''); return s ? (m ? +m[1] : 1) : null }
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})` }

await ev(`app.workspace.leftSplit.expand(); app.workspace.getLeavesOfType('file-explorer')[0] ?? await app.workspace.getLeftLeaf(false).setViewState({ type: 'file-explorer' }); await new Promise(r => setTimeout(r, 400)); return 1`)
await expandAll()

// 11. Restart: colors from disk are painted with no action taken.
const OCEAN = '#3B82F6', FOREST = '#16A34A', SUNSET = '#F97316'
let l = await look('Fixtures/Projects'), li = await look('Fixtures/Projects/Design/Icons')
check('restart: saved colors are restored and painted', l?.color === rgb(OCEAN) && li?.color === rgb(FOREST), `${l?.color} ${li?.color}`)
await ev(`${P}.saveData = async () => {}; return 1`) // nothing below may reach the vault's data.json

// 1. Right-click menu on a folder and on a file.
const menuFor = sel => ev(`const r = document.querySelector('${sel}'); const b = r.getBoundingClientRect()
  r.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: b.left + 30, clientY: b.top + 8 })); await new Promise(res => setTimeout(res, 300))
  const t = [...document.querySelectorAll('.menu .menu-item-title')].map(x => x.textContent); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.body.click(); await new Promise(res => setTimeout(res, 200)); return t`)
const fm = await menuFor('.nav-folder-title[data-path="Fixtures/Projects/Code"]'), fl = await menuFor('.nav-file-title[data-path="Fixtures/Projects/notes.md"]')
check('right-click: folders show Set folder color, files do not', fm.includes('Set folder color') && !fl.includes('Set folder color'), `${fm.length} vs ${fl.length} items`)
check('right-click: colored folder also offers Remove folder color', (await menuFor('.nav-folder-title[data-path="Fixtures/Projects"]')).includes('Remove folder color'))

// 3. Text mode (the seeded mode): names, carets and icons take the color, no backgrounds, subfolders inherit.
const code = await look('Fixtures/Projects/Code'), old = await look('Fixtures/Projects/Design/Icons/Sketches')
check('text mode: folder and subfolders colored (name, caret), no background bands', code.name === rgb(OCEAN) && code.caret === rgb(OCEAN) && old.name === rgb(FOREST) && code.bandBg === null && !code.cls.includes('tt-bg'), JSON.stringify([code.name, code.caret, code.cls, old.name, code.bandBg]))

// 4. Switching modes is immediate and keeps assignments.
const before = await ev(`return JSON.stringify(${P}.cfg.folderColors)`)
await ev(`${P}.cfg.colorMode = 'background'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const bgRow = await look('Fixtures/Projects/Code')
await ev(`${P}.cfg.colorMode = 'text'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const back = await look('Fixtures/Projects/Code')
check('switching Text/Background updates at once and keeps all assignments', bgRow.cls.includes('tt-bg') && bgRow.bandBg !== null && back.bandBg === null && before === await ev(`return JSON.stringify(${P}.cfg.folderColors)`))

// 2, 5, 9: background mode; full row, collapsed and expanded, global text color on names, carets, icons; files unchanged.
await ev(`${P}.cfg.colorMode = 'background'; ${P}.cfg.textColor = '#FFFF00'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
l = await look('Fixtures/Projects')
check('background mode: the folder is colored across its full row', l.bandBg && l.left >= 0 && Math.abs(l.right) < 1.5 && alpha(l.bandBg) === 1, JSON.stringify([l.left, l.right]))
await ev(`const fe = app.workspace.getLeavesOfType('file-explorer')[0].view; await fe.fileItems['Fixtures/Projects/Design/Icons/Sketches'].setCollapsed(true); await new Promise(r => setTimeout(r, 300)); return 1`)
const coll = await look('Fixtures/Projects/Design/Icons/Sketches'), exp = await look('Fixtures/Projects/Design/Icons')
check('collapsed and expanded subfolders show the same color, band starting near the caret', coll.bandBg && exp.bandBg && coll.left > 0 && coll.fade === (await look('Fixtures/Projects/Design/Icons/Sketches')).fade && coll.cls.join() === exp.cls.join(), `${coll.bandBg} / ${exp.bandBg}`)
const file = await ev(`const f = document.querySelector('.nav-file-title[data-path="Fixtures/Projects/notes.md"]'); return { cls: [...f.classList].filter(x => x.startsWith('tt-')), color: getComputedStyle(f).color, inline: f.getAttribute('style') }`)
// M11 amends FR-7: files sit on their folder's contents block (painted on the folder), and never take the folder text color.
check('global text color on folder names and carets; file text is unchanged (M11: files sit on the folder block)', l.name === rgb('#FFFF00') && l.caret === rgb('#FFFF00') && file.cls.length === 0 && !/--tt-color/.test(file.inline ?? '') && file.color !== rgb('#FFFF00'), JSON.stringify([l.name, l.caret, file]))
await ev(`const fe = app.workspace.getLeavesOfType('file-explorer')[0].view; await fe.fileItems['Fixtures/Projects/Design/Icons/Sketches'].setCollapsed(false); return 1`)

// 6, 7, 8: fade steps on a 6-deep chain, fade off, inner anchor restarts. Bands are opaque since M11c (fade mixed with the explorer
// background), so the step is read from --tt-alpha.
await ev(`${P}.refresh(); await new Promise(r => setTimeout(r, 400)); return 1`)
const chain = async () => Promise.all(PATHS.map(async p => (await look(p))?.fade))
const on = await chain()
check('fade on: levels 0-3 are 100/70/50/35%, deeper levels stay 35%', on.map(a => Math.round(a * 100)).join() === '100,70,50,35,35,35', on.join())
await ev(`${P}.cfg.fadeEnabled = false; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const off = await chain()
check('fade off: every level 100%', off.every(a => a === 1), off.join())
await ev(`${P}.cfg.fadeEnabled = true; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const inner = [await look('Fixtures/Projects/Design'), await look('Fixtures/Projects/Design/Icons'), await look('Fixtures/Projects/Design/Icons/Sketches')].map(x => x.fade)
check('a subfolder with its own color restarts the fade at 100%', inner.join() === '0.7,1,0.7', inner.join())

// 10. Live updates: palette color, text color, fade toggle.
await ev(`${P}.cfg.palette.find(e => e.id === 'c1').color = '#FF0000'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const red = await look('Fixtures/Projects')
await ev(`${P}.cfg.textColor = '#00FFFF'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const cyan = await look('Fixtures/Projects')
await ev(`${P}.cfg.fadeEnabled = false; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
const noFade = (await look('Fixtures/Projects/Code')).fade
await ev(`${P}.cfg.fadeEnabled = true; ${P}.cfg.palette.find(e => e.id === 'c1').color = '${OCEAN}'; ${P}.cfg.textColor = '#FFFFFF'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
check('changing palette color, text color or fade updates the explorer at once', /1 0 0|255, 0, 0|0\.98|srgb 1 0 0/.test(red.bandBg) && cyan.name === rgb('#00FFFF') && noFade === 1, JSON.stringify([red.bandBg, cyan.name, noFade]))

// 12. Rename, move, delete.
await ev(`await app.vault.createFolder('Fixtures/TT Temp'); await app.vault.createFolder('Fixtures/TT Temp/A'); await app.vault.createFolder('Fixtures/TT Temp/B')
  ${P}.assign('Fixtures/TT Temp/A', 'c4'); return 1`)
await ev(`await app.fileManager.renameFile(app.vault.getFolderByPath('Fixtures/TT Temp/A'), 'Fixtures/TT Temp/A2'); return 1`)
const keys = () => ev(`return Object.keys(${P}.cfg.folderColors).filter(k => k.includes('TT Temp'))`)
const k1 = await keys()
await ev(`await app.fileManager.renameFile(app.vault.getFolderByPath('Fixtures/TT Temp/A2'), 'Fixtures/TT Temp/B/A2'); return 1`)
const k2 = await keys()
await ev(`await app.vault.delete(app.vault.getFolderByPath('Fixtures/TT Temp/B'), true); await new Promise(r => setTimeout(r, 300)); return 1`)
const k3 = await keys()
check('rename and move keep the assignment; delete removes it', k1.join() === 'Fixtures/TT Temp/A2' && k2.join() === 'Fixtures/TT Temp/B/A2' && k3.length === 0, [k1, k2, k3].map(k => k.join('|') || '-').join(' -> '))

// 13. Hover and selected remain visible on colored rows.
await ev(`const r = document.querySelector('.nav-folder-title[data-path="Fixtures/Projects/Code"]'); r.scrollIntoView(); return 1`)
const pt = await ev(`const b = document.querySelector('.nav-folder-title[data-path="Fixtures/Projects/Code"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }`)
await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y }); await settle(200)
const hov = await ev(`const r = document.querySelector('.nav-folder-title[data-path="Fixtures/Projects/Code"]'); return { f: getComputedStyle(r).filter, hover: r.matches(':hover') }`)
await ev(`document.querySelector('.nav-folder-title[data-path="Fixtures/Projects/Code"]').classList.add('is-active'); return 1`)
const sel = await look('Fixtures/Projects/Code')
await ev(`document.querySelector('.nav-folder-title[data-path="Fixtures/Projects/Code"]').classList.remove('is-active'); return 1`)
check('hover and selected states stay visible on colored rows', hov.hover && /brightness/.test(hov.f) && sel.shadow !== 'none', JSON.stringify([hov, sel.shadow]))

// 15. Light and dark, default theme and one community theme (Minimal, CSS only, in test-vault/.obsidian/themes).
const geometry = tag => ev(`const r = document.querySelector('.nav-folder-title[data-path="Fixtures/Projects/Design/Icons"]'), b = getComputedStyle(r, '::before'), n = r.querySelector('.nav-folder-title-content')
  const rr = r.getBoundingClientRect(), bandRight = parseFloat(b.left) + parseFloat(b.width)
  return { band: b.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(b.width) > 50, flush: Math.abs(bandRight - rr.width) < 2, radius: b.borderTopLeftRadius, text: getComputedStyle(n).color, left: parseFloat(b.left), theme: app.customCss.theme, mode: document.body.classList.contains('theme-light') ? 'light' : 'dark', css: !!document.querySelector('style[data-theme], style#theme-css, style') }`)
const themes = {}
for (const [name, scheme, theme] of [['default-dark', 'obsidian', ''], ['default-light', 'moonstone', ''], ['minimal-dark', 'obsidian', 'Minimal'], ['minimal-light', 'moonstone', 'Minimal']]) {
  await ev(`app.customCss.setTheme('${theme}'); app.changeTheme('${scheme}'); await new Promise(r => setTimeout(r, 900)); ${P}.refresh(); await new Promise(r => setTimeout(r, 500)); return 1`)
  themes[name] = await geometry(name)
  themes[name].expect = `${theme}|${scheme === 'moonstone' ? 'light' : 'dark'}`
  await ev(`return 1`)
  const r = await call('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${SHOTS}/accept-${name}.png`, Buffer.from(r.data, 'base64'))
}
await ev(`app.customCss.setTheme(''); app.changeTheme('obsidian'); await new Promise(r => setTimeout(r, 600)); return 1`)
const ok = Object.entries(themes).every(([, t]) => t.expect === `${t.theme}|${t.mode}` && t.band && t.flush && t.radius === '6px' && t.text === rgb('#FFFFFF'))
check('works in light and dark, default theme and one community theme (Minimal)', ok, Object.entries(themes).map(([k, t]) => `${k}:${t.band && t.flush ? 'ok' : JSON.stringify(t)}`).join(' '))

// 16. No network: nothing but the app's own app:// files loads while the plugin reloads and renders.
await call('Network.enable')
const seen = []
const { ws } = await import('./drive.mjs').then(m => ({ ws: m }))
await ev(`window.__reqs = []; const po = new PerformanceObserver(l => l.getEntries().forEach(e => window.__reqs.push(e.name))); po.observe({ entryTypes: ['resource'] }); window.__po = po
  await app.plugins.disablePlugin('foldermate'); await app.plugins.enablePlugin('foldermate'); ${P}.saveData = async () => {}; ${P}.refresh(); await new Promise(r => setTimeout(r, 1500)); return 1`)
const reqs = await ev(`return window.__reqs.filter(u => !/^(app|data|blob|file):/.test(u))`)
const src = readFileSync('src/main.ts', 'utf8') + readFileSync('src/renderer.ts', 'utf8')
check('no network requests during a session', reqs.length === 0 && !/fetch\(|XMLHttpRequest|WebSocket|requestUrl/.test(src), reqs.join(', ') || 'none')

// 14. Disabling the plugin leaves no classes, styles or properties.
await ev(`${P}.cfg.activeBg = '#FF00FF'; ${P}.cfg.colorMode = 'background'; ${P}.changed(); await new Promise(r => setTimeout(r, 300)); return 1`)
await ev(`await app.plugins.disablePlugin('foldermate'); await new Promise(r => setTimeout(r, 500)); return 1`)
const left = await ev(`const q = s => document.querySelectorAll(s).length
  return { classes: q('[class*="tt-"]'), inline: q('[style*="--tt-"]') + q('[style*="indentation-guide"]'), bodyClasses: [...document.body.classList].filter(c => c.startsWith('tt-')), bodyStyle: document.body.getAttribute('style') ?? '' }`)
check('disabling the plugin removes all colors, classes and styles', left.classes === 0 && left.inline === 0 && !left.bodyClasses.length && !/--tt-/.test(left.bodyStyle), JSON.stringify(left))
await ev(`await app.plugins.enablePlugin('foldermate'); return 1`)

// 17. Unit tests.
let unit = ''
try { unit = execSync('npm test 2>&1', { encoding: 'utf8' }) } catch (e) { unit = e.stdout ?? String(e) }
check('unit tests for the resolver and fade formula pass', /Tests\s+\d+ passed/.test(unit) && !/failed/.test(unit), (/Tests\s+[^\n]*/.exec(unit) ?? [''])[0])
done()
