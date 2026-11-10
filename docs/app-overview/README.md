# ภาพสรุประบบ Acc Documents (1 หน้า)

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `acc-documents-overview.png` | ภาพพร้อมใช้ 3508×2480 px (A4 แนวนอน 300 dpi) — ส่งต่อ/แปะสไลด์/พิมพ์ |
| `acc-documents-overview.pdf` | A4 แนวนอน 1 หน้า — พิมพ์หรือแนบอีเมล |
| `acc-documents-overview.html` | **ต้นฉบับที่แก้ไขได้** — แก้ข้อความในไฟล์นี้ แล้วสร้างภาพใหม่ |

## แก้ข้อความ
เปิด `acc-documents-overview.html` ด้วยโปรแกรมแก้ข้อความ (เช่น VS Code) แก้ข้อความไทยตรง ๆ
ดูผลได้โดยเปิดไฟล์ในเบราว์เซอร์ (ต้องต่ออินเทอร์เน็ต เพื่อโหลดฟอนต์ Bai Jamjuree และไอคอน)

ป้าย **"รอเปิดใช้"** = ทำเสร็จแล้วแต่ยังไม่เปิดในระบบจริง (ณ 10/11/2026):
- แจ้งเตือนอีเมล — ต้อง deploy Supabase function `notify-signers`
- ยกเลิก / ออกฉบับแก้ — ต้องรัน `supabase/2026-10-28-void-documents.sql`

เปิดใช้แล้วให้ลบ `<span class="soon">…</span>` ที่เกี่ยวข้องออก

## สร้างภาพใหม่ (PowerShell ในโฟลเดอร์นี้)
```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$src  = "file:///" + ((Resolve-Path .\acc-documents-overview.html).Path -replace '\\','/')
& $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=10000 --window-size=1754,1240 --screenshot="$PWD\acc-documents-overview.png" $src
& $edge --headless=new --disable-gpu --virtual-time-budget=10000 --no-pdf-header-footer --print-to-pdf="$PWD\acc-documents-overview.pdf" $src
```
