const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

function readGroup(numStr: string): string {
  // numStr ยาว 1-6 หลัก (กลุ่มก่อน "ล้าน")
  let result = ''
  const len = numStr.length
  for (let i = 0; i < len; i++) {
    const d = Number(numStr[i])
    const place = len - i - 1
    if (d === 0) continue
    if (place === 1 && d === 1) result += 'สิบ'
    else if (place === 1 && d === 2) result += 'ยี่สิบ'
    else if (place === 0 && d === 1 && len > 1) result += 'เอ็ด'
    else result += DIGITS[d] + PLACES[place]
  }
  return result
}

function readInteger(n: number): string {
  if (n === 0) return 'ศูนย์'
  let s = String(n)
  let result = ''
  // แยกทีละ 6 หลักด้วยคำว่า "ล้าน"
  while (s.length > 6) {
    const tail = s.slice(-6)
    s = s.slice(0, -6)
    result = readGroup(tail) + 'ล้าน' + result
  }
  result = readGroup(s) + result
  return result
}

export function bahtText(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const baht = Math.floor(rounded)
  const satang = Math.round((rounded - baht) * 100)
  if (satang === 0) return readInteger(baht) + 'บาทถ้วน'
  const bahtPart = baht === 0 ? '' : readInteger(baht) + 'บาท'
  return bahtPart + readInteger(satang) + 'สตางค์'
}
