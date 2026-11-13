// สำรองฐานข้อมูลจริงก่อนรัน SQL — พิมพ์คำเดียว
//
//   npm run backup
//
// Supabase แผนฟรีไม่มีสำรองอัตโนมัติ ถ้า SQL ผิดแล้วข้อมูลหาย ไม่มีทางกู้
// สคริปต์นี้จึงเป็นด่านสุดท้าย: เก็บทั้งโครงสร้างและข้อมูล (public + auth)
// ลงไฟล์ในโฟลเดอร์ backups/ ซึ่งไม่ถูกเก็บใน Git
//
// ครั้งแรกต้องตั้ง 2 อย่าง
//   1. ติดตั้ง PostgreSQL (เลือกเฉพาะ Command Line Tools ก็พอ) จาก
//      postgresql.org/download/windows — เวอร์ชันต้องไม่ต่ำกว่าของ Supabase
//   2. สร้างไฟล์ .env.backup.local บรรทัดเดียว:
//      SUPABASE_DB_URL=postgresql://postgres.xxxx:รหัสผ่าน@....pooler.supabase.com:5432/postgres
//      (เอามาจาก Supabase → ปุ่ม Connect → Session pooler แล้วแทน [YOUR-PASSWORD])
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ENV_FILE = '.env.backup.local'
const OUT_DIR = 'backups'

const read = () => {
  if (!fs.existsSync(ENV_FILE)) return null
  const line = fs.readFileSync(ENV_FILE, 'utf8').split('\n').find(l => l.startsWith('SUPABASE_DB_URL='))
  const url = line?.slice('SUPABASE_DB_URL='.length).trim()
  return url && !url.includes('รหัสผ่าน') && !url.includes('[') ? url : null
}

const url = read()
if (!url) {
  console.error(`\x1b[31mยังสำรองไม่ได้ — ยังไม่ได้ตั้งค่า\x1b[0m

1. ติดตั้ง PostgreSQL (เลือกแค่ Command Line Tools) จาก https://www.postgresql.org/download/windows/
2. สร้างไฟล์ ${ENV_FILE} ที่รากโปรเจกต์ ใส่บรรทัดเดียว:

   SUPABASE_DB_URL=<URI จาก Supabase → Connect → Session pooler (แทน [YOUR-PASSWORD] ด้วยรหัสผ่านจริง)>

3. รัน npm run backup อีกครั้ง

ไฟล์ ${ENV_FILE} มีรหัสผ่านฐานข้อมูล — Git ไม่เก็บให้อยู่แล้ว อย่าส่งให้ใคร`)
  process.exit(1)
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2')
const out = path.join(OUT_DIR, `backup-${stamp}.sql`)
fs.mkdirSync(OUT_DIR, { recursive: true })

console.log('กำลังสำรองข้อมูล… (อาจใช้เวลาสักครู่)')
const r = spawnSync('pg_dump', [url, '--schema=public', '--schema=auth', '--no-owner', '--no-privileges', '-f', out],
  { stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' })

if (r.error?.code === 'ENOENT' || r.status === 127) {
  console.error('\x1b[31mไม่พบคำสั่ง pg_dump\x1b[0m — ติดตั้ง PostgreSQL (Command Line Tools) ก่อน: https://www.postgresql.org/download/windows/')
  process.exit(1)
}
if (r.status !== 0) {
  console.error('\x1b[31mสำรองไม่สำเร็จ\x1b[0m — ตรวจ URI และรหัสผ่านใน ' + ENV_FILE)
  process.exit(r.status ?? 1)
}

const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1)
console.log(`\x1b[32mสำรองเรียบร้อย:\x1b[0m ${out} (${mb} MB)`)
console.log('ไฟล์นี้มีข้อมูลพนักงานและเอกสารจริง — ก๊อปไปเก็บที่ OneDrive ของบริษัท อย่าใส่ใน Git อย่าส่งทางแชท')
console.log('หมายเหตุ: ไฟล์แนบ (รูปใบเสร็จ) อยู่ใน Storage แยกต่างหาก ไม่ได้อยู่ในไฟล์นี้')
