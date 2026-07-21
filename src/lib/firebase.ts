import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}
export const app = initializeApp(config)
export const auth = getAuth(app)
export const db = getFirestore(app)

// secondary app: ใช้สร้างบัญชีพนักงานโดยไม่ทำให้ session admin หลุด (Task 10)
export const secondaryApp = initializeApp(config, 'secondary')
export const secondaryAuth = getAuth(secondaryApp)

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectAuthEmulator(secondaryAuth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
}
