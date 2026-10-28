# แยกการทดสอบออกจากข้อมูลจริง

ตอนนี้มีฐานข้อมูลเดียว (Supabase `wrujttmqawcvcrqqhcno`) ทั้งเว็บจริงและตอนพัฒนาใช้ร่วมกัน
ลองฟีเจอร์ใหม่เมื่อไรก็เขียนลงข้อมูลจริงทันที — คู่มือนี้แยกเป็น 3 ชั้น

| ชั้น | ข้อมูล | ใช้เมื่อ | ต้องตั้งค่า |
|---|---|---|---|
| 1. โหมดเดโม | สมมติ อยู่ในเบราว์เซอร์ | ดูหน้าตา ลองขั้นตอน | ไม่ต้อง — ใช้ได้เลย |
| 2. ระบบทดสอบ (staging) | ฐานข้อมูลแยก ไม่มีข้อมูลพนักงานจริง | ลอง SQL ใหม่ สิทธิ์ ลายเซ็น อีเมล | ตั้งครั้งเดียว ~30 นาที |
| 3. ระบบจริง (production) | ข้อมูลจริง | ใช้งานจริงเท่านั้น | มีอยู่แล้ว |

แต่ละชั้นมีป้ายสีน้ำตาลด้านล่างจอบอกว่าไม่ใช่ระบบจริง (ระบบจริงไม่มีป้าย)

---

## 1. โหมดเดโม — ใช้ได้ทันที

```bash
npm run dev:demo
```

เปิด http://localhost:5198 — แอปตัวจริงทุกหน้า แต่ฐานข้อมูลเป็นของปลอมในเบราว์เซอร์
(`demo/fakeSupabase.ts`) ไม่มีอะไรออกไปถึง Supabase เลย รีเฟรชหน้าแล้วข้อมูลเริ่มใหม่

เข้าเป็นใคร — ต่อท้าย URL:

| URL | เข้าเป็น |
|---|---|
| (ไม่ใส่) | พนักงาน สมชาย ใจดี |
| `?demo=admin` | ฝ่ายบัญชี (admin) |
| `?demo=super` | Super Admin |
| `?demo=nosig` | พนักงานที่ยังไม่อัปโหลดลายเซ็น |

ข้อจำกัด: ไม่ได้ทดสอบกฎความปลอดภัย (RLS) หรือ SQL จริง — ของพวกนั้นต้องใช้ชั้นที่ 2
ฟีเจอร์ใหม่ที่เรียกฟังก์ชันฐานข้อมูลใหม่ (`rpc(...)`) ต้องเพิ่มใน `demo/fakeSupabase.ts` ด้วย

---

## 2. ระบบทดสอบ (staging) — ตั้งครั้งเดียว

### 2.1 สร้าง Supabase project ใหม่
supabase.com → New project → ชื่อ `acc-documents-staging` (แผนฟรีมีได้ 2 project)
จดไว้: **Project URL** และ **anon public key** (Project Settings → API)

### 2.2 คัดลอกโครงสร้างฐานข้อมูลจากของจริง (ไม่เอาข้อมูล)
ต้องมีโปรแกรม `pg_dump` ในเครื่อง (เครื่องนี้ยังไม่มี) — ติดตั้ง **PostgreSQL** จาก postgresql.org/download/windows
ตอนติดตั้งเลือกแค่ **Command Line Tools** ก็พอ (เวอร์ชันต้องไม่ต่ำกว่าของ Supabase — ดูที่ Project Settings → Infrastructure)

project จริง → ปุ่ม **Connect** (บนสุด) → **Session pooler** → คัดลอก URI แล้วแทน `[YOUR-PASSWORD]` ด้วยรหัสผ่านฐานข้อมูล
(ลืมรหัส: Project Settings → Database → Reset database password)

```bash
pg_dump "<URI ที่คัดลอก>" --schema-only --schema=public --no-owner --no-privileges -f staging-schema.sql
```

ได้ไฟล์ `staging-schema.sql` = ตาราง ฟังก์ชัน และกฎสิทธิ์ทั้งหมด ไม่มีข้อมูลใด ๆ
(ถ้ามี Docker Desktop จะใช้ `npx supabase db dump -f staging-schema.sql` แทนก็ได้ — คำสั่งนั้นต้องใช้ Docker)

ใน **project ทดสอบ** → SQL Editor → วางเนื้อหา `staging-schema.sql` → Run
(ถ้าฟ้องว่า `schema "public" already exists` ให้ลบบรรทัด `CREATE SCHEMA public;` ในไฟล์ออกแล้วรันใหม่)
แล้ววางและรัน `supabase/2026-09-11-attachments-groups-formdates.sql` อีกไฟล์ (สร้างที่เก็บไฟล์แนบ — ส่วนนี้ไม่อยู่ใน dump)

ลบ `staging-schema.sql` ทิ้งเมื่อเสร็จ

### 2.3 คัดลอกการตั้งค่าฟอร์ม (ไม่มีข้อมูลส่วนตัว)
ใน **project จริง** → SQL Editor รันทีละบรรทัด แล้วคัดลอกผลลัพธ์ (ข้อความ JSON ยาว ๆ)

