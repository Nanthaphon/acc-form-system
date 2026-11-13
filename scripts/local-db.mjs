// ฐานข้อมูลจริงบนเครื่องตัวเอง (Supabase local) — Postgres + Auth + Storage
// ครบเหมือนของจริง ไม่ต้องต่ออินเทอร์เน็ต และไม่แตะข้อมูลจริงเลย
//
//   npm run local:start   เปิดฐานข้อมูลในเครื่อง (ครั้งแรกดาวน์โหลด image ~2-3 GB)
//   npm run local:stop    ปิด (ข้อมูลยังอยู่ เปิดใหม่ได้ของเดิม)
//   npm run local:reset   ล้างแล้วสร้างใหม่จาก supabase/migrations + seed.sql
//   npm run dev:local     เปิดแอปต่อกับฐานข้อมูลในเครื่อง (พอร์ต 5176)
//
// ต้องมี Docker Desktop ก่อน — ถ้ายังไม่มี สคริปต์จะบอกให้ติดตั้ง
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const cmd = process.argv[2] ?? 'start'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const run = (args, opts = {}) => spawnSync(npx, ['supabase', ...args], { stdio: 'inherit', shell: process.platform === 'win32', ...opts })

// โครงสร้างฐานข้อมูลมาจากไฟล์ใน supabase/ เสมอ — สร้าง migration ใหม่ทุกครั้ง
// ก่อนเปิด จะได้ไม่มีทางตามหลังไฟล์ต้นทาง
function buildMigration() {
  spawnSync(process.execPath, ['scripts/build-staging-sql.mjs', '--out', 'supabase/migrations/00000000000000_full_schema.sql'], { stdio: 'ignore' })
}

function requireDocker() {
  const r = spawnSync('docker', ['info'], { stdio: 'ignore', shell: process.platform === 'win32' })
  if (r.status === 0) return
  console.error(`\x1b[31mยังเปิดฐานข้อมูลในเครื่องไม่ได้ — ไม่พบ Docker ที่ทำงานอยู่\x1b[0m

Supabase ในเครื่อง (Postgres + Auth + Storage) ทำงานบน Docker

1. ติดตั้ง Docker Desktop: https://www.docker.com/products/docker-desktop/  (ฟรี)
2. เปิดโปรแกรม Docker Desktop รอจนไอคอนขึ้นว่า Running
3. รัน npm run local:start อีกครั้ง

ไม่อยากลง Docker? ใช้โหมดเดโมแทนได้ทันที (npm run dev:demo) — ข้อมูลเก็บในเบราว์เซอร์
หรือตั้งฐานข้อมูลทดสอบบน Supabase cloud (docs/environments.md ข้อ 2)`)
  process.exit(1)
}

// เขียน .env.localdb ให้ npm run dev:local อ่าน — ค่า URL/key มาจาก CLI เอง
// ไม่ได้เดาหรือฝังไว้ในโค้ด
function writeEnv() {
  const r = spawnSync(npx, ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', shell: process.platform === 'win32' })
  const out = r.stdout ?? ''
  const pick = (key) => new RegExp(`^${key}="?([^"\\n\\r]+)"?`, 'm').exec(out)?.[1]
  const url = pick('API_URL')
  const anon = pick('ANON_KEY') ?? pick('PUBLISHABLE_KEY')
  if (!url || !anon) {
    console.warn('\x1b[33mอ่านค่าจาก supabase status ไม่ได้ — ตั้ง .env.localdb เองจากค่าที่ CLI แสดงด้านบน\x1b[0m')
    return
  }
  fs.writeFileSync('.env.localdb',
    `# สร้างอัตโนมัติโดย npm run local:start — ชี้ไปที่ฐานข้อมูลในเครื่องเท่านั้น\n`
    + `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anon}\nVITE_APP_ENV=local\n`)
  console.log(`\n\x1b[32mพร้อมใช้งาน\x1b[0m — เขียน .env.localdb ให้แล้ว (${url})`)
  console.log('  เปิดแอป:        npm run dev:local   → http://localhost:5176')
  console.log('  ดูฐานข้อมูล:    http://127.0.0.1:54323  (Supabase Studio)')
  console.log('  ล็อกอิน:        admin / admin1234   ·   emp01 / admin1234')
}

if (cmd === 'stop') {
  run(['stop'])
} else if (cmd === 'reset') {
  requireDocker()
  buildMigration()
  // ล้างฐานข้อมูลแล้วรัน migrations + seed.sql ใหม่ทั้งหมด
  const r = run(['db', 'reset'])
  if (r.status === 0) writeEnv()
  process.exit(r.status ?? 0)
} else {
  requireDocker()
  buildMigration()
  const r = run(['start'])
  if (r.status === 0) writeEnv()
  process.exit(r.status ?? 0)
}
