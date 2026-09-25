// Just enough .xlsx writing to build the employee import template.
//
// The template has to carry this system's own lists — its departments, its
// companies, its groups — in its dropdowns, and those lists change from one
// day to the next. A file sitting in public/ cannot know them, so the
// workbook is built here, in the browser, at the moment it is downloaded.
//
// What it can do is exactly what the template uses: several sheets of text,
// a small fixed set of cell styles, column widths and column styles, a frozen
// header row, and data validation (dropdown lists and a minimum length).
// Anything else — formulas, numbers, dates, comments, images — is out of
// scope on purpose.

export type Style =
  | 'body' | 'head' | 'headLeft' | 'req' | 'text' | 'reqText'
  | 'title' | 'section' | 'bold' | 'wrap' | 'muted' | 'reqLabel' | 'step' | 'note'

// Index into <cellXfs> below. The order here and there must match.
const STYLE_INDEX: Record<Style, number> = {
  body: 0, head: 1, headLeft: 2, req: 3, text: 4, reqText: 5,
  title: 6, section: 7, bold: 8, wrap: 9, muted: 10, reqLabel: 11, step: 12, note: 13,
}

export interface Cell { v: string; s?: Style }

export interface Validation {
  /** Cell range the rule covers, e.g. "D2:D1000". */
  sqref: string
  type: 'list' | 'minLength'
  /** list: a range such as 'ตัวเลือก'!$B$2:$B$3. minLength: the minimum. */
  formula: string
  /** What happens to a value that breaks the rule. Default: refused. */
  alert?: 'stop' | 'warning'
  errorTitle?: string
  error?: string
}

export interface Sheet {
  name: string
  cols?: { width: number; style?: Style }[]
  rows: (Cell | string | null | undefined)[][]
  rowHeights?: Record<number, number>
  freezeFirstRow?: boolean
  validations?: Validation[]
}

// ---------------------------------------------------------------- XML

const esc = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  // Control characters are not allowed in XML at all, and one pasted from
  // somewhere would make Excel call the whole file corrupt.
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

/** 0 -> "A", 25 -> "Z", 26 -> "AA". */
export function columnLetter(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) }
  return s
}

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

const NAVY = 'FF1E3A5F'
const YELLOW = 'FFFFF3CD'

// Fonts, fills and the combinations of them (cellXfs) the Style names map to.
// Tahoma, because it is the Thai face Excel on Windows renders without
// substituting another font.
const STYLES = HEAD +
  `<styleSheet xmlns="${MAIN}">` +
  '<fonts count="6">' +
    '<font><sz val="10"/><name val="Tahoma"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font>' +
    `<font><b/><sz val="14"/><color rgb="${NAVY}"/><name val="Tahoma"/></font>` +
    '<font><b/><sz val="10"/><name val="Tahoma"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFB00020"/><name val="Tahoma"/></font>' +
    '<font><sz val="10"/><color rgb="FF555555"/><name val="Tahoma"/></font>' +
  '</fonts>' +
  // The first two fills are required by the format and never used directly.
  '<fills count="4">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    `<fill><patternFill patternType="solid"><fgColor rgb="${NAVY}"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${YELLOW}"/><bgColor indexed="64"/></patternFill></fill>` +
  '</fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="14">' +
    /* body     */ '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    /* head     */ '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    /* headLeft */ '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    /* req      */ '<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>' +
    /* text     */ '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    /* reqText  */ '<xf numFmtId="49" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>' +
    /* title    */ '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    /* section  */ '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    /* bold     */ '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    /* wrap     */ '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    /* muted    */ '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    /* reqLabel */ '<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
    /* step     */ '<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    /* note     */ '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

