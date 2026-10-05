// Drives a real Obsidian over the DevTools protocol (same approach as MindmapMate): launch, trust, enable FolderMate, ev(), shot(), check().
// `npm run build` first. Imported by check.mjs (feature checks) and acceptance.mjs (PRD section 11).
// Uses its own profile on ../test-vault; the user's Obsidian is untouched. Screenshots go to $SHOTS (default: os tmpdir).
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

// PORT and VAULT can be overridden (showcase.mjs uses its own vault for the store screenshots).
export const PORT = +(process.env.PORT ?? 9334), VAULT = resolve(process.env.VAULT ?? '../test-vault'), profile = `${tmpdir()}/foldermate-obsidian-profile-${PORT}`, SHOTS = process.env.SHOTS ?? tmpdir()
export const sleep = ms => new Promise(r => setTimeout(r, ms))
const target = async () => (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page' && !t.title.startsWith('Settings'))
try { if (!(await target())) throw 0 } catch {
  mkdirSync(profile, { recursive: true })
  writeFileSync(`${profile}/obsidian.json`, JSON.stringify({ vaults: { [`foldermate${PORT}`]: { path: VAULT, ts: 1, open: true } }, updateDisabled: true }))
  spawn('obsidian', [`--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore' }).unref()
  for (let i = 0; i < 60; i++) { try { if (await target()) break } catch { /* starting */ } await sleep(500) }
}
const ws = new WebSocket((await target()).webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let seq = 0
export const call = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq
  ws.addEventListener('message', function h(e) { const m = JSON.parse(e.data); if (m.id !== id) return; ws.removeEventListener('message', h); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result) })
  ws.send(JSON.stringify({ id, method, params }))
})
export const ev = async src => {
  const r = await call('Runtime.evaluate', { expression: `(async () => { ${src} })()`, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails))
  return r.result.value
}
export const shot = async name => { const r = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('shot', `${SHOTS}/${name}.png`) }
export let failed = 0
export const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? `  (${detail})` : ''}`) }

export const done = () => { console.log(failed ? `${failed} FAILED` : 'all passed'); ws.close(); process.exit(failed ? 1 : 0) }

await sleep(1500)
await ev(`[...document.querySelectorAll('.modal button')].find(b => b.textContent.includes('Trust'))?.click()
  await new Promise(r => setTimeout(r, 300)); await app.plugins.setEnable(true)
  await app.plugins.disablePlugin('foldermate'); await app.plugins.enablePlugin('foldermate'); await new Promise(r => setTimeout(r, 500)); return 1`)
