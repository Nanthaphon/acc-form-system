import type { FormGroup } from '../types/schema'
import { isActive } from '../types/schema'

// Folders go two levels deep: a folder on the first page, and the sub-folders
// inside it (parentId). A form lives in either. Opening a folder, filtering by
// one, or counting what is in one takes in its sub-folders too.

export function topFolders(groups: FormGroup[]): FormGroup[] {
  return groups.filter(g => !g.parentId)
}

export function subfoldersOf(groups: FormGroup[], id: string | undefined): FormGroup[] {
  return id ? groups.filter(g => g.parentId === id) : []
}

export function parentOf(groups: FormGroup[], id: string | undefined): FormGroup | undefined {
  const pid = groups.find(g => g.id === id)?.parentId
  return pid ? groups.find(g => g.id === pid) : undefined
}

// Is a form kept in `folderId` inside `target` — the folder itself or one of its sub-folders?
export function folderIn(groups: FormGroup[], folderId: string | undefined, target: string): boolean {
  if (!folderId) return false
  return folderId === target || groups.find(g => g.id === folderId)?.parentId === target
}

// Open to employees: the folder is on, and so is the one it sits in.
export function folderOpen(groups: FormGroup[], id: string | undefined): boolean {
  const g = groups.find(x => x.id === id)
  if (!g || !isActive(g)) return false
  const parent = g.parentId ? groups.find(x => x.id === g.parentId) : undefined
  return !g.parentId || (!!parent && isActive(parent))
}

// Each folder followed by its own sub-folders, in their sortOrder. The first
// entry is always a first-page folder — the one forms with no folder fall into.
export function orderFolders(groups: FormGroup[]): FormGroup[] {
  const known = new Set(groups.map(g => g.id))
  const bySort = [...groups].sort((a, b) => a.sortOrder - b.sortOrder)
  // A sub-folder whose parent is gone is shown with the first-page folders.
  const tops = bySort.filter(g => !g.parentId || !known.has(g.parentId))
  return tops.flatMap(t => [t, ...bySort.filter(g => g.parentId === t.id)])
}

// "เบิกค่าใช้จ่าย / ค่าเดินทาง" — a sub-folder named with the folder it is in.
export function folderPath(groups: FormGroup[], id: string | undefined): string {
  const g = groups.find(x => x.id === id)
  if (!g) return ''
  const p = parentOf(groups, id)
  return p ? `${p.name} / ${g.name}` : g.name
}

// Sub-folders need supabase/2026-11-02b-subfolders.sql: until it is run the
// rows come without a parentId at all, and none are offered.
export function subfoldersAvailable(groups: FormGroup[]): boolean {
  return groups.length > 0 && groups.every(g => 'parentId' in g)
}
