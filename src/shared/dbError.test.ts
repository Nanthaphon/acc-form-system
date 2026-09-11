import { describe, expect, it } from 'vitest'
import { dbErrorMessage } from './dbError'

describe('dbErrorMessage', () => {
  it('names the missing column when a write hits an old schema', () => {
    expect(dbErrorMessage({ code: 'PGRST204', message: "Could not find the 'accessGroups' column of 'form_settings' in the schema cache" }))
      .toMatch(/ฐานข้อมูลยังไม่ได้อัปเดต.*accessGroups.*รันไฟล์ SQL/)
    expect(dbErrorMessage({ code: '42703', message: 'column form_settings.createdAt does not exist' })).toContain('createdAt')
    expect(dbErrorMessage({ code: '42703', message: 'column "updatedAt" of relation "form_settings" does not exist' })).toContain('updatedAt')
    expect(dbErrorMessage({ code: 'PGRST202', message: 'Could not find the function public.admin_set_password(must_change, new_password, target) in the schema cache' }))
      .toMatch(/ไม่พบฟังก์ชัน admin_set_password/)
  })

  it('passes other errors through, with a fallback', () => {
    expect(dbErrorMessage({ code: '23505', message: 'duplicate key' })).toBe('duplicate key')
    expect(dbErrorMessage(new Error('network down'))).toBe('network down')
    expect(dbErrorMessage(undefined)).toMatch(/ลองใหม่/)
  })
})
