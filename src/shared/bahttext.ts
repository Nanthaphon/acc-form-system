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
  // split into 6-digit groups, high -> low, join with "ล้าน"
  const groups: string[] = []
  let s = String(n)
  while (s.length > 6) {
    groups.unshift(s.slice(-6))
    s = s.slice(0, -6)
  }
  groups.unshift(s)
  return groups.map(g => readGroup(g)).join('ล้าน')
}

export function bahtText(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  // A total can land below zero (a deduction larger than the claim, a subtract
  // column that went past it). The digits used to come from String(-400), whose
  // leading "-" read as undefined — the document printed "undefinedพันสี่ร้อยบาทถ้วน".
  const sign = rounded < 0 ? 'ลบ' : ''
  const abs = Math.abs(rounded)
  const baht = Math.floor(abs)
  const satang = Math.round((abs - baht) * 100)
  if (satang === 0) return sign + readInteger(baht) + 'บาทถ้วน'
  const bahtPart = baht === 0 ? '' : readInteger(baht) + 'บาท'
  return sign + bahtPart + readInteger(satang) + 'สตางค์'
}
