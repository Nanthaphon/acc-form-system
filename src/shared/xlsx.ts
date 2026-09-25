// Just enough .xlsx reading to get a filled-in template back out again.
//
// An .xlsx is a zip of XML. Reading one needs three things — unzip, the shared
// string table, and the cell grid — and all three are small enough to do here.
// A library would be the obvious choice, except every one of them costs far
// more than this file does, on a page most admins open once.
//
// Nothing here writes .xlsx, and nothing here reads formulas, dates, styles or
// anything beyond a cell's text. That is the whole job: the template asks for
// text, and this reads the text back.

/** The name each `.xlsx` part is stored under, mapped to its bytes. */
type Parts = Map<string, Uint8Array>

const SIG_EOCD = 0x06054b50

async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  // Fed from a stream built by hand rather than from a Blob: this has to run
  // under the test environment's DOM as well as a real browser, and a Blob is
  // the piece those two disagree about.
  const source = new ReadableStream<BufferSource>({
    start(controller) { controller.enqueue(bytes); controller.close() },
  })
  const inflated = source.pipeThrough(new DecompressionStream('deflate-raw'))
  const chunks: Uint8Array[] = []
  const reader = inflated.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

/**
 * Unzip, reading the central directory rather than walking the file. A local
 * header may say a part's size is 0 and leave the real size in a trailing
 * descriptor; the central directory always has it.
 */
async function unzip(buffer: ArrayBuffer): Promise<Parts> {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // The end-of-central-directory record sits last, after a comment of unknown
  // length, so it has to be found by scanning backwards for its signature.
  let end = -1
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === SIG_EOCD) { end = i; break }
  }
  if (end < 0) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์ Excel (.xlsx) ที่อ่านได้')

  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const parts: Parts = new Map()

  for (let i = 0; i < count; i++) {
    const method = view.getUint16(at + 10, true)
    const compressed = view.getUint32(at + 20, true)
    const nameLen = view.getUint16(at + 28, true)
    const extraLen = view.getUint16(at + 30, true)
    const commentLen = view.getUint16(at + 32, true)
    const localAt = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen))

    // The local header repeats the name and carries its own extra field, whose
    // length regularly differs from the central one — so it must be read here.
    const localNameLen = view.getUint16(localAt + 26, true)
    const localExtraLen = view.getUint16(localAt + 28, true)
    const from = localAt + 30 + localNameLen + localExtraLen
    const raw = bytes.subarray(from, from + compressed)

    if (method === 0) parts.set(name, raw)
    else if (method === 8) parts.set(name, await inflateRaw(raw))
    // Any other compression method is one Excel does not produce; skipping the
    // part is better than failing the whole file over something unused.

    at += 46 + nameLen + extraLen + commentLen
  }
  return parts
}

const text = (part: Uint8Array | undefined) => (part ? new TextDecoder().decode(part) : '')

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('ไฟล์ Excel เสียหาย อ่านไม่ได้')
  return doc
}

/** "BC" -> 55. Column letters are base-26 with no zero. */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** Shared strings, in order — `t="s"` cells hold an index into this. */
function sharedStrings(parts: Parts): string[] {
  const xml = text(parts.get('xl/sharedStrings.xml'))
  if (!xml) return []
  // A single <si> can be split across several <t> runs when part of it was
  // styled; joining them is what makes the cell read as one string again.
  return [...parseXml(xml).getElementsByTagName('si')].map(si =>
    [...si.getElementsByTagName('t')].map(t => t.textContent ?? '').join(''),
  )
}

/** The worksheet part to read: the one named `wanted`, else the first. */
function sheetPath(parts: Parts, wanted?: string): string {
  const book = text(parts.get('xl/workbook.xml'))
  const rels = text(parts.get('xl/_rels/workbook.xml.rels'))
  if (!book || !rels) return 'xl/worksheets/sheet1.xml'

  const target = new Map<string, string>()
  for (const rel of parseXml(rels).getElementsByTagName('Relationship')) {
    target.set(rel.getAttribute('Id') ?? '', rel.getAttribute('Target') ?? '')
  }
  const sheets = [...parseXml(book).getElementsByTagName('sheet')]
  const pick = (wanted && sheets.find(s => s.getAttribute('name') === wanted)) || sheets[0]
  const id = pick?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    ?? pick?.getAttribute('r:id')
  const path = (id && target.get(id)) || 'worksheets/sheet1.xml'
  return path.startsWith('/') ? path.slice(1) : `xl/${path.replace(/^\.\//, '')}`
}

/**
 * Every cell of one sheet as text, as a grid of rows.
 *
 * Rows and cells that are empty are simply absent from the XML, so the grid is
 * filled in by position rather than by reading cells in order — otherwise a
 * blank `department` would silently shift `role` into its place.
 */
export async function readSheet(file: Blob | ArrayBuffer, sheetName?: string): Promise<string[][]> {
  // Asked by capability, not by `instanceof`: under the test environment the
  // buffer comes from Node and the DOM from jsdom, so the two hold different
  // ArrayBuffer constructors and `instanceof` answers no to a real one.
  const source = file as Blob
  const parts = await unzip(typeof source.arrayBuffer === 'function' ? await source.arrayBuffer() : file as ArrayBuffer)
  const strings = sharedStrings(parts)
  const xml = text(parts.get(sheetPath(parts, sheetName)))
  if (!xml) throw new Error('ไม่พบข้อมูลในไฟล์ Excel')

  const grid: string[][] = []
  for (const row of parseXml(xml).getElementsByTagName('row')) {
    const cells: string[] = []
    for (const cell of row.getElementsByTagName('c')) {
      const at = columnIndex(cell.getAttribute('r') ?? 'A')
      const type = cell.getAttribute('t')
      let value = ''
      if (type === 'inlineStr') {
        value = [...cell.getElementsByTagName('t')].map(t => t.textContent ?? '').join('')
      } else {
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? ''
        value = type === 's' ? (strings[Number(raw)] ?? '') : raw
      }
      while (cells.length < at) cells.push('')
      cells[at] = value.trim()
    }
    const at = Number(row.getAttribute('r') ?? grid.length + 1) - 1
    while (grid.length < at) grid.push([])
    grid[at] = cells
  }
  return grid
}

/** True for a file the reader should be given rather than the CSV parser. */
export const isXlsx = (file: File) => /\.xlsx$/i.test(file.name)
