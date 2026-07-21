import { db, secondaryAuth } from '../lib/firebase'
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { UserProfile, Role } from '../types/schema'
import { employeeIdToEmail } from './auth'

export interface NewEmployee {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role
}

// สร้างบัญชี Auth ผ่าน secondary app (ไม่ทำ admin session หลุด) + เขียนโปรไฟล์
export async function createEmployee(e: NewEmployee): Promise<string> {
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth, employeeIdToEmail(e.employeeId), e.employeeId, // รหัสเริ่มต้น = รหัสพนักงาน
  )
  const uid = cred.user.uid
  const profile: UserProfile = {
    uid, ...e, mustChangePassword: true, createdAt: Date.now(),
  }
  await setDoc(doc(db, 'users', uid), profile)
  await secondaryAuth.signOut()
  return uid
}

export async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function listEmployees(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => d.data() as UserProfile)
}

export async function setMustChangePassword(uid: string, value: boolean): Promise<void> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists()) await setDoc(doc(db, 'users', uid), { ...snap.data(), mustChangePassword: value })
}
