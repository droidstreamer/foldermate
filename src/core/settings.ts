// Settings shape, defaults and validation of whatever data.json contains (PRD section 5).
import { isHex, type FolderColors } from './resolver'

export interface PaletteEntry { id: string; name: string; color: string }
export type ColorMode = 'text' | 'background'
export interface TintSettings {
  schemaVersion: 1
  palette: PaletteEntry[]
  colorMode: ColorMode
  textColor: string
  fadeEnabled: boolean
  activeEnabled: boolean // the open note's row takes the colors below; off = theme
  activeBg: string // '' = theme default
  activeText: string // '' = theme default
  boldFolders: boolean
  guideLines: boolean // Obsidian's indent lines in the explorer
  guideWidth: number // indent line thickness in px, 1-5 (1 = Obsidian's thin line)
  fileTextEnabled: boolean // file names take fileText; off = theme
  fileText: string
  fileAlpha: number // block under a colored folder's contents, % of its color, 0-100 (0 = off)
  revealActive: boolean // reveal the open note in the explorer
  folderColors: FolderColors
}

export const STARTER_PALETTE: PaletteEntry[] = [
  { id: 'c1', name: 'Ocean', color: '#3B82F6' },
  { id: 'c2', name: 'Forest', color: '#16A34A' },
  { id: 'c3', name: 'Sunset', color: '#F97316' },
  { id: 'c4', name: 'Berry', color: '#DB2777' },
  { id: 'c5', name: 'Violet', color: '#8B5CF6' },
  { id: 'c6', name: 'Gold', color: '#EAB308' },
]

export const defaultSettings = (): TintSettings => ({
  schemaVersion: 1,
  palette: STARTER_PALETTE.map(e => ({ ...e })),
  colorMode: 'text',
  textColor: '#FFFFFF',
  fadeEnabled: true,
  activeEnabled: false,
  activeBg: '',
  activeText: '',
  boldFolders: false,
  guideLines: false,
  guideWidth: 1,
  fileTextEnabled: false,
  fileText: '#D1D5DB',
  fileAlpha: 20,
  revealActive: true,
  folderColors: {},
})

// A whole number within [min, max], or the fallback when `v` is not a number.
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Turn untrusted loaded data into valid settings; anything invalid falls back to the default.
export function sanitize(raw: unknown): TintSettings {
  const d = defaultSettings()
  if (!isObj(raw)) return d
  if (Array.isArray(raw.palette)) {
    const seen = new Set<string>()
    d.palette = raw.palette.flatMap((e: unknown) => {
      if (!isObj(e) || typeof e.id !== 'string' || typeof e.name !== 'string' || !isHex(e.color) || seen.has(e.id)) return []
      seen.add(e.id)
      return [{ id: e.id, name: e.name, color: e.color }]
    })
  }
  if (raw.colorMode === 'text' || raw.colorMode === 'background') d.colorMode = raw.colorMode
  if (isHex(raw.textColor)) d.textColor = raw.textColor
  if (isHex(raw.activeBg)) d.activeBg = raw.activeBg
  if (isHex(raw.activeText)) d.activeText = raw.activeText
  // Older data has no toggle: keep the highlight on for anyone who had already chosen a color.
  d.activeEnabled = typeof raw.activeEnabled === 'boolean' ? raw.activeEnabled : d.activeBg !== '' || d.activeText !== ''
  if (typeof raw.fadeEnabled === 'boolean') d.fadeEnabled = raw.fadeEnabled
  if (typeof raw.boldFolders === 'boolean') d.boldFolders = raw.boldFolders
  if (typeof raw.revealActive === 'boolean') d.revealActive = raw.revealActive
  if (typeof raw.guideLines === 'boolean') d.guideLines = raw.guideLines
  if (typeof raw.fileTextEnabled === 'boolean') d.fileTextEnabled = raw.fileTextEnabled
  if (isHex(raw.fileText)) d.fileText = raw.fileText
  d.guideWidth = num(raw.guideWidth, 1, 5, d.guideWidth)
  d.fileAlpha = num(raw.fileAlpha, 0, 100, d.fileAlpha)
  if (isObj(raw.folderColors)) {
    const ids = new Set(d.palette.map(e => e.id))
    for (const [path, id] of Object.entries(raw.folderColors)) if (typeof id === 'string' && ids.has(id)) d.folderColors[path] = id
  }
  return d
}

export const usageCount = (s: TintSettings, id: string) => Object.values(s.folderColors).filter(v => v === id).length

// Delete a palette entry and unassign every folder that used it.
export function removeEntry(s: TintSettings, id: string) {
  s.palette = s.palette.filter(e => e.id !== id)
  for (const [p, v] of Object.entries(s.folderColors)) if (v === id) delete s.folderColors[p]
}

export function addEntry(s: TintSettings): PaletteEntry {
  let n = s.palette.length + 1
  while (s.palette.some(e => e.id === `c${n}`)) n++
  const e = { id: `c${n}`, name: `Color ${n}`, color: '#6B7280' }
  s.palette.push(e)
  return e
}
