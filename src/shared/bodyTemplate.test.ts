import { describe, expect, it } from 'vitest'
import { autoValue, blankFor, countDottedBlanks, dotsToTokens, formatTemplateValue, makeToken, parseTemplate, splitOptions, templateFields, selectTokens } from './bodyTemplate'

describe('parseTemplate', () => {
  it('splits text and fields, keeping the text around them', () => {
    expect(parseTemplate('ได้รับเงินจาก {{ผู้จ่าย}} ครบถ้วน')).toEqual([
      { kind: 'text', text: 'ได้รับเงินจาก ' },
      { kind: 'field', field: { key: 'tpl:ผู้จ่าย', label: 'ผู้จ่าย', type: 'text' } },
      { kind: 'text', text: ' ครบถ้วน' },
    ])
  })

  it('reads the date / number type suffix, Thai or English', () => {
    const types = parseTemplate('{{เริ่ม:วันที่}}{{ยอด:ตัวเลข}}{{จบ: date }}{{x:number}}')
      .map(p => p.kind === 'field' ? [p.field.label, p.field.type] : null)
    expect(types).toEqual([['เริ่ม', 'date'], ['ยอด', 'number'], ['จบ', 'date'], ['x', 'number']])
  })

  it('keeps an unknown suffix as part of the name', () => {
    const [p] = parseTemplate('{{เวลา: 10:30}}')
    expect(p).toMatchObject({ kind: 'field', field: { label: 'เวลา: 10:30', type: 'text' } })
  })

  it('leaves nameless braces and plain text alone', () => {
    expect(parseTemplate('ก {{ }} ข')).toEqual([{ kind: 'text', text: 'ก {{ }} ข' }])
    expect(parseTemplate('')).toEqual([])
  })
})

describe('templateFields', () => {
  it('lists each field once across texts, in first-seen order', () => {
    const f = templateFields('{{ก}} {{ข:วันที่}} {{ก}}', undefined, '{{ค:ตัวเลข}} {{ข:วันที่}}')
    expect(f.map(x => x.label)).toEqual(['ก', 'ข', 'ค'])
  })
})

describe('formatTemplateValue / blankFor', () => {
  const text = { key: 'tpl:a', label: 'a', type: 'text' as const }
  const date = { ...text, type: 'date' as const }
  const num = { ...text, type: 'number' as const }

  it('formats dates dd/mm/yyyy and numbers with separators', () => {
    expect(formatTemplateValue(date, '2026-09-11')).toBe('11/09/2026')
    expect(formatTemplateValue(num, '1500')).toBe('1,500.00')
    expect(formatTemplateValue(num, '1,234.567')).toBe('1,234.57')
    expect(formatTemplateValue(num, 'abc')).toBe('abc')
    expect(formatTemplateValue(text, '  สมชาย ')).toBe('สมชาย')
  })

  it('keeps the decimals typed into a number blank (1000.50 is not 1,000.5)', () => {
    expect(formatTemplateValue(num, '1000.50')).toBe('1,000.50')
    expect(formatTemplateValue(num, '1000.5')).toBe('1,000.50')
    expect(formatTemplateValue(num, '100.10')).toBe('100.10')
    expect(formatTemplateValue(num, '0.5')).toBe('0.50')
    expect(formatTemplateValue(num, '-20.4')).toBe('-20.40')
  })

  it('returns empty for nothing entered, which prints as dots', () => {
    expect(formatTemplateValue(text, '   ')).toBe('')
    expect(formatTemplateValue(text, undefined)).toBe('')
    expect(blankFor(text)).toMatch(/^\.{10,}$/)
    expect(blankFor(date)).toMatch(/^\.{10,}$/)
  })
})

describe('makeToken', () => {
  it('builds a token and strips characters that would break it', () => {
    expect(makeToken('ผู้จ่าย')).toBe('{{ผู้จ่าย}}')
    expect(makeToken('เริ่ม', 'date')).toBe('{{เริ่ม:วันที่}}')
    expect(makeToken(' ยอด{x}:1 ', 'number')).toBe('{{ยอดx1:ตัวเลข}}')
    expect(makeToken(' {:} ')).toBe('')
  })
})

