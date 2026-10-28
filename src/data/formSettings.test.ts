import { describe, expect, it, vi } from 'vitest'
import { duplicateRow, settingsRow, writeSkippingMissing } from './formSettings'
import type { FormSettings } from '../types/schema'

const missing = (col: string) => ({ error: { code: 'PGRST204', message: `Could not find the '${col}' column of 'form_settings' in the schema cache` } })
const ok = { error: null }

describe('writeSkippingMissing', () => {
  it('writes once when every column exists', async () => {
    const write = vi.fn().mockResolvedValue(ok)
    expect(await writeSkippingMissing(write, { a: 1, b: 2 })).toEqual([])
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('drops each column the database lacks and retries', async () => {
    const write = vi.fn()
      .mockResolvedValueOnce(missing('accessGroups'))
      .mockResolvedValueOnce(missing('updatedAt'))
      .mockResolvedValueOnce(ok)
    const skipped = await writeSkippingMissing(write, { name: 'x', accessGroups: ['g1'], updatedAt: 1 })
    expect(skipped).toEqual(['accessGroups', 'updatedAt'])
    expect(write).toHaveBeenLastCalledWith({ name: 'x' })
  })

  it('rethrows any other error', async () => {
    const err = { code: '42501', message: 'permission denied' }
    await expect(writeSkippingMissing(vi.fn().mockResolvedValue({ error: err }), { a: 1 })).rejects.toBe(err)
  })

  it('rethrows when the reported column is not in the row (no endless retry)', async () => {
    const write = vi.fn().mockResolvedValue(missing('zzz'))
    await expect(writeSkippingMissing(write, { a: 1 })).rejects.toMatchObject({ code: 'PGRST204' })
    expect(write).toHaveBeenCalledTimes(1)
  })
})

describe('settingsRow', () => {
  // The ลำดับ width is stored in a whole-number column; 23% of the table is
  // 43.7mm, and sending that made the database refuse the whole save.
  it('writes the ลำดับ width as whole millimetres', () => {
    expect(settingsRow({ seqWidth: 43.7 } as FormSettings).seqWidth).toBe(44)
    expect(settingsRow({ seqWidth: 9.5 } as FormSettings).seqWidth).toBe(10)
  })

  it('leaves a width that was never set alone', () => {
    expect(settingsRow({ seqWidth: null } as FormSettings).seqWidth).toBeNull()
    expect(settingsRow({} as FormSettings)).not.toHaveProperty('seqWidth')
  })
})

describe('duplicateRow', () => {
  const src = {
    formType: 'f1', name: 'ใบเบิก', title: 'ใบเบิก', formCode: 'GAC69-005', groupId: 'g1', active: true,
    subject: 'ขออนุมัติ', attention: '', categories: ['ค่าเดินทาง'], notes: ['1. หมายเหตุ'],
    columns: [{ key: 'amount', label: 'จำนวนเงิน', type: 'number' }], bodyText: 'เลขบัญชี {{เลขบัญชี}}',
    signatureBlocks: [{ id: 'maker', label: 'ผู้เบิก' }], accessGroups: ['acc'], createdAt: 1, updatedAt: 1,
  } as FormSettings

  it('copies every setting under a new id and name', () => {
    const copy = duplicateRow(src, 'ใบเบิก (สำเนา)', 'f2', 99)
    expect(copy).toMatchObject({ formType: 'f2', name: 'ใบเบิก (สำเนา)', title: 'ใบเบิก (สำเนา)', groupId: 'g1', createdAt: 99, updatedAt: 99 })
    expect(copy.columns).toEqual(src.columns)
    expect(copy.bodyText).toBe(src.bodyText)
    expect(copy.signatureBlocks).toEqual(src.signatureBlocks)
    expect(copy.accessGroups).toEqual(src.accessGroups)
  })

  // Numbers are counted per form: a shared code would give two documents one number.
  it('leaves the form code blank, and the copy closed until it is ready', () => {
    const copy = duplicateRow(src, 'x', 'f2', 99)
    expect(copy.formCode).toBe('')
    expect(copy.active).toBe(false)
    expect(src.formCode).toBe('GAC69-005')
  })
})
