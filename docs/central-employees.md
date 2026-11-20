# ข้อมูลพนักงานจากระบบกลาง

ข้อมูลพนักงานหลักของบริษัทอยู่ที่ `report.employees` ในโปรเจค Supabase **it-asset-management**
(`wvxjhjcliusgsfyqfqnh`) · Acc Documents ซิงก์มาใส่ตาราง `profiles` ของตัวเอง

## ทำงานอย่างไร

```
it-asset-management                          Acc Documents (wrujttmqawcvcrqqhcno)
report.employees                             
  └ public.acc_employee_feed(token)  ◄─────  edge function sync-employees ──► profiles
     (อ่านอย่างเดียว ต้องมี token)              กดปุ่ม "ซิงก์ข้อมูลพนักงาน" หรือตั้งเวลา
```

- จับคู่ด้วย **รหัสพนักงาน** (`emp_id` = `employeeId`, ไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่าง)
- ช่องที่ระบบกลางเป็นเจ้าของ: ชื่อ · นามสกุล (ตัดคำนำหน้าออก) · ตำแหน่ง · แผนก · บริษัท · อีเมล (`m365_email`)
  - ระบบกลางเว้นว่างช่องไหน ช่องนั้นยังแก้ในระบบนี้ได้ ไม่ถูกล้าง
  - บริษัทจับคู่กับ `companies` ด้วยชื่อย่อ / ชื่อเต็ม / id — ไม่ตรงก็ไม่เปลี่ยน และแจ้งในผลซิงก์
- ช่องเหล่านี้ล็อกในหน้า "ข้อมูลของฉัน" และหน้าแก้ไขพนักงาน (ฐานข้อมูลก็กันไว้ด้วย trigger `protect_central`)
- ของระบบนี้เอง ไม่ถูกแตะ: สิทธิ์ · กลุ่มการเข้าถึง · เลขบัญชี · Job · ลายเซ็น · รหัสผ่าน
- **ล็อกอินยังเป็นของระบบนี้** — ซิงก์ไม่สร้าง ไม่ลบ ไม่ระงับบัญชี
  - คนที่ลาออก: ขึ้นป้าย "ลาออกแล้ว" ในรายชื่อ แอดมินลบหรือเปลี่ยนรหัสผ่านเอง
  - คนในระบบกลางที่ยังไม่มีบัญชี: ขึ้นในผลซิงก์ แอดมินเพิ่มด้วยรหัสพนักงานเดียวกัน แล้วกดซิงก์
  - คนที่ไม่อยู่ในระบบกลาง (เช่นบัญชีทดสอบ): แก้ข้อมูลในระบบนี้ได้ตามเดิม

## ตั้งค่าครั้งแรก (ทำครั้งเดียว)

1. **โปรเจค it-asset-management** → SQL Editor → รัน `supabase/central/2026-11-20-acc-employee-feed.sql`
   ผลลัพธ์บรรทัดสุดท้ายคือ `CENTRAL_FEED_TOKEN` — ก๊อปเก็บไว้
2. **โปรเจค it-asset-management** → Project Settings → API Keys → ก๊อป anon / publishable key
3. **โปรเจค Acc Documents** → SQL Editor → รัน `supabase/2026-11-20-central-employees.sql`
4. **โปรเจค Acc Documents** → Edge Functions → Secrets → เพิ่ม
   | ชื่อ | ค่า |
   |---|---|
   | `CENTRAL_URL` | `https://wvxjhjcliusgsfyqfqnh.supabase.co` |
   | `CENTRAL_ANON_KEY` | key จากข้อ 2 |
   | `CENTRAL_FEED_TOKEN` | token จากข้อ 1 |
5. deploy function:
   ```
   npx supabase functions deploy sync-employees --project-ref wrujttmqawcvcrqqhcno
   ```
6. เข้าเว็บด้วยบัญชีแอดมิน → ข้อมูลพนักงาน → **ซิงก์ข้อมูลพนักงาน** → "ดูก่อนว่าจะเปลี่ยนอะไร" → "ซิงก์เลย"

ทำข้อ 1–5 ที่โปรเจค staging ก่อนได้ตาม `docs/release-checklist.md` (ใช้ token และ key ชุดเดียวกัน)

## ซิงก์อัตโนมัติ (ไม่บังคับ)

รันในโปรเจค Acc Documents — ซิงก์ทุกวัน 06:00 น. (23:00 UTC) · ต้องเปิด extension `pg_cron` และ `pg_net` ก่อน
และเก็บ service role key ของโปรเจคนี้ใน Vault ชื่อ `acc_service_role_key`

```sql
select vault.create_secret('<service role key ของ Acc Documents>', 'acc_service_role_key');

select cron.schedule('sync-employees-daily', '0 23 * * *', $$
  select net.http_post(
    url := 'https://wrujttmqawcvcrqqhcno.supabase.co/functions/v1/sync-employees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'acc_service_role_key')),
    body := '{}'::jsonb);
$$);
```

ประวัติการซิงก์ทุกครั้งอยู่ในตาราง `employee_sync_runs`

## ยกเลิกการใช้ระบบกลาง

```sql
-- ปลดล็อกทุกช่องให้แก้ในระบบนี้ได้อีกครั้ง
update profiles set "centralFields" = '{}', "centralStatus" = null;
select cron.unschedule('sync-employees-daily');  -- ถ้าตั้งเวลาไว้
```

## ทำไมเลือกซิงก์ ไม่อ่านตรง

| | ซิงก์ (ที่ใช้) | อ่าน REST ตรงจากเบราว์เซอร์ | postgres_fdw |
|---|---|---|---|
| RLS / RPC / ล็อกอินเดิม | ใช้ได้เหมือนเดิม | พัง — ฐานข้อมูลเรามองไม่เห็นข้อมูลกลาง | ใช้ได้ |
| ความปลอดภัย | token อยู่ใน secret ฝั่ง server | ต้องเปิดข้อมูลพนักงานให้ anon key ในเบราว์เซอร์ | รหัสผ่านฐานข้อมูลกลางเก็บในฐานเรา |
| ระบบกลางล่ม | ใช้ข้อมูลรอบล่าสุดต่อได้ | ฟอร์ม/ผู้เซ็นใช้ไม่ได้ | ล็อกอิน/เช็กสิทธิ์อาจล่ม |
| ความสด | ตามรอบซิงก์ / กดปุ่ม | สดเสมอ | สดเสมอ |
