// รวมไฟล์ SQL ทั้งหมดใน supabase/ เป็นไฟล์เดียว สำหรับสร้างฐานข้อมูลทดสอบ
// (staging) ใหม่หมดในครั้งเดียว — ก๊อปไปวางใน Supabase → SQL Editor → Run
//
//   node scripts/build-staging-sql.mjs      (หรือ npm run staging:sql)
//
// ทางนี้แทนการใช้ pg_dump: ไม่ต้องติดตั้ง PostgreSQL หรือ Docker และไม่ต้อง
// แตะฐานข้อมูลจริงเลยแม้แต่น้อย — อ่านจากไฟล์ในโปรเจกต์อย่างเดียว
//
// ลำดับที่รวมคือลำดับที่ไฟล์เหล่านี้เกิดขึ้นจริง: โครงสร้างหลักก่อน แล้ว
// migration ตามวันที่ ปิดท้ายด้วยฟอร์มตัวอย่าง ทุกไฟล์เขียนให้รันซ้ำได้
// (if not exists / or replace) การรันไฟล์นี้ซ้ำจึงไม่ทำอะไรเสียหาย
import fs from 'node:fs'
import path from 'node:path'

const DIR = 'supabase'
const OUT = path.join(DIR, '_staging-setup.generated.sql')

// ของเก่าที่ถูกแทนที่ไปแล้ว และตัวถอนการติดตั้ง — ไม่ต้องรันบนฐานข้อมูลใหม่
const SKIP = new Set(['teardown-approval.sql', path.basename(OUT)])
// ต้องมาก่อนไฟล์ตามวันที่ ตามลำดับที่ระบบนี้โตขึ้นมาจริง ๆ
const FIRST = ['schema.sql', 'approval-migration.sql', 'signature-system.sql']

const all = fs.readdirSync(DIR).filter(f => f.endsWith('.sql') && !SKIP.has(f))
const dated = all.filter(f => /^\d{4}-\d{2}-\d{2}/.test(f)).sort()
const seeds = all.filter(f => f.startsWith('seed-')).sort()
const order = [...FIRST.filter(f => all.includes(f)), ...dated, ...seeds]

const missed = all.filter(f => !order.includes(f))
if (missed.length) throw new Error(`ไฟล์ที่ยังไม่ได้จัดลำดับ: ${missed.join(', ')}`)

const header = `-- ============================================================================
-- ฐานข้อมูลทดสอบ (staging) — สร้างจากไฟล์ใน supabase/ ทั้งหมด ${order.length} ไฟล์
-- สร้างเมื่อ ${new Date().toISOString().slice(0, 16).replace('T', ' ')} โดย scripts/build-staging-sql.mjs
--
-- วิธีใช้: Supabase project ทดสอบ → SQL Editor → วางทั้งไฟล์นี้ → Run
-- ไฟล์นี้ไม่มีข้อมูลพนักงานหรือเอกสารจริงอยู่เลย มีแต่โครงสร้างและฟอร์มตัวอย่าง
-- (ไฟล์นี้สร้างใหม่ได้เสมอ จึงไม่ได้เก็บใน Git — อย่าแก้ไฟล์นี้ แก้ที่ต้นทาง)
-- ============================================================================

`
const body = order.map(f => {
  const line = '-- '.padEnd(78, '=')
  return `${line}\n-- supabase/${f}\n${line}\n${fs.readFileSync(path.join(DIR, f), 'utf8').trimEnd()}\n`
}).join('\n')

fs.writeFileSync(OUT, header + body)
const kb = Math.round(fs.statSync(OUT).size / 1024)
console.log(`เขียนแล้ว: ${OUT} (${order.length} ไฟล์ · ${kb} KB)`)
console.log(order.map((f, i) => `  ${String(i + 1).padStart(2)}. ${f}`).join('\n'))