function sheetXml(sheet: Sheet, selected: boolean): string {
  const parts: string[] = [HEAD, `<worksheet xmlns="${MAIN}" xmlns:r="${REL}">`]

  parts.push(`<sheetViews><sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ''}>`)
  if (sheet.freezeFirstRow) {
    parts.push('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>')
    parts.push('<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>')
  }
  parts.push('</sheetView></sheetViews>')
  parts.push('<sheetFormatPr defaultRowHeight="15"/>')

  if (sheet.cols?.length) {
    parts.push('<cols>')
    sheet.cols.forEach((c, i) => {
      // A column style is what an empty cell in that column takes on — so the
      // required columns are tinted and the digit columns are text all the way
      // down, without writing out thousands of empty styled cells.
      const style = c.style ? ` style="${STYLE_INDEX[c.style]}"` : ''
      parts.push(`<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"${style}/>`)
    })
    parts.push('</cols>')
  }

  parts.push('<sheetData>')
  sheet.rows.forEach((row, r) => {
    const height = sheet.rowHeights?.[r + 1]
    const attrs = height ? ` ht="${height}" customHeight="1"` : ''
    const cells = row.map((raw, c) => {
      if (raw === null || raw === undefined) return ''
      const cell: Cell = typeof raw === 'string' ? { v: raw } : raw
      const ref = `${columnLetter(c)}${r + 1}`
      const s = cell.s ? ` s="${STYLE_INDEX[cell.s]}"` : ''
      if (cell.v === '') return s ? `<c r="${ref}"${s}/>` : ''
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`
    }).join('')
    parts.push(`<row r="${r + 1}"${attrs}>${cells}</row>`)
  })
  parts.push('</sheetData>')

  if (sheet.validations?.length) {
    parts.push(`<dataValidations count="${sheet.validations.length}">`)
    for (const v of sheet.validations) {
      const kind = v.type === 'list' ? 'type="list"' : 'type="textLength" operator="greaterThanOrEqual"'
      const alert = v.alert === 'warning' ? ' errorStyle="warning"' : ''
      const text = (v.errorTitle ? ` errorTitle="${esc(v.errorTitle)}"` : '') + (v.error ? ` error="${esc(v.error)}"` : '')
      parts.push(
        `<dataValidation ${kind} allowBlank="1" showErrorMessage="1"${alert}${text} sqref="${v.sqref}">` +
        `<formula1>${esc(v.formula)}</formula1></dataValidation>`,
      )
    }
    parts.push('</dataValidations>')
  }

  parts.push('<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>')
  parts.push('</worksheet>')
  return parts.join('')
}

function packageParts(sheets: Sheet[]): [string, string][] {
  const sheetEntries = sheets.map((s, i) =>
    `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
  const sheetRels = sheets.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
  const sheetTypes = sheets.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')

  return [
    ['[Content_Types].xml', HEAD +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheetTypes + '</Types>'],
    ['_rels/.rels', HEAD +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', HEAD +
      `<workbook xmlns="${MAIN}" xmlns:r="${REL}">` +
      '<bookViews><workbookView activeTab="0"/></bookViews>' +
      `<sheets>${sheetEntries}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', HEAD +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheetRels +
      `<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s, i === 0)] as [string, string]),
  ]
}

// ---------------------------------------------------------------- zip

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

async function deflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const source = new ReadableStream<BufferSource>({ start(c) { c.enqueue(bytes); c.close() } })
  const reader = source.pipeThrough(new CompressionStream('deflate-raw')).getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

// A fixed, valid DOS timestamp (1 Jan 2020). Nothing reads it, and a constant
// makes two builds of the same lists byte-for-byte identical.
const DOS_TIME = 0
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1

async function zip(files: [string, string][]): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const [name, content] of files) {
    const nameBytes = enc.encode(name)
    const raw = enc.encode(content)
    const packed = await deflateRaw(raw)
    const crc = crc32(raw)

    const local = new Uint8Array(30 + nameBytes.length + packed.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)          // names are UTF-8
    lv.setUint16(8, 8, true)               // deflate
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, packed.length, true)
    lv.setUint32(22, raw.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    local.set(packed, 30 + nameBytes.length)
    locals.push(local)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 8, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, packed.length, true)
    cv.setUint32(24, raw.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)

    offset += local.length
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + end.length)
  let at = 0
  for (const part of [...locals, ...centrals, end]) { out.set(part, at); at += part.length }
  return out
}

/** The workbook as .xlsx bytes. */
export async function writeXlsx(sheets: Sheet[]): Promise<Uint8Array> {
  return zip(packageParts(sheets))
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
