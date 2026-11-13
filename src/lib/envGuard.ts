// `npm run dev:staging` must never reach the real database. Vite falls back to
// .env.local when .env.staging.local is missing or incomplete, so a page that
// believes it is the test system would be writing to live data — the one
// mistake this project cannot undo.
//
// The check used to throw, which left a white page and a line in the console.
// It now says what is wrong and what to do about it, on the page itself.
const PRODUCTION_REF = 'wrujttmqawcvcrqqhcno'

export function assertStagingIsSeparate(url: string | undefined, appEnv: string | undefined, mode: string): void {
  if (mode !== 'staging') return
  const problem = !url || url.includes('<')
    ? 'ยังไม่ได้ใส่ URL ของฐานข้อมูลทดสอบ'
    : String(url).includes(PRODUCTION_REF)
      ? 'ค่าที่ใส่ไว้ยังเป็นฐานข้อมูลจริง'
      : appEnv !== 'staging'
        ? 'ยังไม่ได้ใส่ VITE_APP_ENV=staging'
        : null
  if (!problem) return

  showSetupPage(problem)
  throw new Error(`ระบบทดสอบยังไม่พร้อม — ${problem} (ดู docs/environments.md)`)
}

function showSetupPage(problem: string): void {
  if (typeof document === 'undefined') return
  document.title = 'ยังตั้งค่าระบบทดสอบไม่เสร็จ'
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F9FA;padding:24px;
                font-family:'Bai Jamjuree',system-ui,sans-serif;color:#1C1917">
      <div style="max-width:620px;width:100%;background:#fff;border:1px solid #E7E5E4;border-radius:12px;padding:28px 30px;
                  box-shadow:0 20px 50px -28px rgba(22,32,36,.25)">
        <div style="display:inline-block;background:#FBF3E4;color:#8A6520;font-size:13px;font-weight:600;
                    padding:4px 10px;border-radius:999px;margin-bottom:14px">ระบบทดสอบ (staging)</div>
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700">ยังตั้งค่าฐานข้อมูลทดสอบไม่เสร็จ</h1>
        <p style="margin:0 0 18px;color:#57534E;font-size:14px;line-height:1.7">
          ${problem} — ระบบจึงไม่เปิดให้ใช้ เพื่อไม่ให้เผลอเขียนทับฐานข้อมูลจริง
        </p>
        <ol style="margin:0 0 18px;padding-left:22px;list-style:decimal;color:#292524;font-size:14px;line-height:2">
          <li>สร้าง project ทดสอบที่ supabase.com (แผนฟรีมีได้ 2 project)</li>
          <li>รัน <code style="background:#F5F5F4;padding:2px 6px;border-radius:6px">npm run staging:sql</code>
              แล้วก๊อปไฟล์ที่ได้ไปวางใน SQL Editor ของ project นั้น → Run</li>
          <li>เปิดไฟล์ <code style="background:#F5F5F4;padding:2px 6px;border-radius:6px">.env.staging.local</code>
              ใส่ Project URL กับ anon key ของ project ทดสอบ</li>
          <li>รัน <code style="background:#F5F5F4;padding:2px 6px;border-radius:6px">npm run dev:staging</code> ใหม่อีกครั้ง</li>
        </ol>
        <p style="margin:0;color:#78716C;font-size:13px">ขั้นตอนเต็ม: docs/environments.md</p>
      </div>
    </div>`
}
