// รันระบบจริงกับระบบทดสอบพร้อมกัน คนละพอร์ต — สลับได้แค่เปลี่ยนแท็บเบราว์เซอร์
//
//   npm run dev:both
//     http://localhost:5174  ระบบจริง   (ฐานข้อมูลจริง — ระวัง)
//     http://localhost:5175  ระบบทดสอบ  (ฐานข้อมูลทดสอบ มีป้ายสีน้ำตาลบอกไว้)
//
// ทั้งสองเป็น vite คนละตัว อ่าน .env คนละไฟล์ จึงไม่มีทางปนกัน ปิดด้วย Ctrl+C
// ครั้งเดียวจบทั้งคู่
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const servers = [
  { name: 'จริง   ', color: '\x1b[31m', args: ['vite', '--port', '5174', '--strictPort'] },
  { name: 'ทดสอบ', color: '\x1b[36m', args: ['vite', '--mode', 'staging', '--port', '5175', '--strictPort'] },
]

if (!fs.existsSync('.env.staging.local')) {
  console.log('\x1b[33m! ยังไม่มี .env.staging.local — ระบบทดสอบจะขึ้นหน้าบอกวิธีตั้งค่าแทน (docs/environments.md)\x1b[0m\n')
}

const children = servers.map(s => {
  const child = spawn(npx, s.args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
  const tag = (line) => `${s.color}[${s.name}]\x1b[0m ${line}`
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', text => {
      for (const line of text.split('\n')) if (line.trim()) console.log(tag(line))
    })
  }
  return child
})

// Ctrl+C ปิดทั้งคู่ ไม่ทิ้งพอร์ตค้างไว้
const stop = () => { for (const c of children) c.kill() }
process.on('SIGINT', () => { stop(); process.exit(0) })
process.on('SIGTERM', () => { stop(); process.exit(0) })
for (const c of children) c.on('exit', code => { if (code) { stop(); process.exit(code) } })
