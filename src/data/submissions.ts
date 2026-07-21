import { db } from '../lib/firebase'
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
  runTransaction, updateDoc, increment,
} from 'firebase/firestore'
import type { Submission } from '../types/schema'
import { formatDocNumber } from '../shared/docNumber'

const FORM_PREFIX: Record<string, string> = { 'expense-claim': 'GAC6709-003' }

export type SubmissionDraft = Omit<Submission,
  'id' | 'docNumber' | 'createdAt' | 'updatedAt' | 'printCount' | 'lastPrintedAt'>

export async function createSubmission(dr: SubmissionDraft): Promise<Submission> {
  const now = Date.now()
  const id = doc(collection(db, 'submissions')).id
  const counterRef = doc(db, 'counters', dr.formType)
  const submissionRef = doc(db, 'submissions', id)

  const docNumber = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef)
    const last = counterSnap.exists() ? (counterSnap.data().lastNumber as number) : 0
    const next = last + 1
    const num = formatDocNumber(FORM_PREFIX[dr.formType], new Date(now), next)
    tx.set(counterRef, { lastNumber: next }, { merge: true })
    const full: Submission = { ...dr, id, docNumber: num, createdAt: now, updatedAt: now, printCount: 0, lastPrintedAt: null }
    tx.set(submissionRef, full)
    return num
  })

  return { ...dr, id, docNumber, createdAt: now, updatedAt: now, printCount: 0, lastPrintedAt: null }
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const snap = await getDoc(doc(db, 'submissions', id))
  return snap.exists() ? (snap.data() as Submission) : null
}

export async function updateSubmission(id: string, s: Submission): Promise<void> {
  await updateDoc(doc(db, 'submissions', id), {
    header: s.header, items: s.items, totals: s.totals, updatedAt: Date.now(),
  })
}

export async function incrementPrint(id: string): Promise<void> {
  const ref = doc(db, 'submissions', id)
  await updateDoc(ref, { printCount: increment(1), lastPrintedAt: Date.now() })
}

export async function listMySubmissions(uid: string): Promise<Submission[]> {
  const q = query(collection(db, 'submissions'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Submission)
}

export async function listAllSubmissions(): Promise<Submission[]> {
  const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Submission)
}
