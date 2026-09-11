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
  return msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}
