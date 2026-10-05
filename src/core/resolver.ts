// Pure logic: path -> anchor, level and opacity (PRD sections 3, 4, 6).
// Background opacity (%) per level below the anchor; level 3 and deeper share the last step.
export const FADE_STEPS = [100, 70, 50, 35]

export type FolderColors = Record<string, string>
export interface Resolved { paletteId: string; level: number; anchor: string }

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

// Nearest assigned folder at or above `path`; level = folders between the anchor and `path`.
export function resolve(path: string, folderColors: FolderColors): Resolved | null {
  if (!path || path === '/') return null
  const parts = path.split('/')
  for (let n = parts.length; n > 0; n--) {
    const p = parts.slice(0, n).join('/')
    if (Object.hasOwn(folderColors, p)) return { paletteId: folderColors[p], level: parts.length - n, anchor: p }
  }
  return null
}

// Background opacity 0.35..1.00 at `level` below the anchor.
export function alphaFor(level: number, fade: boolean): number {
  return fade ? FADE_STEPS[Math.min(level, FADE_STEPS.length - 1)] / 100 : 1
}
