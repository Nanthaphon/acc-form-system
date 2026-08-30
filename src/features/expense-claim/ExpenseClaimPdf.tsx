import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { Company, ExpenseHeader, ExpenseRow, FormSettings, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { isTextCol, DEFAULT_SIGNATURE_BLOCKS } from '../../types/schema'
import type { SignatureBlock as SigBlock, DocSignature } from '../../types/schema'
import { computeRow, computeColumnTotals, grandTotal, taxSummary, visibleColumns } from './calc'
import { bahtText } from '../../shared/bahttext'
import { formatIsoDate, formatDate } from '../../shared/date'

// เอกสารทางการใช้ฟอนต์ Sarabun (TH Sarabun New) — มาตรฐานเอกสารราชการไทย
Font.register({ family: 'Sarabun', fonts: [
  { src: '/fonts/Sarabun-Regular.ttf' },
  { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
]})

const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

const MIN_ROWS = 14
const SEQ_WIDTH = 5 // percent
const PX_TO_PT = 0.75 // CSS px -> PDF pt

// Per-column layout style: columns WITH a pixel width get a fixed pt width;
// columns WITHOUT share the remaining horizontal space via flexGrow (weighted by type).
type ColStyle = { width: number } | { flexGrow: number; flexBasis: number }
function columnStyles(cols: FormColumn[]): ColStyle[] {
  const weight = (c: FormColumn) => isTextCol(c.type) ? 1.4 : c.type === 'calc' ? 1.2 : 1
  return cols.map(c => c.width != null
    ? { width: c.width * PX_TO_PT }
    : { flexGrow: weight(c), flexBasis: 0 })
}

const s = StyleSheet.create({
  page: { fontFamily: 'Sarabun', fontSize: 9, padding: 24 },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  bold: { fontWeight: 'bold' },
  row: { flexDirection: 'row' },
  headerBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoBox: { width: 32, height: 32, borderWidth: 0.5, borderColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  logoText: { fontSize: 6, textAlign: 'center' },
  logoImg: { width: 32, height: 32, objectFit: 'contain', marginRight: 6 },
  companyName: { fontSize: 10, fontWeight: 'bold' },
  companyAddr: { fontWeight: 'bold', fontSize: 8 },
  titleBox: { borderWidth: 0.5, borderColor: '#000', paddingHorizontal: 8, paddingVertical: 4 },
  titleText: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  thickRule: { borderTopWidth: 1.5, borderTopColor: '#000', marginTop: 6 },
  docCode: { textAlign: 'right', marginTop: 2 },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  checkboxGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 260 },
  checkboxItem: { width: 130, marginBottom: 2 },
  requesterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, alignItems: 'flex-end' },
  requesterValue: { borderBottomWidth: 0.5, borderBottomColor: '#000', minWidth: 60, marginRight: 8, paddingHorizontal: 2 },
  requesterLabel: { marginRight: 2 },
  table: { marginTop: 8, borderWidth: 0.5, borderColor: '#000' },
  cell: { borderWidth: 0.5, borderColor: '#000', padding: 2, justifyContent: 'center' },
  cellText: { fontSize: 7 },
  amountBox: { borderWidth: 0.5, borderColor: '#000', marginTop: 4, padding: 3, textAlign: 'center' },
  taxBox: { marginTop: 4, marginLeft: 'auto', width: 150, fontSize: 7 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 0.5 },
  taxNet: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#000', paddingTop: 1 },
  sigRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28 },
  sigCol: { alignItems: 'center', width: 140 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: '#000', width: 110, marginBottom: 3, height: 14 },
  sigDate: { marginTop: 6 },
  notes: { marginTop: 16, fontSize: 6.5 },
})

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseRow[]; docNumber: string; settings?: FormSettings; signatures?: DocSignature[] }