```sql
select json_agg(t) from companies t;
select json_agg(t) from form_groups t;
select json_agg(t) from access_groups t;
select json_agg(t) from field_options t;
select json_agg(t) from form_settings t;
```

ใน **project ทดสอบ** วางทีละตาราง แทน `<วาง JSON>`

```sql
insert into companies select * from json_populate_recordset(null::companies, '<วาง JSON>');
-- ทำแบบเดียวกันกับ form_groups, access_groups, field_options, form_settings
```

### 2.4 สร้างบัญชี admin ทดสอบ
project ทดสอบ → Authentication → Users → Add user → Create new user
Email `admin@globe.local` (ชื่อผู้ใช้ตอนล็อกอินคือ `admin`) · ตั้งรหัสผ่าน · ติ๊ก Auto Confirm

แล้วรันใน SQL Editor

```sql
insert into profiles (uid, "employeeId", "firstName", "lastName", position, role, "mustChangePassword")
select id, 'admin', 'ผู้ดูแล', 'ทดสอบ', 'IT', 'admin', false from auth.users where email = 'admin@globe.local';
```

พนักงานทดสอบคนอื่นสร้างจากหน้า "เพิ่มพนักงาน" ในระบบทดสอบได้ตามปกติ

### 2.5 ใช้บนเครื่อง
คัดลอก `.env.staging.example` เป็น `.env.staging.local` ใส่ URL และ anon key ของ project ทดสอบ

```bash
npm run dev:staging
```

### 2.6 ใช้บน Vercel (ลิงก์ทดสอบให้คนอื่นลองได้)
Vercel → Project → Settings → Environment Variables

| ชื่อ | Production | Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | ของจริง (เดิม) | ของ project ทดสอบ |
| `VITE_SUPABASE_ANON_KEY` | ของจริง (เดิม) | ของ project ทดสอบ |
| `VITE_APP_ENV` | ไม่ต้องใส่ | `staging` |

ตั้งค่า Preview โดยติ๊กเฉพาะช่อง **Preview** ตอนเพิ่มตัวแปร — ห้ามแก้ของ Production

จากนี้ทุก branch ที่ไม่ใช่ `main` จะได้ลิงก์ Preview ของตัวเองที่ต่อกับฐานข้อมูลทดสอบ
ส่วน `main` ยังขึ้นเว็บจริงเหมือนเดิม

---

## 3. ขั้นตอนเวลาแก้หรือเพิ่มฟีเจอร์

1. **แก้บน branch แยก** ไม่แก้บน `main` ตรง ๆ
   ```bash
   git switch -c feature/ชื่องาน
   ```
2. ดูหน้าตาด้วย **โหมดเดโม** (`npm run dev:demo`)
3. **มีไฟล์ SQL ใหม่ → รันที่ project ทดสอบก่อน** แล้วลองบน `npm run dev:staging` หรือ Preview
4. push branch → Vercel สร้างลิงก์ Preview → ให้ผู้ใช้ลองจริง (ข้อมูลทดสอบ)
5. ผ่านแล้ว: **สำรองข้อมูลจริง** (ข้อ 4) → รัน SQL ที่ project จริง → merge เข้า `main` → ขึ้นเว็บจริง

### กติกาเขียน SQL ให้ปลอดภัย
- **เพิ่มอย่างเดียว** — `add column if not exists`, `create or replace function` ไม่ลบหรือเปลี่ยนชื่อคอลัมน์ที่ใช้อยู่
- **แอปเวอร์ชันเก่าต้องทำงานกับฐานข้อมูลใหม่ได้ และกลับกัน** — แอปในโปรเจกต์นี้มีกลไกรองรับคอลัมน์ที่ยังไม่มีอยู่แล้ว (รัน SQL ก่อนหรือหลัง deploy ก็ไม่พัง)
- ไฟล์ SQL ทุกไฟล์ต้อง **รันซ้ำได้** (ใช้ `if not exists` / `or replace`)
- **ห้าม** `update` / `delete` ข้อมูลจริงในไฟล์ migration ถ้าไม่จำเป็น — ถ้าจำเป็น ลองที่ staging ก่อนและสำรองข้อมูลก่อนเสมอ

---

## 4. สำรองข้อมูลจริงก่อนรัน SQL

แผนฟรีของ Supabase ไม่มีปุ่มกู้คืนข้อมูลย้อนหลัง จึงต้องสำรองเองก่อนรัน SQL ทุกครั้ง
(ใช้ `pg_dump` และ URI เดียวกับข้อ 2.2)

```bash
pg_dump "<URI ของ project จริง>" --schema=public --schema=auth --no-owner --no-privileges -f backup-YYYYMMDD.sql
```

**ไฟล์สำรองมีข้อมูลพนักงานและเอกสารจริง** — เก็บในที่ปลอดภัย (เช่น OneDrive ของบริษัท) ห้ามใส่ใน Git ห้ามส่งทางแชท
ไฟล์แนบ (รูปใบเสร็จ) อยู่ใน Storage แยกต่างหาก ไม่อยู่ในไฟล์สำรองนี้

ถ้าต้องการกู้คืนย้อนหลังได้ทุกวันโดยไม่ต้องสำรองเอง → อัปเกรด Supabase เป็นแผน Pro (มีสำรองอัตโนมัติรายวัน)
