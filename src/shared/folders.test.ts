import { describe, expect, it } from 'vitest'
import type { FormGroup } from '../types/schema'
import { folderIn, folderOpen, folderPath, orderFolders, subfoldersAvailable, subfoldersOf, topFolders } from './folders'
import { applyFilters, emptyFilters, filterChoices } from './submissionFilter'
import type { FormSettings, SubmissionSummary } from '../types/schema'

const g = (id: string, sortOrder: number, o: Partial<FormGroup> = {}): FormGroup =>
  ({ id, name: id.toUpperCase(), sortOrder, createdAt: 0, active: true, parentId: null, ...o })
const GROUPS = [
  g('sub', 1, { parentId: 'main', name: 'ค่าเดินทาง' }),   // made earlier than its folder sorts — still listed after it
  g('main', 2, { name: 'เบิกค่าใช้จ่าย' }),
  g('dx', 3),
  g('sub2', 4, { parentId: 'dx' }),
]

describe('folders two levels deep', () => {
  it('lists each folder followed by its own sub-folders, a first-page folder first', () => {
    expect(orderFolders(GROUPS).map(x => x.id)).toEqual(['main', 'sub', 'dx', 'sub2'])
  })

  it('a sub-folder whose folder is gone shows with the first-page ones', () => {
    expect(orderFolders([g('a', 1), g('lost', 2, { parentId: 'gone' })]).map(x => x.id)).toEqual(['a', 'lost'])
  })

  it('splits first-page folders from sub-folders', () => {
    expect(topFolders(GROUPS).map(x => x.id)).toEqual(['main', 'dx'])
    expect(subfoldersOf(GROUPS, 'main').map(x => x.id)).toEqual(['sub'])
    expect(subfoldersOf(GROUPS, 'sub')).toEqual([])
  })

  it('a folder takes in what is in its sub-folders, not the other way round', () => {
    expect(folderIn(GROUPS, 'sub', 'main')).toBe(true)
    expect(folderIn(GROUPS, 'main', 'main')).toBe(true)
    expect(folderIn(GROUPS, 'main', 'sub')).toBe(false)
    expect(folderIn(GROUPS, 'sub2', 'main')).toBe(false)
  })

  it('a sub-folder is closed to employees when the folder it is in is closed', () => {
    expect(folderOpen(GROUPS, 'sub')).toBe(true)
    expect(folderOpen(GROUPS.map(x => (x.id === 'main' ? { ...x, active: false } : x)), 'sub')).toBe(false)
    expect(folderOpen(GROUPS.map(x => (x.id === 'sub' ? { ...x, active: false } : x)), 'sub')).toBe(false)
  })

  it('names a sub-folder with its folder', () => {
    expect(folderPath(GROUPS, 'sub')).toBe('เบิกค่าใช้จ่าย / ค่าเดินทาง')
    expect(folderPath(GROUPS, 'main')).toBe('เบิกค่าใช้จ่าย')
  })

  it('offers sub-folders only once the database has the column', () => {
    expect(subfoldersAvailable(GROUPS)).toBe(true)
    expect(subfoldersAvailable([{ id: 'a', name: 'a', sortOrder: 0, createdAt: 0 }])).toBe(false)
  })
})

describe('filtering by a folder with sub-folders', () => {
  const form = (formType: string, groupId: string) => ({ formType, name: formType, title: formType, groupId, active: true, accessGroups: [] }) as unknown as FormSettings
  const FORMS = [form('claim', 'main'), form('taxi', 'sub'), form('dx', 'dx')]
  const row = (id: string, formType: string) => ({ id, formType, docNumber: id, createdAt: 1, createdByEmployeeId: 'e', signatures: [] }) as unknown as SubmissionSummary
  const ROWS = [row('1', 'claim'), row('2', 'taxi'), row('3', 'dx')]
  const formGroup = (ft: string) => FORMS.find(f => f.formType === ft)?.groupId

  it('picking a folder finds the documents of its sub-folders too', () => {
    const got = applyFilters(ROWS, { ...emptyFilters, groupId: 'main' }, { formGroup, groups: GROUPS })
    expect(got.map(r => r.id)).toEqual(['1', '2'])
  })

  it('picking the sub-folder finds only its own', () => {
    const got = applyFilters(ROWS, { ...emptyFilters, groupId: 'sub' }, { formGroup, groups: GROUPS })
    expect(got.map(r => r.id)).toEqual(['2'])
  })

  it('an employee is offered a folder holding a form only through its sub-folder', () => {
    const choices = filterChoices([form('taxi', 'sub')], GROUPS, { isAdmin: false })
    expect(choices.groups.map(x => x.id)).toEqual(['sub', 'main'])
  })
})
