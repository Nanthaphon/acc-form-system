import { auth } from '../lib/firebase'
import {
  signInWithEmailAndPassword, signOut as fbSignOut,
  updatePassword, type User,
} from 'firebase/auth'

const DOMAIN = 'globe.local'
export function employeeIdToEmail(employeeId: string): string {
  return `${employeeId.trim()}@${DOMAIN}`
}

export function loginWithEmployeeId(employeeId: string, password: string) {
  return signInWithEmailAndPassword(auth, employeeIdToEmail(employeeId), password)
}

export function logout() { return fbSignOut(auth) }

export function changeMyPassword(user: User, newPassword: string) {
  return updatePassword(user, newPassword)
}
