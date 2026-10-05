// Keep folderColors keys correct when folders are renamed, moved or deleted (PRD section 7).
import type { FolderColors } from './resolver'

const within = (key: string, folder: string) => key === folder || key.startsWith(folder + '/')

// Rewrite the key of `from` and of every assigned descendant (prefix replace). Returns true if anything changed.
export function renameKeys(fc: FolderColors, from: string, to: string): boolean {
  let changed = false
  for (const key of Object.keys(fc)) {
    if (!within(key, from)) continue
    const id = fc[key]
    delete fc[key]
    fc[to + key.slice(from.length)] = id
    changed = true
  }
  return changed
}

export function deleteKeys(fc: FolderColors, folder: string): boolean {
  let changed = false
  for (const key of Object.keys(fc)) if (within(key, folder)) { delete fc[key]; changed = true }
  return changed
}

// Drop keys whose folder no longer exists (changes made outside Obsidian).
export function prune(fc: FolderColors, exists: (path: string) => boolean): boolean {
  let changed = false
  for (const key of Object.keys(fc)) if (!exists(key)) { delete fc[key]; changed = true }
  return changed
}
