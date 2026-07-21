import { db } from '../lib/firebase'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { Company } from '../types/schema'

export async function getCompany(id: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, 'companies', id))
  return snap.exists() ? ({ id, ...snap.data() } as Company) : null
}
export async function listCompanies(): Promise<Company[]> {
  const snap = await getDocs(collection(db, 'companies'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))
}
export async function upsertCompany(c: Company): Promise<void> {
  await setDoc(doc(db, 'companies', c.id), { name: c.name, address: c.address })
}
