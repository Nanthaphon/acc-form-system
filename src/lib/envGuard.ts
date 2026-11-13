// ระบบทดสอบต้องไม่มีทางไปแตะฐานข้อมูลจริง
//
// Vite falls back to .env.local — the real database — whenever the file for a
// mode is missing or incomplete. A page that believes it is a test system,
// writing to live data, is the one mistake this project cannot undo, so each
// test mode is checked before the client is created.
//
// `localdb` is deliberately not named `local`: .env.local is Vite's override
// for every mode, so a mode by that name would read the real values.
const PRODUCTION_REF = 'wrujttmqawcvcrqqhcno'
const LOCAL_HOST = /127\.0\.0\.1|localhost|\[::1\]/

interface Fix { title: string; problem: string; steps: string[] }

export function assertTestDatabase(url: string | undefined, appEnv: string | undefined, mode: string): void {
  const fix = mode === 'staging' ? stagingProblem(url, appEnv)
    : mode === 'localdb' ? localProblem(url)
    : null
  if (!fix) return
  showSetupPage(fix)
  throw new Error(`${fix.title} — ${fix.problem} (ดู docs/environments.md)`)
}

function stagingProblem(url: string | undefined, appEnv: string | undefined): Fix | null {
  const problem = !url || url.includes('<')
    ? 'ยังไม่ได้ใส่ URL ของฐานข้อมูลทดสอบ'
    : String(url).includes(PRODUCTION_REF) ? 'ค่าที่ใส่ไว้ยังเป็นฐานข้อมูลจริง'
    : appEnv !== 'staging' ? 'ยังไม่ได้ใส่ VITE_APP_ENV=staging'
    : null
  return problem ? {
    title: 'ยังตั้งค่าฐานข้อมูลทดสอบไม่เสร็จ',
    problem,
    steps: [
      'สร้าง project ทดสอบที่ supabase.com (แผนฟรีมีได้ 2 project)',
      'รัน <code>npm run staging:sql</code> แล้วก๊อปไฟล์ที่ได้ไปวางใน SQL Editor ของ project นั้น → Run',
      'เปิดไฟล์ <code>.env.staging.local</code> ใส่ Project URL กับ anon key ของ project ทดสอบ',
      'รัน <code>npm run dev:staging</code> ใหม่อีกครั้ง',
    ],
  } : null
}

function localProblem(url: string | undefined): Fix | null {
  if (url && LOCAL_HOST.test(url)) return null
  return {
    title: 'ยังไม่ได้เปิดฐานข้อมูลในเครื่อง',
    problem: !url || url.includes('<')
      ? 'ยังไม่มีไฟล์ .env.localdb — ฐานข้อมูลในเครื่องยังไม่ได้เปิด'
      : 'ค่าที่อ่านได้ไม่ได้ชี้มาที่เครื่องนี้ (อาจเผลออ่าน .env.local ของระบบจริง)',
    steps: [
      'ติดตั้งและเปิด Docker Desktop ให้ขึ้นว่า Running',
      'รัน <code>npm run local:start</code> — ครั้งแรกจะดาวน์โหลดสักพัก',
      'เมื่อขึ้นว่าพร้อมใช้งานแล้ว รัน <code>npm run dev:local</code> อีกครั้ง',
    ],
  }
}

function showSetupPage(fix: Fix): void {
  if (typeof document === 'undefined') return
  document.title = fix.title
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F9FA;padding:24px;
                font-family:'Bai Jamjuree',system-ui,sans-serif;color:#1C1917">
      <div style="max-width:620px;width:100%;background:#fff;border:1px solid #E7E5E4;border-radius:12px;padding:28px 30px;
                  box-shadow:0 20px 50px -28px rgba(22,32,36,.25)">
        <div style="display:inline-block;background:#FBF3E4;color:#8A6520;font-size:13px;font-weight:600;
                    padding:4px 10px;border-radius:999px;margin-bottom:14px">ระบบทดสอบ</div>
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700">${fix.title}</h1>
        <p style="margin:0 0 18px;color:#57534E;font-size:14px;line-height:1.7">
          ${fix.problem} — ระบบจึงไม่เปิดให้ใช้ เพื่อไม่ให้เผลอเขียนทับฐานข้อมูลจริง
        </p>
        <ol style="margin:0 0 18px;padding-left:22px;list-style:decimal;color:#292524;font-size:14px;line-height:2">
          ${fix.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
        <p style="margin:0;color:#78716C;font-size:13px">ขั้นตอนเต็ม: docs/environments.md</p>
      </div>
    </div>`
    .replace(/<code>/g, '<code style="background:#F5F5F4;padding:2px 6px;border-radius:6px">')
}
