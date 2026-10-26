# ตั้งค่าอีเมลแจ้งเตือน "เอกสารรอเซ็น"

เมื่อผู้เบิกกด **เซ็น / ส่งเซ็น** แล้วเลือกผู้อนุมัติ ระบบจะส่งอีเมลหาผู้อนุมัติคนนั้นทันที
อีเมลมีเลขที่เอกสาร แบบฟอร์ม ผู้เบิก จำนวนเงิน และปุ่ม **เปิดเอกสารรอเซ็น**

ส่งผ่าน Microsoft 365 ของบริษัท (Microsoft Graph) จึงไม่ต้องแก้ DNS
ถ้ายังไม่ได้ตั้งค่า ระบบทำงานเหมือนเดิมทุกอย่าง แค่ไม่มีอีเมลออกไป

ใช้เวลารวมประมาณ 20–30 นาที แบ่งเป็น 4 ส่วน

| ส่วน | ใครทำ | ทำที่ไหน |
|---|---|---|
| 1. สร้างแอปส่งเมล | ผู้ดูแล Microsoft 365 (Global Admin) | entra.microsoft.com |
| 2. เพิ่มคอลัมน์อีเมล | ผู้ดูแล Supabase | Supabase → SQL Editor |
| 3. ใส่รหัสและติดตั้งตัวส่งเมล | ผู้ดูแล Supabase | Supabase → Edge Functions |
| 4. กรอกอีเมลพนักงาน | Admin ของระบบ | หน้าพนักงาน / นำเข้า Excel |

---

## 1. สร้างแอปส่งเมลใน Microsoft 365

> ต้องใช้บัญชี **Global Administrator** (หรือ Privileged Role Administrator) เพราะขั้นตอนที่ 1.4 ต้องอนุญาตในนามองค์กร

### 1.1 เลือกกล่องอีเมลผู้ส่ง
แนะนำ **Shared mailbox** เช่น `acc-documents@บริษัท.co.th` (ไม่เสีย license)
สร้างได้ที่ admin.microsoft.com → Teams & groups → Shared mailboxes → Add a shared mailbox
หรือใช้กล่องอีเมลที่มีอยู่แล้วก็ได้

### 1.2 ลงทะเบียนแอป
1. เข้า https://entra.microsoft.com → **Applications → App registrations → New registration**
2. Name: `Acc Documents Mail`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URI: เว้นว่าง → กด **Register**
5. จดค่า 2 ค่าจากหน้า Overview
   - **Application (client) ID** → ใช้เป็น `MS_CLIENT_ID`
   - **Directory (tenant) ID** → ใช้เป็น `MS_TENANT_ID`

### 1.3 สร้างรหัสลับ
1. เมนู **Certificates & secrets → Client secrets → New client secret**
2. Description: `Supabase` · Expires: **24 months** → Add
3. คัดลอกช่อง **Value** ทันที (ออกจากหน้านี้แล้วจะดูไม่ได้อีก) → ใช้เป็น `MS_CLIENT_SECRET`

> รหัสนี้หมดอายุตามที่ตั้ง — ลงปฏิทินไว้ สร้างใหม่ก่อนหมดแล้วเปลี่ยนค่าใน Supabase (ข้อ 3.1)

### 1.4 ให้สิทธิ์ส่งอีเมล
1. เมนู **API permissions → Add a permission → Microsoft Graph → Application permissions**
2. ค้น `Mail.Send` → ติ๊ก → **Add permissions**
3. กด **Grant admin consent for (ชื่อบริษัท)** → สถานะต้องเป็นเครื่องหมายถูกสีเขียว

### 1.5 (แนะนำ) จำกัดให้ส่งได้จากกล่องเดียว
สิทธิ์ `Mail.Send` แบบ Application ส่งในนามกล่องไหนในบริษัทก็ได้
ถ้าต้องการจำกัดให้ส่งได้จากกล่อง `acc-documents@…` เท่านั้น ให้ IT ใช้ Exchange Online PowerShell

```powershell
Connect-ExchangeOnline
New-DistributionGroup -Name "Acc Documents Mail Senders" -Type Security -Members acc-documents@บริษัท.co.th
New-ApplicationAccessPolicy -AppId <MS_CLIENT_ID> -PolicyScopeGroupId "Acc Documents Mail Senders" -AccessRight RestrictAccess -Description "Acc Documents ส่งเมลจากกล่องเดียว"
Test-ApplicationAccessPolicy -AppId <MS_CLIENT_ID> -Identity acc-documents@บริษัท.co.th
```

`Test-ApplicationAccessPolicy` ต้องตอบ `AccessCheckResult : Granted` (นโยบายอาจใช้เวลาสักครู่ถึงจะมีผล)

---

## 2. เพิ่มคอลัมน์อีเมลในฐานข้อมูล

Supabase → **SQL Editor** → วางเนื้อหาไฟล์ `supabase/2026-10-26-employee-email.sql` → **Run**

(เพิ่มคอลัมน์ `email` ในตาราง `profiles` อย่างเดียว ไม่แตะข้อมูลเดิม รันซ้ำได้)

---

## 3. ใส่รหัสและติดตั้งตัวส่งเมล

### 3.1 ใส่รหัส (Secrets)
Supabase → **Edge Functions → Secrets** → เพิ่มทีละค่า

| Name | Value |
|---|---|
| `MS_TENANT_ID` | Directory (tenant) ID จากข้อ 1.2 |
| `MS_CLIENT_ID` | Application (client) ID จากข้อ 1.2 |
| `MS_CLIENT_SECRET` | Value จากข้อ 1.3 |
| `MAIL_SENDER` | กล่องผู้ส่งจากข้อ 1.1 เช่น `acc-documents@บริษัท.co.th` |
| `APP_URL` | (ไม่ใส่ก็ได้) ค่าเริ่มต้น `https://acc-form-system.vercel.app` |

