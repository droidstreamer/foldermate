// Store screenshots and README animation, taken in a real Obsidian on "../showcase-vault/My Vault". `npm run build`, copy dist/
// into that vault's .obsidian/plugins/foldermate/, then `npm run showcase`. Output: ../showcase/ (1200x800 PNGs, demo.gif via make-gif.py).
process.env.VAULT ??= '../showcase-vault/My Vault'; process.env.PORT ??= '9335'
const OUT = process.env.SHOTS ??= '../showcase'
const { PORT, call, ev, sleep } = await import('./drive.mjs')
import { mkdirSync, writeFileSync } from 'node:fs'
mkdirSync(`${OUT}/raw`, { recursive: true })

const W = 1280, H = 800
const size = (w, h, dsf) => call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile: false })
// Raw capture (2x) of a CSS-px region of the main window, kept as a data URL for the composer.
const grab = async (name, clip = { x: 0, y: 0, width: W, height: H }) => {
  const r = await call('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })
  writeFileSync(`${OUT}/raw/${name}.png`, Buffer.from(r.data, 'base64'))
  return `data:image/png;base64,${r.data}`
}
const rect = sel => ev(`const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }`)

const P = `app.plugins.plugins['foldermate']`
const COLORS = { Projects: 'c1', 'Projects/Book Draft': 'c4', Areas: 'c2', Resources: 'c3', Journal: 'c5' }
const OPEN = ['Projects', 'Projects/Website Redesign', 'Projects/Book Draft', 'Areas', 'Resources', 'Journal']
const scene = (cfg, { theme = 'obsidian', open = OPEN } = {}) => ev(`const p = ${P}; p.saveData = async () => {}
  Object.assign(p.cfg, { colorMode: 'background', fadeEnabled: true, guideLines: false, fileAlpha: 35, revealActive: false, activeEnabled: false, folderColors: {} }, ${JSON.stringify(cfg)})
  app.changeTheme(${JSON.stringify(theme)}); document.querySelectorAll('.modal-close-button').forEach(b => b.click()); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.body.click()
  app.workspace.leftSplit.expand(); app.workspace.rightSplit.collapse()
  const fe = app.workspace.getLeavesOfType('file-explorer')[0].view
  for (const it of Object.values(fe.fileItems)) if (it.setCollapsed && !it.collapsed) await it.setCollapsed(true)
  for (const f of ${JSON.stringify(open)}) { const it = fe.fileItems[f]; if (it?.collapsed) await it.setCollapsed(false) }
  if (app.workspace.getActiveFile()?.path !== 'Projects/Website Redesign/Kickoff.md') await app.workspace.getLeaf().openFile(app.vault.getAbstractFileByPath('Projects/Website Redesign/Kickoff.md'))
  p.refresh(); await new Promise(r => setTimeout(r, 700)); return 1`)

// Composer: a full-window overlay at exactly 1200x800, one per store image.
const ACCENT = { blue: ['#1e3a8a', '#3B82F6'], green: ['#14532d', '#16A34A'], orange: ['#7c2d12', '#F97316'], pink: ['#831843', '#DB2777'], violet: ['#4c1d95', '#8B5CF6'] }
const compose = async (name, accent, title, sub, body) => {
  const [deep, bright] = ACCENT[accent]
  await size(1200, 800, 1); await sleep(300)
  await ev(`const o = document.body.createDiv({ cls: 'fm-showcase' }); o.setAttr('style', ${JSON.stringify(`position:fixed;inset:0;z-index:99999;overflow:hidden;font-family:var(--font-interface);color:#fff;
    background:radial-gradient(1100px 700px at 85% 110%, ${bright}55, transparent 60%),radial-gradient(900px 600px at 0% 0%, ${deep}, transparent 70%),#0f1115;`)})
    o.innerHTML = ${JSON.stringify(`
      <div style="position:absolute;left:56px;top:40px;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;letter-spacing:.02em;opacity:.85">
        ${['#3B82F6', '#16A34A', '#F97316', '#DB2777', '#8B5CF6'].map(c => `<span style="width:10px;height:10px;border-radius:3px;background:${c}"></span>`).join('')}
        <span style="margin-left:4px">FolderMate</span></div>
      <div style="position:absolute;left:56px;top:84px;right:56px;font-size:40px;font-weight:700;line-height:1.15;letter-spacing:-.01em">${title}</div>
      <div style="position:absolute;left:56px;top:${title.includes('<br>') ? 186 : 138}px;right:56px;font-size:19px;line-height:1.45;color:#c9cdd6">${sub}</div>
      ${body}`)}; await new Promise(r => setTimeout(r, 400)); return 1`)
  const r = await call('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('frame', `${OUT}/${name}.png`)
  await ev(`document.querySelector('.fm-showcase')?.remove(); return 1`)
  await size(W, H, 2); await sleep(300)
}
const card = (src, css) => `<img src="${src}" style="position:absolute;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08);${css}">`
const pill = (text, color, css) => `<div style="position:absolute;padding:6px 12px;border-radius:999px;font-size:14px;font-weight:600;background:${color};box-shadow:0 8px 24px rgba(0,0,0,.4);${css}">${text}</div>`
const label = (text, css) => `<div style="position:absolute;font-size:16px;font-weight:600;color:#e5e7eb;text-align:center;${css}">${text}</div>`

await size(W, H, 2)

// 1. Hero: the whole app, background bands with depth fade.
await scene({ folderColors: COLORS })
const hero = await grab('hero')
await compose('1-hero', 'blue', 'Color your folders. Find anything at a glance.',
  'Give a folder a color and every subfolder follows. Your file explorer turns from a grey wall into a map.',
  card(hero, 'left:56px;top:200px;width:1088px'))

// 2. Right-click, pick a color.
await scene({ folderColors: COLORS })
await ev(`const el = document.querySelector('.nav-folder-title[data-path="Resources"]'); const r = el.getBoundingClientRect()
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 70, clientY: r.top + 12 })); await new Promise(r => setTimeout(r, 400))
  const it = [...document.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Set folder color')); it.addClass('selected'); return 1`)
const m = await rect('.menu'), fe = await rect('.workspace-leaf-content[data-type="file-explorer"]')
const menuShot = await grab('menu', { x: fe.x, y: m.y - 40, width: m.x + m.width - fe.x + 16, height: m.height + 60 })
await ev(`const it = [...document.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Set folder color'))
  for (const t of ['mousedown','mouseup','click']) it.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true }))
  for (let i = 0; i < 20 && !document.querySelector('.modal'); i++) await new Promise(r => setTimeout(r, 100))
  await new Promise(r => setTimeout(r, 300)); return document.querySelector('.menu-item') ? 'menu still open' : 1`)
const modalShot = await grab('modal', await rect('.modal'))
await ev(`document.querySelector('.modal-close-button')?.click(); return 1`)
await compose('2-right-click', 'orange', 'Right-click. Pick a color. Done.',
  'Set folder color sits right in the folder menu. Colors come from your own palette.',
  card(menuShot, 'left:56px;top:210px;height:540px') + card(modalShot, 'right:56px;top:300px;width:560px') +
  `<svg style="position:absolute;left:470px;top:400px" width="110" height="60"><path d="M5 40 C 40 5, 70 5, 100 25" stroke="#F97316" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M88 14 L101 26 L84 31" stroke="#F97316" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)

// 3. Inheritance and nested groups, zoomed in on Projects; labels sit level with the rows they describe.
await scene({ folderColors: COLORS }, { open: ['Projects', 'Projects/Website Redesign', 'Projects/Book Draft', 'Projects/Book Draft/Chapters'] })
const pr = await rect('.nav-folder-title[data-path="Projects"]'), last = await rect('.nav-file-title[data-path="Projects/Website Redesign/Sitemap.md"]')
const clip3 = { x: pr.x - 4, y: pr.y - 3, width: pr.width + 8, height: last.y + last.height - pr.y + 5 }
const tree = await grab('inherit', clip3)
const k = 548 / clip3.height, rowY = async sel => { const r = await rect(sel); return Math.round(228 + (r.y + r.height / 2 - clip3.y) * k - 16) }
const cardL = Math.round(600 - clip3.width * k / 2), cardR = 1200 - cardL
const L = (t, c, sel) => rowY(sel).then(y => pill(t, c, `right:${cardR + 18}px;top:${y}px`)), R = (t, c, sel) => rowY(sel).then(y => pill(t, c, `left:${cardR + 18}px;top:${y}px`))
await compose('3-inherit', 'pink', 'Subfolders follow along.',
  'Color one folder and everything inside takes it. Give a subfolder its own color and it starts a new group.',
  card(tree, `left:${cardL}px;top:228px;height:548px`) +
  await L('Projects: Ocean', '#3B82F6', '.nav-folder-title[data-path="Projects"]') +
  await L('Book Draft: its own Berry', '#DB2777', '.nav-folder-title[data-path="Projects/Book Draft"]') +
  await R('Fades a little each level', '#334155', '.nav-folder-title[data-path="Projects/Website Redesign/Assets"]') +
  await R('Notes sit on their folder\'s color', '#334155', '.nav-file-title[data-path="Projects/Website Redesign/Launch checklist.md"]'))

// 4. Text mode vs background bands, dark and light.
const OPEN4 = ['Projects', 'Projects/Book Draft', 'Areas', 'Resources', 'Journal']
const explorerGrab = async name => { const a = await rect('.nav-folder-title[data-path="Archive"]'), t = await rect('.nav-folder-title[data-path="Templates"]')
  return grab(name, { x: a.x - 6, y: a.y - 6, width: a.width + 12, height: t.y + t.height - a.y + 12 }) }
await scene({ folderColors: COLORS, colorMode: 'text', fileAlpha: 0 }, { open: OPEN4 }); const text = await explorerGrab('mode-text')
await scene({ folderColors: COLORS }, { open: OPEN4 }); const bands = await explorerGrab('mode-bands')
await scene({ folderColors: COLORS, textColor: '#FFFFFF' }, { open: OPEN4, theme: 'moonstone' }); const light = await explorerGrab('mode-light')
await scene({ folderColors: COLORS })
await compose('4-modes', 'green', 'Text or background bands. Your call.',
  'Color just the folder names, or draw rounded bands. Works with light and dark themes.',
  card(text, 'left:56px;top:228px;width:340px') + card(bands, 'left:430px;top:228px;width:340px') + card(light, 'left:804px;top:228px;width:340px') +
  label('Text mode', 'left:56px;width:340px;top:194px') + label('Background bands', 'left:430px;width:340px;top:194px') + label('Light theme', 'left:804px;width:340px;top:194px'))

// 5. Settings: the Settings window is its own page target.
await scene({ folderColors: COLORS, activeEnabled: true, activeBg: '#8B5CF6', activeText: '#FFFFFF' })
await ev(`app.setting.open(); app.setting.openTabById('foldermate'); await new Promise(r => setTimeout(r, 800)); return 1`)
const st = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page' && t.title.startsWith('Settings'))
const sws = new WebSocket(st.webSocketDebuggerUrl); await new Promise(r => sws.onopen = r)
let sid = 0
const scall = (method, params = {}) => new Promise((res, rej) => { const id = ++sid
  sws.addEventListener('message', function h(e) { const x = JSON.parse(e.data); if (x.id !== id) return; sws.removeEventListener('message', h); x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result) })
  sws.send(JSON.stringify({ id, method, params })) })
await scall('Emulation.setDeviceMetricsOverride', { width: 840, height: 2600, deviceScaleFactor: 2, mobile: false }); await sleep(800)
// Just the FolderMate pane (no Obsidian sidebar), as three cards: header + mode, Active note, Palette.
const sv = async src => { const r = await scall('Runtime.evaluate', { expression: `(() => { ${src} })()`, returnByValue: true }); return r.result.value }
const box = await sv(`const c = document.querySelector('.vertical-tab-content'), r = c.getBoundingClientRect(), items = [...c.querySelectorAll('.setting-item')]
  const at = t => items.find(h => h.querySelector('.setting-item-name')?.textContent === t).getBoundingClientRect()
  const add = [...c.querySelectorAll('button')].find(b => b.textContent === 'Add color').getBoundingClientRect()
  return { x: r.x + 24, w: r.width - 48, top: r.y + 8, fade: at('Fade background by depth').bottom, act: at('Active note').top, actEnd: at('Palette').top, pal: at('Palette').top, end: add.bottom }`)
const sgrab = async (name, y0, y1) => { const r = await scall('Page.captureScreenshot', { format: 'png', clip: { x: box.x - 12, y: y0, width: box.w + 24, height: y1 - y0, scale: 1 } })
  writeFileSync(`${OUT}/raw/${name}.png`, Buffer.from(r.data, 'base64')); return `data:image/png;base64,${r.data}` }
const head = await sgrab('settings-top', box.top, box.fade + 14), act = await sgrab('settings-active', box.act - 8, box.actEnd - 4), pal = await sgrab('settings-palette', box.pal - 8, box.end + 16)
sws.close(); await ev(`app.setting.close(); return 1`)
await compose('5-settings', 'violet', 'Make it yours.',
  'Your own palette, depth fade, bold names, active-note colors. Nothing in your notes ever changes.',
  card(head, 'left:56px;top:205px;width:540px') + card(pal, 'right:56px;top:205px;width:520px') + card(act, 'right:56px;top:430px;width:520px'))

// 6. README animation frames: folders pick up color one by one, then the modes. scripts/make-gif.py turns them into demo.gif.
await scene({}, { open: OPEN4 })
const g0 = await rect('.nav-folder-title[data-path="Archive"]'), g1 = await rect('.nav-folder-title[data-path="Templates"]')
const gclip = { x: g0.x - 6, y: g0.y - 6, width: g0.width + 12, height: g1.y + g1.height - g0.y + 12 }
const steps = [[{}, 'obsidian'], [{ Projects: 'c1' }], [{ Projects: 'c1', Areas: 'c2' }], [{ Projects: 'c1', Areas: 'c2', Resources: 'c3' }],
  [{ Projects: 'c1', Areas: 'c2', Resources: 'c3', Journal: 'c5' }], [COLORS], [COLORS, 'obsidian', 'text'], [COLORS, 'moonstone']]
for (const [i, [colors, theme = 'obsidian', mode = 'background']] of steps.entries()) {
  await scene({ folderColors: colors, colorMode: mode, fileAlpha: mode === 'text' ? 0 : 35 }, { open: OPEN4, theme })
  await grab(`gif-${i}`, gclip)
}
await scene({ folderColors: COLORS })
process.exit(0)
