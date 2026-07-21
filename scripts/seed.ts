// Seed companies + the first admin account. Run ONCE against the emulator or production.
// Usage: npx tsx scripts/seed.ts
// (Requires .env.local to point at the target: VITE_USE_EMULATOR=true for the local emulator,
//  or real Firebase config + VITE_USE_EMULATOR=false for production.)
//
// NOTE: creating the admin uses a password. Do this yourself — verify the values below first.
import { secondaryAuth, db } from '../src/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { employeeIdToEmail } from '../src/data/auth'

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
    secondaryAuth,
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
