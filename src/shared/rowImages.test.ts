import { describe, it, expect } from 'vitest'
import type { ExpenseRow, FormColumn } from '../types/schema'
import { isTextCol } from '../types/schema'
import { computeColumnTotals, computeRow } from '../features/expense-claim/calc'
import { describeChanges } from './versionDiff'
import {
  PENDING_PREFIX, imageValues, isPending, newPendingToken, numberImages, resolvePending, storedImagePaths, withoutImages,
} from './rowImages'

const cols: FormColumn[] = [
  { key: 'name', label: 'PC Name', type: 'text' },
  { key: 'rate', label: 'วันละ', type: 'number' },
  { key: 'book', label: 'หลักฐาน\nเลขบัญชี', type: 'image' },
]
const row = (over: Partial<ExpenseRow> = {}): ExpenseRow => ({ name: '', rate: '', book: '', ...over })

describe('pictures in the table', () => {
  it('an image column is never summed or calculated', () => {
    expect(isTextCol('image')).toBe(true)
    const totals = computeColumnTotals(cols, [row({ rate: 1000, book: 'doc/img-1.jpg' })])
    expect(totals.book).toBeUndefined()
    expect(computeRow(cols, row({ book: 'doc/img-1.jpg' })).book).toBe('doc/img-1.jpg')
  })

  it('tells picked pictures from stored ones', () => {
    const token = newPendingToken()
    expect(token.startsWith(PENDING_PREFIX)).toBe(true)
    expect(isPending(token)).toBe(true)
    expect(isPending('doc/img-1.jpg')).toBe(false)
    const items = [row({ book: token }), row({ book: 'doc/img-1.jpg' }), row()]
    expect(imageValues(cols, items)).toEqual([token, 'doc/img-1.jpg'])
    expect(storedImagePaths(cols, items)).toEqual(['doc/img-1.jpg'])
  })

  it('saving gives each picked picture a path under the document', () => {
    const token = newPendingToken()
    const items = [row({ name: 'นภา', book: token }), row({ book: 'doc-1/img-old.jpg' })]
    const { items: saved, uploads } = resolvePending(cols, items, 'doc-1')
    expect(uploads).toHaveLength(1)
    expect(uploads[0].token).toBe(token)
    expect(uploads[0].path).toMatch(/^doc-1\/img-[0-9a-f-]+\.jpg$/)
    expect(saved[0].book).toBe(uploads[0].path)
    expect(saved[0].name).toBe('นภา')
    expect(saved[1].book).toBe('doc-1/img-old.jpg') // already stored: untouched
    expect(items[0].book).toBe(token)               // the rows passed in are not changed
  })

  it('a copied document starts without the pictures', () => {
    const copy = withoutImages(cols, [row({ name: 'นภา', rate: 900, book: 'doc-1/img.jpg' })])
    expect(copy[0]).toEqual({ name: 'นภา', rate: 900, book: '' })
  })

  it('numbers the pictures row by row, each with what identifies its row', () => {
    const items = [row({ name: 'นภา แสงทอง', book: 'a.jpg' }), row(), row({ book: 'b.jpg' })]
    expect(numberImages(cols, items)).toEqual([
      { no: 1, value: 'a.jpg', row: 1, column: 'หลักฐาน เลขบัญชี', label: 'นภา แสงทอง' },
      { no: 2, value: 'b.jpg', row: 3, column: 'หลักฐาน เลขบัญชี', label: '' },
    ])
  })

  it('version history says a picture was added, not its storage path', () => {
    const header = { subject: '', categories: [], companyId: '', firstName: '', lastName: '', position: '', job: '' }
    const totals = { columnTotals: {}, grandTotal: 0, amountInThaiText: '' }
    const lines = describeChanges(
      { header, items: [row()], totals },
      { header, items: [row({ book: 'doc/img-1.jpg' })], totals },
      cols,
    )
    expect(lines).toContain('รายการที่ 1: หลักฐาน\nเลขบัญชี แนบรูป')
    expect(lines.join(' ')).not.toContain('img-1')
  })
})
