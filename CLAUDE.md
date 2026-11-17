# Acc Documents — ระบบเอกสารเบิกจ่าย (Globe Syndicate)

React 18 + TS + Vite + Tailwind · Supabase (Postgres + RLS + RPC) · UI ภาษาไทย ฟอนต์ Bai Jamjuree
เอกสารที่พิมพ์ใช้ Sarabun · deploy อัตโนมัติจาก `main` ไป Vercel (acc-form-system.vercel.app)

## คำสั่ง

```
npm test          # vitest ทั้งชุด (~50 ไฟล์) — รันก่อน commit เสมอ
npm run build     # tsc -b && vite build — รันก่อน commit เสมอ (จับ import ที่ไม่ได้ใช้)
npm run dev       # เว็บจริง ฐานข้อมูลจริง (พอร์ต 5174)
npm run dev:both  # เปิดระบบจริง (5174) + ระบบทดสอบ cloud (5175) พร้อมกัน สลับด้วยการเปลี่ยนแท็บ
npm run local:start  # ฐานข้อมูลจริงในเครื่อง (Supabase local บน Docker) แล้วเปิดด้วย npm run dev:local (5176)
npm run dev:demo  # โหมดเดโม ข้อมูลสมมติ เก็บใน localStorage ของเบราว์เซอร์ (demo/fakeSupabase.ts, ?demo=admin|super|…)
npm run staging:sql  # รวมไฟล์ supabase/*.sql เป็นไฟล์เดียว สำหรับตั้งฐานข้อมูลทดสอบใหม่
npm run lint      # oxlint
```

ตรวจงานด้วย `npm test` + `npm run build` ก่อน commit — อย่าให้ผู้ใช้เช็กแทน
เวลา grep ผลเทสต์ให้ `| grep -E "×|FAIL|Test Files|Tests "` พอ อย่าพ่น log ทั้งหมด

## ไฟล์ที่แก้บ่อย

| เรื่อง | ไฟล์ |
|---|---|
| สูตรคำนวณ ภาษี ความกว้าง/ความสูงที่พิมพ์ | `src/features/expense-claim/calc.ts` |
| หน้ากรอกฟอร์ม | `src/features/expense-claim/ExpenseClaimForm.tsx` · `TaxPanel.tsx` |
| เอกสารที่พิมพ์ออกมา | `src/features/expense-claim/ExpenseClaimPreview.tsx` |
| ชนิดข้อมูลทั้งระบบ | `src/types/schema.ts` |
| สวิตช์ฟีเจอร์ที่ยังไม่ปล่อย | `src/shared/features.ts` |
| ประกาศในระบบ (changelog ที่ผู้ใช้เห็น) | `src/shared/announcements.ts` |
| หน้าตั้งค่าฟอร์มของแอดมิน | `src/pages/admin/FormSettingsPage.tsx` |

## กฎของโปรเจค

- **SQL รันเองไม่ได้** — เขียนไฟล์ไว้ใน `supabase/` แล้วให้ผู้ใช้ก๊อปไปรันใน Supabase SQL Editor
- **push/deploy เมื่อผู้ใช้สั่งเท่านั้น** (`git push origin HEAD:main` แล้วรอ Vercel ~1 นาที)
- เพิ่ม/แก้ฟีเจอร์ที่ผู้ใช้เห็น → เขียนประกาศใน `announcements.ts` ด้วย
- การพิมพ์คิดเป็นมิลลิเมตรจริง: พื้นที่ตารางบน A4 = 190 มม. · กระดาษสูง 276 มม. (`PRINT_TABLE_MM`, `PRINT_SHEET_MM`)
  ค่าคงที่ความสูงทั้งหมดวัดจากแผ่นจริง อย่าเดาเอง ถ้าจะแก้ให้วัดใหม่
- ก่อนปล่อยขึ้นเว็บจริง: ทำตาม docs/release-checklist.md (branch แยก → CI เขียว → SQL ที่ staging ก่อน → สำรองข้อมูล → merge)
- เอกสารเพิ่มเติม: `docs/environments.md` (เดโม/staging/จริง) · `docs/app-overview/README.md`

## งานใหม่ = session ใหม่

ผู้ใช้ต้องการให้แต่ละฟีเจอร์/การแก้ไขมี chat ของตัวเอง

- ผู้ใช้ขอฟีเจอร์ใหม่ หรือแก้เรื่องที่ไม่ใช่งานที่ session นี้ทำอยู่ → **อย่าลงมือทำใน session นี้**
  ใช้ `spawn_task` สร้างงานใหม่แทน แล้วบอกผู้ใช้ให้กดปุ่มงานที่ขึ้นมา เพื่อเปิดเป็น chat ใหม่
  - `title`: ขึ้นต้นด้วยคำกริยา สั้น เช่น "เพิ่มปุ่มส่งกลับให้แก้ในเอกสารรอเซ็น"
  - `prompt`: อ่านเข้าใจได้เองโดยไม่เห็น chat นี้ — คำขอของผู้ใช้แบบคำต่อคำ (รวมภาพที่ผู้ใช้อธิบาย)
    ไฟล์ที่น่าจะเกี่ยว และสิ่งที่ตกลงกันไว้แล้ว
  - ผู้ใช้ขอหลายเรื่องในข้อความเดียว → สร้างงานละเรื่อง
- ทำต่อใน session เดิมได้เฉพาะ: แก้/ปรับงานที่ session นี้เพิ่งทำ, ตอบคำถาม, deploy งานของ session นี้
- **ไม่ใช้ worktree** — ทำงานในโฟลเดอร์หลัก `C:\Dev\Acc Form Project` บน branch `main` เสมอ
  (ผู้ใช้เปิด `npm run dev` จากโฟลเดอร์นี้ แก้แล้วต้องเห็นที่ localhost ทันที)
  - session ใหม่ที่สร้างให้: `use_worktree: false` (ใช้โฟลเดอร์เดียวกัน)
  - หลาย session ใช้โฟลเดอร์เดียวกัน → แก้เฉพาะไฟล์ของงานตัวเอง · `git add` เฉพาะไฟล์ที่ตัวเองแก้ (ห้าม `git add -A`)
    ห้ามสลับ branch · ห้าม stash/reset ของคนอื่น
  - ถ้า session ไหนถูกเปิดใน worktree ไปแล้ว: งานเสร็จให้ merge เข้า `main` ในโฟลเดอร์หลัก (`git merge --ff-only`) ทันที
- deploy เมื่อผู้ใช้สั่ง: `git pull --rebase origin main` ก่อน (session อื่นอาจ push ไปแล้ว)
  รันเทสต์ + build อีกรอบ แล้วจึง `git push origin main`
