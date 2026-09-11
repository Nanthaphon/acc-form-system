import { describe, expect, it } from 'vitest'
import { blankFor, countDottedBlanks, dotsToTokens, formatTemplateValue, makeToken, parseTemplate, templateFields } from './bodyTemplate'

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
    expect(formatTemplateValue(num, '1500')).toBe('1,500')
    expect(formatTemplateValue(num, '1,234.567')).toBe('1,234.57')
    expect(formatTemplateValue(num, 'abc')).toBe('abc')
    expect(formatTemplateValue(text, '  สมชาย ')).toBe('สมชาย')
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