describe('dropdown blanks', () => {
  it('reads the choices after เลือก= (or select=)', () => {
    const [p] = parseTemplate('{{วิธีชำระ:เลือก=เงินสด|โอนเงิน|เช็ค}}')
    expect(p).toEqual({ kind: 'field', field: { key: 'tpl:วิธีชำระ', label: 'วิธีชำระ', type: 'select', options: ['เงินสด', 'โอนเงิน', 'เช็ค'] } })
    const [q] = parseTemplate('{{x: select = a | b }}')
    expect(q).toMatchObject({ field: { label: 'x', type: 'select', options: ['a', 'b'] } })
  })

  it('lets a choice hold a colon, and drops empty or repeated ones', () => {
    const [p] = parseTemplate('{{รอบ:เลือก=10:00|| 13:00 |10:00}}')
    expect(p).toMatchObject({ field: { label: 'รอบ', type: 'select', options: ['10:00', '13:00'] } })
  })

  it('is an ordinary blank when there is nothing to choose from', () => {
    const [p] = parseTemplate('{{วิธีชำระ:เลือก=}}')
    expect(p).toMatchObject({ field: { label: 'วิธีชำระ', type: 'text' } })
  })

  it('builds the token from choices typed with commas or new lines', () => {
    expect(splitOptions('เงินสด, โอนเงิน,\nเช็ค,,')).toEqual(['เงินสด', 'โอนเงิน', 'เช็ค'])
    expect(makeToken('วิธี:ชำระ', 'select', ['เงินสด', 'a|b', '{x}'])).toBe('{{วิธีชำระ:เลือก=เงินสด|ab|x}}')
    expect(makeToken('วิธีชำระ', 'select', [' '])).toBe('')
  })

  it('prints the choice made, or dots to circle by hand', () => {
    const f = { key: 'tpl:a', label: 'a', type: 'select' as const, options: ['เงินสด'] }
    expect(formatTemplateValue(f, 'เงินสด')).toBe('เงินสด')
    expect(formatTemplateValue(f, '')).toBe('')
    expect(blankFor(f)).toMatch(/^\.{10,}$/)
  })
})

describe('dotsToTokens', () => {
  it('names each blank after the word before it and guesses the type', () => {
    const src = 'ได้รับเงินจาก ..........\nครบถ้วนตามจำนวนเงิน ....... บาท'
    expect(countDottedBlanks(src)).toBe(2)
    expect(dotsToTokens(src)).toBe('ได้รับเงินจาก {{ได้รับเงินจาก}}\nครบถ้วนตามจำนวนเงิน {{ครบถ้วนตามจำนวนเงิน:ตัวเลข}} บาท')
  })

  it('makes date fields and keeps repeated names apart', () => {
    expect(dotsToTokens('ตั้งแต่วันที่ ..... ถึงวันที่ ..... และวันที่ ..... หรือวันที่ .....'))
      .toBe('ตั้งแต่วันที่ {{ตั้งแต่วันที่:วันที่}} ถึงวันที่ {{ถึงวันที่:วันที่}} และวันที่ {{และวันที่:วันที่}} หรือวันที่ {{หรือวันที่:วันที่}}')
    expect(dotsToTokens('ชื่อ ..... ชื่อ .....')).toBe('ชื่อ {{ชื่อ}} ชื่อ {{ชื่อ 2}}')
  })

  it('numbers blanks with no usable word before them', () => {
    expect(dotsToTokens('....... บาท')).toBe('{{ช่องที่ 1}} บาท')
    expect(dotsToTokens('ก{{x}}.....')).toBe('ก{{x}}{{ช่องที่ 1}}')
  })

  it('accepts ellipsis characters and ignores a normal "..."', () => {
    expect(dotsToTokens('จาก ……… ครับ...')).toBe('จาก {{จาก}} ครับ...')
    expect(countDottedBlanks('ครับ...')).toBe(0)
  })
})

describe('automatic fields', () => {
  it('reads a name the system can fill, and leaves any other as an ordinary blank', () => {
    const [p] = parseTemplate('{{ชื่อบริษัท:อัตโนมัติ}}')
    expect(p).toEqual({ kind: 'field', field: { key: 'auto:company', label: 'ชื่อบริษัท', type: 'auto', source: 'company' } })
    expect(parseTemplate('{{ยอดเงิน: auto }}')[0]).toMatchObject({ field: { type: 'auto', source: 'amount' } })
    expect(parseTemplate('{{เลขบัญชี:อัตโนมัติ}}')[0]).toMatchObject({ field: { label: 'เลขบัญชี', type: 'text' } })
  })

  it('writes the token the toolbar inserts', () => {
    expect(makeToken('ชื่อบริษัท', 'auto')).toBe('{{ชื่อบริษัท:อัตโนมัติ}}')
  })

  it('shows what the document holds, and nothing while it holds nothing', () => {
    const v = { company: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', amount: 1500, requester: 'สมชาย ใจดี', position: 'IT' }
    expect(autoValue('company', v)).toBe('บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด')
    expect(autoValue('amount', v)).toBe('1,500.00')
    expect(autoValue('amountText', v)).toBe('หนึ่งพันห้าร้อยบาทถ้วน')
    expect(autoValue('requester', v)).toBe('สมชาย ใจดี')
    expect(autoValue('amount', { amount: 0 })).toBe('')
    expect(autoValue('amountText', { amount: 0 })).toBe('')
    expect(autoValue('company', { company: null })).toBe('')
  })
})

describe('selectTokens', () => {
  it('finds each dropdown and where its token sits', () => {
    const text = 'จ่าย {{ธนาคาร:เลือก=กรุงเทพ|กสิกร}} บัญชี {{เลขบัญชี}}'
    const [t] = selectTokens(text)
    expect(selectTokens(text)).toHaveLength(1)
    expect(t).toMatchObject({ label: 'ธนาคาร', options: ['กรุงเทพ', 'กสิกร'] })
    expect(text.slice(t.start, t.end)).toBe('{{ธนาคาร:เลือก=กรุงเทพ|กสิกร}}')
  })
})
