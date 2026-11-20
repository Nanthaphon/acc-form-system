// A readable reason for a failed database write. A missing column means the app
// is newer than the database: the pending SQL in supabase/ hasn't been run yet.
export function dbErrorMessage(e: unknown): string {
  const err = (e ?? {}) as { code?: string; message?: string }
  const msg = err.message ?? ''
  if (err.code === '42703' || err.code === 'PGRST204') {
    // PGRST204: "Could not find the 'x' column of 't' in the schema cache"
    // 42703:    'column t.x does not exist' / 'column "x" of relation "t" does not exist'
    const col = /'([^']+)' column/.exec(msg)?.[1] ?? /column "?(?:\w+\.)?(\w+)"?/.exec(msg)?.[1]
    return `ฐานข้อมูลยังไม่ได้อัปเดตให้ตรงกับระบบเวอร์ชันนี้${col ? ` (ไม่พบคอลัมน์ ${col})` : ''} — ผู้ดูแลระบบต้องรันไฟล์ SQL ล่าสุดใน Supabase ก่อน`
  }
  if (err.code === 'PGRST202') {
    // "Could not find the function public.x(...) in the schema cache"
    const fn = /function (?:\w+\.)?(\w+)/.exec(msg)?.[1]
    return `ฐานข้อมูลยังไม่ได้อัปเดตให้ตรงกับระบบเวอร์ชันนี้${fn ? ` (ไม่พบฟังก์ชัน ${fn})` : ''} — ผู้ดูแลระบบต้องรันไฟล์ SQL ล่าสุดใน Supabase ก่อน`
  }
  // supabase/2026-11-20-central-employees.sql: a field the employee master owns.
  if (msg.includes('CENTRAL_FIELD:')) {
    return 'ข้อมูลนี้มาจากระบบข้อมูลพนักงานกลาง แก้ในระบบนี้ไม่ได้ — แจ้ง HR/IT ให้แก้ที่ระบบกลาง แล้วกด “ซิงก์ข้อมูลพนักงาน”'
  }
  return msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

// A profile save that went through without the email: the database has no email
// column yet (updateProfile → emailSkipped).
export const EMAIL_NOT_SAVED =
  'ข้อมูลอื่นบันทึกเรียบร้อยแล้ว แต่ยังเก็บอีเมลไม่ได้ เพราะฐานข้อมูลยังไม่รองรับอีเมล — ' +
  'ผู้ดูแลระบบต้องรันไฟล์ supabase/2026-10-26-employee-email.sql ใน Supabase SQL Editor หนึ่งครั้ง แล้วกรอกอีเมลใหม่'