export function ExpenseClaimPdf({ company, header, items, settings = EXPENSE_CLAIM_DEFAULTS, signatures }: Props) {
  const cols = settings.columns
  const vcols = visibleColumns(cols)
  const styles = columnStyles(vcols)
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const tax = taxSummary(grandTotal(cols, items), header.vat, header.whtRate)
  const hasTax = !!header.vat || !!header.whtRate
  const bahtWords = bahtText(tax.netTotal)
  const notes = (settings.notes ?? []).filter(n => (n ?? '').trim() !== '')
  const emptyRowCount = Math.max(0, MIN_ROWS - items.length)
  const sigBlocks = settings.signatureBlocks?.length ? settings.signatureBlocks : DEFAULT_SIGNATURE_BLOCKS
  const sigRows: SigBlock[][] = []
  for (let i = 0; i < sigBlocks.length; i += 3) sigRows.push(sigBlocks.slice(i, i + 3))

  // Totals footer: label spans the leading text columns up to the first visible numeric/calc column.
  const firstNumericIdx = vcols.findIndex(c => !isTextCol(c.type))
  const leadingCount = firstNumericIdx < 0 ? vcols.length : firstNumericIdx
  const leadingStyles = styles.slice(0, leadingCount)
  // Merged label cell: same total footprint as the leading columns combined
  // (sum of fixed widths as flexBasis + sum of flex weights as flexGrow).
  const labelStyle = {
    flexGrow: leadingStyles.reduce((a, st) => a + ('flexGrow' in st ? st.flexGrow : 0), 0),
    flexBasis: leadingStyles.reduce((a, st) => a + ('width' in st ? st.width : st.flexBasis), 0),
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header band */}
        <View style={s.headerBand}>
          <View style={{ flexDirection: 'row' }}>
            {company?.logo
              ? <Image src={company.logo} style={s.logoImg} />
              : <View style={s.logoBox}><Text style={s.logoText}>LOGO</Text></View>}
            <View>
              <Text style={s.companyName}>{company?.headerName || 'GLOBE SYNDICATE (THAILAND) CO.,LTD.'}</Text>
              <Text style={s.companyAddr}>{company?.address || DEFAULT_ADDRESS}</Text>
            </View>
          </View>
          <View style={s.titleBox}>
            <Text style={s.titleText}>{settings.title}</Text>
          </View>
        </View>
        <View style={s.thickRule} />
        {/* รหัสฟอร์ม (ไม่มีเลขรันต่อท้าย) */}
        {!!settings.formCode && <Text style={s.docCode}>{settings.formCode}</Text>}

        {/* เรื่อง/เรียน + checkboxes */}
        <View style={s.subjectRow}>
          <View>
            <Text>เรื่อง  {settings.subject}</Text>
            <Text>เรียน  {settings.attention}</Text>
          </View>
          <View style={s.checkboxGrid}>
            {settings.categories.map((label) => (
              <Text key={label} style={s.checkboxItem}>
                {header.categories.includes(label) ? '☑' : '☐'} {label}
              </Text>
            ))}
          </View>
        </View>

        {/* Requester line */}
        <View style={s.requesterRow}>
          <Text style={s.requesterLabel}>ชื่อ</Text>
          <Text style={s.requesterValue}>{header.firstName}</Text>
          <Text style={s.requesterLabel}>นามสกุล</Text>
          <Text style={s.requesterValue}>{header.lastName}</Text>
          <Text style={s.requesterLabel}>ตำแหน่ง</Text>
          <Text style={s.requesterValue}>{header.position}</Text>
          <Text style={s.requesterLabel}>Job</Text>
          <Text style={s.requesterValue}>{header.job}</Text>
        </View>

        {/* Custom header fields */}
        {(settings.headerFields ?? []).map(f => (
          <View key={f.id} style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 3 }}>
            <Text>{f.label}  </Text>
            <Text style={{ flexGrow: 1, borderBottomWidth: 0.5, borderBottomColor: '#000' }}>
              {f.type === 'date' ? formatIsoDate(header.fields?.[f.id] ?? '') : (header.fields?.[f.id] ?? '')}
            </Text>
          </View>
        ))}

        {/* Main table — dynamic columns */}
        <View style={s.table}>
          <View style={[s.row, s.bold]}>
            <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}><Text style={s.cellText}>ลำดับ</Text></View>
            {vcols.map((col, ci) => (
              <View key={col.key} style={[s.cell, styles[ci]]}><Text style={s.cellText}>{col.label}</Text></View>
            ))}
          </View>

          {items.map((_, i) => (
            <View style={s.row} key={i}>
              <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}><Text style={[s.cellText, s.center]}>{i + 1}</Text></View>
              {vcols.map((col, ci) => (
                <View key={col.key} style={[s.cell, styles[ci]]}>
                  <Text style={[s.cellText, isTextCol(col.type) ? {} : s.right]}>
                    {col.type === 'date'
                      ? formatIsoDate(computed[i][col.key] as string)
                      : isTextCol(col.type)
                      ? (computed[i][col.key] as string)
                      : money(Number(computed[i][col.key]) || 0)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <View style={s.row} key={`empty-${i}`}>
              <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}><Text style={s.cellText}> </Text></View>
              {vcols.map((col, ci) => (
                <View key={col.key} style={[s.cell, styles[ci]]}><Text style={s.cellText}> </Text></View>
              ))}
            </View>
          ))}

          <View style={[s.row, s.bold]}>
            <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}>
              <Text style={[s.cellText, s.right]}>{leadingCount === 0 ? 'รวมทั้งสิ้น' : ' '}</Text>
            </View>
            {leadingCount > 0 && (
              <View style={[s.cell, labelStyle]}>
                <Text style={[s.cellText, s.right]}>รวมทั้งสิ้น</Text>
              </View>
            )}
            {firstNumericIdx >= 0 && vcols.slice(firstNumericIdx).map((col, k) => (
              <View key={col.key} style={[s.cell, styles[firstNumericIdx + k]]}>
                <Text style={[s.cellText, s.right]}>{isTextCol(col.type) ? ' ' : money(columnTotals[col.key] ?? 0)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* VAT / หัก ณ ที่จ่าย / ยอดสุทธิ */}
        {hasTax && (
          <View style={s.taxBox}>
            <View style={s.taxRow}><Text>ยอดรวม (ก่อนภาษี)</Text><Text>{money(tax.subtotal)}</Text></View>
            {header.vat && <View style={s.taxRow}><Text>ภาษีมูลค่าเพิ่ม 7%</Text><Text>{money(tax.vatAmount)}</Text></View>}
            {!!header.whtRate && <View style={s.taxRow}><Text>หัก ณ ที่จ่าย {header.whtRate}%</Text><Text>-{money(tax.whtAmount)}</Text></View>}
            <View style={s.taxNet}><Text style={s.bold}>ยอดสุทธิ</Text><Text style={s.bold}>{money(tax.netTotal)}</Text></View>
          </View>
        )}

        {/* เป็นจำนวนเงิน */}
        <Text style={s.amountBox}>เป็นจำนวนเงิน  {bahtWords}</Text>

        {/* Signature blocks — configured per form, in rows of 3 */}
        {sigRows.map((row, ri) => (
          <View key={ri} style={s.sigRow}>
            {row.map(b => {
              const sig = signatures?.find(x => x.blockId === b.id && x.status === 'signed')
              return (
                <View key={b.id} style={s.sigCol}>
                  <View style={s.sigLine}>
                    {sig?.signatureImage ? <Image src={sig.signatureImage} style={{ height: 13, objectFit: 'contain' }} /> : null}
                  </View>
                  <Text>{b.label}</Text>
                  <Text style={s.sigDate}>{sig ? `(${sig.assignedName})` : 'วันที่ ................'}</Text>
                  {sig?.signedAt ? <Text>{`วันที่ ${formatDate(sig.signedAt)}`}</Text> : null}
                </View>
              )
            })}
            {Array.from({ length: 3 - row.length }).map((_, k) => <View key={`e${k}`} style={s.sigCol} />)}
          </View>
        ))}

        {/* หมายเหตุ — ซ่อนทั้งบล็อกเมื่อไม่มีหมายเหตุ */}
        {notes.length > 0 && (
          <View style={s.notes}>
            <Text style={s.bold}>หมายเหตุ:</Text>
            {notes.map((note, i) => (
              <Text key={i}>{note}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
