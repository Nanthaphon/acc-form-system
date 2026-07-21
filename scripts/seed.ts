// Seed companies + the first admin account. Run ONCE against the emulator or production.
// Usage: npx tsx scripts/seed.ts   (or: npm run seed)
//
// Default target = local emulator (localhost:9099 auth / localhost:8080 firestore),
// using projectId from FB_PROJECT_ID env var (defaults to 'demo-expense-form').
//
// For production: set SEED_TARGET=production and provide FB_API_KEY, FB_AUTH_DOMAIN,
// FB_PROJECT_ID, FB_APP_ID env vars.
//
// NOTE: creating the admin uses a password. Do this yourself — verify the values below first.
//
// employeeIdToEmail is inlined here (rather than imported from src/data/auth) because
// src/data/auth.ts imports src/lib/firebase.ts, which reads import.meta.env.VITE_FB_*
// at module load time — that's undefined under Node/tsx and would crash this script.
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore'

function employeeIdToEmail(employeeId: string): string {
  return `${employeeId.trim()}@globe.local`
}

const isProduction = process.env.SEED_TARGET === 'production'
const projectId = process.env.FB_PROJECT_ID || 'demo-expense-form'

// The Firebase Auth SDK validates apiKey's shape client-side even when talking to the
// emulator, so a placeholder is required (the emulator itself ignores its value).
const config = isProduction
  ? {
      apiKey: process.env.FB_API_KEY,
      authDomain: process.env.FB_AUTH_DOMAIN,
      projectId: process.env.FB_PROJECT_ID,
      appId: process.env.FB_APP_ID,
    }
  : {
      apiKey: 'demo-emulator-key',
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
    }

const app = initializeApp(config)
const auth = getAuth(app)
const db = getFirestore(app)

if (!isProduction) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
}

async function main() {
  // --- Companies (edit names/addresses to match reality before running) ---
  await setDoc(doc(db, 'companies', 'globe'), {
    name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด',
    address: '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ',
  })
  await setDoc(doc(db, 'companies', 'besthrm'), {
    name: 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด',
    address: 'REPLACE_ADDRESS', // TODO: ใส่ที่อยู่จริงของเบสท์ เอช อาร์ เอ็ม
  })

  // --- First admin (employeeId: admin001, initial password = admin001) ---
  const cred = await createUserWithEmailAndPassword(
    auth,
    employeeIdToEmail('admin001'),
    'admin001',
  )
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    employeeId: 'admin001',
    firstName: 'ผู้ดูแล',
    lastName: 'ระบบ',
    position: 'Admin',
    department: 'IT',
    companyId: 'globe',
    defaultJob: '',
    bankAccount: '',
    role: 'admin',
    mustChangePassword: true,
    createdAt: Date.now(),
  })

  console.log('seed done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