### 3.2 ติดตั้งฟังก์ชัน `notify-signers`
เปิด Terminal ที่โฟลเดอร์โปรเจกต์ แล้วรัน (ครั้งแรกจะเปิดเบราว์เซอร์ให้ล็อกอิน Supabase)

```bash
npx supabase login
npx supabase functions deploy notify-signers --project-ref <PROJECT_REF>
```

`<PROJECT_REF>` คือรหัสโปรเจกต์ ดูได้จาก URL ของ Supabase Dashboard
(`https://supabase.com/dashboard/project/<PROJECT_REF>`)

ไม่สะดวกใช้ Terminal: Supabase → **Edge Functions → Deploy a new function → Via Editor**
ตั้งชื่อ `notify-signers` แล้วสร้าง 2 ไฟล์ให้ตรงกับในโปรเจกต์ —
`index.ts` และ `mail.ts` จากโฟลเดอร์ `supabase/functions/notify-signers/` → **Deploy**

ตั้งค่า **Verify JWT** ไว้ตามค่าเริ่มต้น (เปิด) — ฟังก์ชันรับเฉพาะคนที่ล็อกอินอยู่ และส่งได้เฉพาะเอกสารของตัวเอง

---

## 4. กรอกอีเมลพนักงาน

อีเมลนี้ใช้ **แจ้งเตือนอย่างเดียว** — การเข้าระบบยังใช้รหัสพนักงานเหมือนเดิม กรอกผิดก็ไม่ทำให้ใครเข้าระบบไม่ได้

เลือกวิธีใดก็ได้
- **ทีละคน**: Admin → พนักงาน → แก้ไข → ช่อง **อีเมล**
- **ทั้งบริษัททีเดียว**: Admin → นำเข้าจากไฟล์ → ดาวน์โหลดไฟล์ Excel ใหม่ (มีคอลัมน์ `email` ท้ายสุด)
  ใส่รหัสพนักงาน ชื่อ นามสกุล บริษัท และอีเมล → อัปโหลด
  คนที่มีบัญชีอยู่แล้วจะ **อัปเดตเฉพาะอีเมล** ข้อมูลอื่นไม่ถูกแก้
- **พนักงานกรอกเอง**: เมนูข้อมูลของฉัน → ช่อง **อีเมล**

ผู้อนุมัติที่ยังไม่มีอีเมล ยังเห็นเอกสารในเมนู "ฟอร์มเอกสารรอเซ็น" ตามปกติ
และหลังกดส่ง ผู้เบิกจะเห็นข้อความว่า "… ยังไม่มีอีเมลในระบบ"

---

## ทดสอบ

1. ใส่อีเมลของตัวเองให้บัญชีทดสอบบัญชีหนึ่ง (บัญชี A)
2. ล็อกอินอีกบัญชี (บัญชี B) → ประวัติ → เอกสารใดก็ได้ → **เซ็น / ส่งเซ็น** → เลือกบัญชี A → ส่ง
3. ข้อความยืนยันต้องมี "แจ้งทางอีเมลแล้ว 1 คน" และอีเมลเข้ากล่องของบัญชี A ภายในไม่กี่วินาที

### ถ้าไม่มีอีเมลเข้า
Supabase → **Edge Functions → notify-signers → Logs**

| สิ่งที่เห็นใน Logs | สาเหตุ / วิธีแก้ |
|---|---|
| `secret MS_… is not set` | ยังไม่ได้ใส่ Secret ข้อ 3.1 |
| `Microsoft sign-in failed: … AADSTS7000215` | รหัสลับผิดหรือหมดอายุ → สร้างใหม่ (ข้อ 1.3) |
| `sendMail 403` | ยังไม่กด Grant admin consent (ข้อ 1.4) หรือกล่องผู้ส่งไม่อยู่ในนโยบายข้อ 1.5 |
| `sendMail 404` | `MAIL_SENDER` สะกดผิด หรือกล่องนั้นไม่มีจริง |
| ไม่มี Log เลย | ยังไม่ได้ติดตั้งฟังก์ชัน (ข้อ 3.2) |

ถ้าอีเมลเข้าไปอยู่ใน Junk ให้ผู้รับกด "Not junk" หรือให้ IT เพิ่มกล่องผู้ส่งเป็น Safe sender ทั้งองค์กร

---

## ทำงานอย่างไร (สำหรับผู้พัฒนา)

- `src/components/AssignSignersModal.tsx` — หลัง `assign_signers` สำเร็จ เรียก `notifySigners(submissionId, uids)` (`src/data/notify.ts`) เฉพาะคนที่ **เพิ่งถูกส่งให้** — คนที่รออยู่ก่อนแล้วไม่ได้รับซ้ำ
- `supabase/functions/notify-signers/index.ts` — ตรวจว่าผู้เรียกเป็นเจ้าของเอกสาร, เลือกเฉพาะช่องที่ยัง `pending` ของคนในรายชื่อ (ไม่รวมผู้เบิกเอง), อ่านอีเมลด้วย service role, ขอ token แบบ client credentials แล้ว `POST /users/{MAIL_SENDER}/sendMail`
- `supabase/functions/notify-signers/mail.ts` — เลือกผู้รับ + เนื้อหาอีเมล (มีเทสต์ใน `mail.test.ts`)
- ส่งเมลไม่สำเร็จไม่กระทบการส่งเซ็น — ผู้เบิกเห็นแค่ข้อความว่าส่งอีเมลถึงใครไม่สำเร็จ
