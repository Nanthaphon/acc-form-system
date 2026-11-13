# Acc Documents — ระบบเอกสารเบิกจ่าย (Globe Syndicate)

React 18 + TS + Vite + Tailwind · Supabase (Postgres + RLS + RPC) · UI ภาษาไทย ฟอนต์ Bai Jamjuree
เอกสารที่พิมพ์ใช้ Sarabun · deploy อัตโนมัติจาก `main` ไป Vercel (acc-form-system.vercel.app)

## คำสั่ง

```
npm test          # vitest ทั้งชุด (~50 ไฟล์) — รันก่อน commit เสมอ
npm run build     # tsc -b && vite build — รันก่อน commit เสมอ (จับ import ที่ไม่ได้ใช้)
npm run dev       # เว็บจริง (ฐานข้อมูลจริง)
npm run dev:demo  # โหมดเดโม ข้อมูลสมมติในเบราว์เซอร์ (demo/vite.config.mjs, ?demo=dx|admin|super|…)
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
- เอกสารเพิ่มเติม: `docs/environments.md` (เดโม/staging/จริง) · `docs/app-overview/README.md`
