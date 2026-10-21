import { updateProfile } from '../data/users'

// A data URL this long is roughly a 300KB image — large enough for a clean
// signature, small enough to sit inside every document that carries it.
export const MAX_SIGNATURE_DATA_URL = 400_000

// What is wrong with a picked file, in Thai, ready to show.
export class SignatureFileError extends Error {}

// A picked or dropped file as the data URL a profile keeps, or a reason it
// cannot be one (in Thai, ready to show).
export function readSignatureFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new SignatureFileError('เลือกไฟล์รูปภาพ (PNG หรือ JPG)')); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      if (dataUrl.length > MAX_SIGNATURE_DATA_URL) reject(new SignatureFileError('ไฟล์ใหญ่เกินไป แนะนำลายเซ็นเล็กกว่า ~300KB'))
      else resolve(dataUrl)
    }
    reader.onerror = () => reject(new SignatureFileError('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

// Read the file and keep it as this person's signature.
export async function saveSignatureFile(uid: string, file: File): Promise<void> {
  await updateProfile(uid, { signatureImage: await readSignatureFile(file) })
}
