# ข้อมูลพนักงานจากระบบกลาง (it-asset → Acc Documents)

ข้อมูลพนักงานหลักอยู่ที่ `report.employees` ในโปรเจค **it-asset-management** (`wvxjhjcliusgsfyqfqnh`)
Acc Documents ซิงก์มาเอง **ทุก 10 นาที · ทางเดียว** (แก้ใน Acc ไม่ส่งกลับไป it-asset)

```
it-asset                                       Acc Documents (wrujttmqawcvcrqqhcno)
report.employees
  └ public.acc_employee_feed(token)  ◄────────  edge function sync-employees ──► profiles
     (อ่านอย่างเดียว 9 คอลัมน์)                     ทุก 10 นาที (pg_cron) หรือกดปุ่มซิงก์
```

## ซิงก์แล้วเกิดอะไร

| ที่ it-asset | ที่ Acc Documents |
|---|---|
| แก้ชื่อ / ตำแหน่ง / แผนก / บริษัท / อีเมล | เปลี่ยนตามในรอบถัดไป (ไม่เกิน 10 นาที) |
| เพิ่มพนักงานใหม่ (ยังทำงานอยู่) | สร้างบัญชีให้ — ชื่อผู้ใช้และรหัสผ่านแรก = รหัสพนักงาน, สิทธิ์พนักงาน, ต้องเปลี่ยนรหัสผ่านตอนเข้าครั้งแรก |
| ใส่วันลาออก | ป้าย "ลาออกแล้ว" ในรายชื่อ — บัญชียังเข้าได้ แอดมินลบเอง |
| ลบพนักงาน | ไม่ลบ · ช่องที่ล็อกกลับมาแก้ได้ |

- จับคู่ด้วย **รหัสพนักงาน** (`emp_id` = ชื่อผู้ใช้, ไม่สนตัวพิมพ์เล็ก/ใหญ่)
- ช่องที่มาจากระบบกลางล็อกในระบบนี้ (หน้าจอ + trigger `protect_central`) — ระบบกลางเว้นว่างช่องไหน ช่องนั้นยังแก้ได้
- ของระบบนี้เอง ไม่ถูกแตะ: รหัสผ่าน · สิทธิ์ · กลุ่มการเข้าถึง · เลขบัญชี · Job · ลายเซ็น · เอกสารทั้งหมด
- **กันบัญชีซ้ำ:** พนักงานใหม่ที่ชื่อหรืออีเมลตรงกับบัญชีเดิมที่ใช้รหัสอื่น (เช่น ACC01) จะไม่ถูกสร้าง
  ขึ้นในผลซิงก์ให้แอดมินแก้รหัสพนักงานของบัญชีเดิมให้ตรงกับ it-asset (Super Admin → เปลี่ยนชื่อผู้ใช้)
- บริษัทจับคู่กับ `companies` ด้วยชื่อย่อ / ชื่อเต็ม / id — ไม่ตรงก็ไม่เปลี่ยน

## ตั้งค่า (ทำครั้งเดียว)

1. **it-asset** → SQL Editor → รัน `supabase/central/2026-11-20-acc-employee-feed.sql` → ก๊อป `CENTRAL_FEED_TOKEN`
2. **Acc Documents** → SQL Editor → รัน `supabase/2026-11-20-central-employees.sql`
3. **Acc Documents** → SQL Editor → รัน `supabase/manual/2026-11-20-employee-sync-cron.sql` → ก๊อป `SYNC_SECRET`
4. **Acc Documents** → Edge Functions → Secrets
   | ชื่อ | ค่า |
   |---|---|
   | `CENTRAL_URL` | `https://wvxjhjcliusgsfyqfqnh.supabase.co` |
   | `CENTRAL_ANON_KEY` | anon key ของ it-asset |
   | `CENTRAL_FEED_TOKEN` | จากข้อ 1 |
   | `SYNC_SECRET` | จากข้อ 3 |
5. deploy (ตอบ `y` ตอนถามยืนยัน):
   ```
   npx supabase functions deploy sync-employees --project-ref wrujttmqawcvcrqqhcno
   ```

## ตรวจว่าทำงาน

```sql
-- รอบล่าสุดที่ cron เรียก (status 200 = ปกติ)
select status_code, left(content, 200), created from net._http_response order by created desc limit 5;
-- รอบที่มีการเปลี่ยนแปลง
select to_timestamp("ranAt"/1000), "by", ok, summary->'created', summary->'failed' from employee_sync_runs order by "ranAt" desc limit 5;
```

## หยุด / ยกเลิก

```sql
select cron.unschedule('sync-employees');                                  -- หยุดซิงก์อัตโนมัติ
update profiles set "centralFields" = '{}', "centralStatus" = null;        -- ปลดล็อกทุกช่อง
```

## ทำไมเลือกซิงก์ ไม่อ่านตรง

| | ซิงก์ (ที่ใช้) | อ่าน REST ตรงจากเบราว์เซอร์ | postgres_fdw |
|---|---|---|---|
| RLS / RPC / ล็อกอินเดิม | ใช้ได้เหมือนเดิม | พัง — ฐานข้อมูลเรามองไม่เห็นข้อมูลกลาง | ใช้ได้ |
| ความปลอดภัย | token อยู่ใน secret ฝั่ง server | ต้องเปิดข้อมูลพนักงานให้ anon key ในเบราว์เซอร์ | รหัสผ่านฐานข้อมูลกลางเก็บในฐานเรา |
| it-asset ล่ม | ใช้ข้อมูลรอบล่าสุดต่อได้ | ฟอร์ม/ผู้เซ็นใช้ไม่ได้ | ล็อกอิน/เช็กสิทธิ์อาจล่ม |
