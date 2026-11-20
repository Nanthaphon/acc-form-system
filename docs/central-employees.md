# ข้อมูลพนักงานจากระบบกลาง (it-asset → Acc Documents)

ข้อมูลพนักงานหลักอยู่ที่ `report.employees` ในโปรเจค **it-asset-management** (`wvxjhjcliusgsfyqfqnh`)
Acc Documents ซิงก์มาเอง **ทันทีที่เพิ่ม/แก้ข้อมูลใน it-asset · ทางเดียว** (แก้ใน Acc ไม่ส่งกลับไป it-asset)

```
it-asset                                              Acc Documents (wrujttmqawcvcrqqhcno)
ตารางพนักงาน ─ trigger เพิ่ม/แก้/ลบ + ทุกชั่วโมง ──►  edge function sync-employees
                                                        │  x-sync-secret = acc_feed_token
report.employees                                        │
  └ public.acc_employee_feed(token)  ◄─ อ่าน 9 คอลัมน์ ──┘ ──► profiles
```

## ซิงก์แล้วเกิดอะไร

| ที่ it-asset | ที่ Acc Documents (ภายในไม่กี่วินาที) |
|---|---|
| แก้ชื่อ / ตำแหน่ง / แผนก / บริษัท / อีเมล | เปลี่ยนตาม |
| เพิ่มพนักงานใหม่ (ยังทำงานอยู่) | สร้างบัญชีให้ — ชื่อผู้ใช้และรหัสผ่านแรก = รหัสพนักงาน, สิทธิ์พนักงาน, ต้องเปลี่ยนรหัสผ่านตอนเข้าครั้งแรก |
| ใส่วันลาออก | ป้าย "ลาออกแล้ว" ในรายชื่อ — บัญชียังเข้าได้ แอดมินลบเอง |
| ลบพนักงาน | ไม่ลบ |
| (แก้ข้อมูลใน Acc) | ไม่ส่งกลับไป it-asset · ค่าที่แก้อยู่จนกว่า it-asset จะเปลี่ยนช่องนั้น |

- จับคู่ด้วย **รหัสพนักงาน** (`emp_id` = ชื่อผู้ใช้, ไม่สนตัวพิมพ์เล็ก/ใหญ่)
- แก้ทุกช่องใน Acc ได้ · ซิงก์เขียนทับเฉพาะช่องที่ค่าใน it-asset **เปลี่ยนจากรอบก่อน** (`profiles."centralValues"` จำค่าที่เห็นล่าสุด)
  ช่องที่ it-asset เว้นว่างไม่ถูกแตะ
- ของระบบนี้เอง ไม่ถูกแตะ: รหัสผ่าน · สิทธิ์ · กลุ่มการเข้าถึง · เลขบัญชี · Job · ลายเซ็น · เอกสารทั้งหมด
- **กันบัญชีซ้ำ:** พนักงานใหม่ที่ชื่อหรืออีเมลตรงกับบัญชีเดิมที่ใช้รหัสอื่น (เช่น ACC01) จะไม่ถูกสร้าง
  ขึ้นในผลซิงก์ให้แอดมินแก้รหัสพนักงานของบัญชีเดิมให้ตรงกับ it-asset (Super Admin → เปลี่ยนชื่อผู้ใช้)
- บริษัทจับคู่กับ `companies` ด้วยชื่อย่อ / ชื่อเต็ม / id — ไม่ตรงก็ไม่เปลี่ยน
- trigger ทำงานครั้งละคำสั่ง (นำเข้า 100 แถวก็ซิงก์รอบเดียว) และเรียกหลัง commit ผ่าน pg_net
  ถ้า Acc ล่มหรือเรียกไม่สำเร็จ การบันทึกที่ it-asset ไม่ล้ม และรอบทุกชั่วโมงจะตามให้

## ตั้งค่า (ทำครั้งเดียว)

1. **it-asset** → SQL Editor → รัน `supabase/central/2026-11-20-acc-employee-feed.sql` → ก๊อป `CENTRAL_FEED_TOKEN`
2. **Acc Documents** → รัน `supabase/2026-11-20-central-employees.sql` แล้ว `supabase/2026-11-20c-employee-edit-here.sql`
3. **Acc Documents** → Edge Functions → Secrets
   | ชื่อ | ค่า |
   |---|---|
   | `CENTRAL_URL` | `https://wvxjhjcliusgsfyqfqnh.supabase.co` |
   | `CENTRAL_ANON_KEY` | anon key ของ it-asset |
   | `CENTRAL_FEED_TOKEN` | จากข้อ 1 |
4. deploy: `npx supabase functions deploy sync-employees --project-ref wrujttmqawcvcrqqhcno` (ตอบ `y`)
5. **it-asset** → SQL Editor → รัน `supabase/central/2026-11-20b-acc-employee-realtime.sql`
   ผลท้ายสุดต้องมีชื่อตารางอย่างน้อย 1 แถว (ตารางที่ติด trigger)

## ตรวจว่าทำงาน

```sql
-- (ที่ it-asset) รอบล่าสุดที่เรียก Acc — status 200 = ปกติ
select status_code, left(content::text, 200), created from net._http_response order by created desc limit 5;
-- (ที่ Acc Documents) รอบที่มีการเปลี่ยนแปลง
select to_timestamp("ranAt"/1000), "by", ok, summary->'created', summary->'failed' from employee_sync_runs order by "ranAt" desc limit 5;
```

## หยุด / ยกเลิก

```sql
-- ที่ it-asset: หยุดซิงก์อัตโนมัติ (ชื่อตารางดูจากผลท้ายไฟล์ 2026-11-20b)
select cron.unschedule('acc-employee-sync');
drop trigger acc_employee_sync on <schema>.<table>;

```

## ทำไมเลือกซิงก์ ไม่อ่านตรง

| | ซิงก์ (ที่ใช้) | อ่าน REST ตรงจากเบราว์เซอร์ | postgres_fdw |
|---|---|---|---|
| RLS / RPC / ล็อกอินเดิม | ใช้ได้เหมือนเดิม | พัง — ฐานข้อมูลเรามองไม่เห็นข้อมูลกลาง | ใช้ได้ |
| ความปลอดภัย | token อยู่ใน secret ฝั่ง server | ต้องเปิดข้อมูลพนักงานให้ anon key ในเบราว์เซอร์ | รหัสผ่านฐานข้อมูลกลางเก็บในฐานเรา |
| it-asset ล่ม | ใช้ข้อมูลรอบล่าสุดต่อได้ | ฟอร์ม/ผู้เซ็นใช้ไม่ได้ | ล็อกอิน/เช็กสิทธิ์อาจล่ม |
