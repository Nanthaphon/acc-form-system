import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { Company, ExpenseHeader, ExpenseRow, FormSettings, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { computeRow, computeColumnTotals, bahtTextForRows, visibleColumns } from './calc'

// เอกสารทางการใช้ฟอนต์ Sarabun (TH Sarabun New) — มาตรฐานเอกสารราชการไทย
Font.register({ family: 'Sarabun', fonts: [
  { src: '/fonts/Sarabun-Regular.ttf' },
  { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
]})

const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

const MIN_ROWS = 14
const SEQ_WIDTH = 5 // percent

// Distribute remaining width across columns by type weight.
function columnWidths(cols: FormColumn[]): number[] {
  const weight = (c: FormColumn) => c.type === 'text' ? 1.4 : c.type === 'calc' ? 1.2 : 1
  const total = cols.reduce((s, c) => s + weight(c), 0) || 1
  const remaining = 100 - SEQ_WIDTH
  return cols.map(c => (weight(c) / total) * remaining)
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
  sigRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28 },
  sigCol: { alignItems: 'center', width: 140 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: '#000', width: 110, marginBottom: 3, height: 14 },
  sigDate: { marginTop: 6 },
  notes: { marginTop: 16, fontSize: 6.5 },
})

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseRow[]; docNumber: string; settings?: FormSettings }

export function ExpenseClaimPdf({ company, header, items, docNumber, settings = EXPENSE_CLAIM_DEFAULTS }: Props) {
  const cols = settings.columns.length ? settings.columns : EXPENSE_CLAIM_DEFAULTS.columns
  const vcols = visibleColumns(cols)
  const widths = columnWidths(vcols)
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const bahtWords = bahtTextForRows(cols, items)
  const emptyRowCount = Math.max(0, MIN_ROWS - items.length)

  // Totals footer: label spans seq + leading text columns up to the first visible numeric/calc column.
  const firstNumericIdx = vcols.findIndex(c => c.type !== 'text')
  const labelWidth = firstNumericIdx < 0
    ? 100
    : SEQ_WIDTH + widths.slice(0, firstNumericIdx).reduce((a, b) => a + b, 0)

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
              <Text style={s.companyName}>GLOBE SYNDICATE (THAILAND) CO.,LTD.</Text>
              <Text style={s.companyAddr}>{company?.address || DEFAULT_ADDRESS}</Text>
            </View>
          </View>
          <View style={s.titleBox}>
            <Text style={s.titleText}>{settings.title}</Text>
          </View>
        </View>
        <View style={s.thickRule} />
        <Text style={s.docCode}>{docNumber || settings.formCode}</Text>

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

        {/* Main table — dynamic columns */}
        <View style={s.table}>
          <View style={[s.row, s.bold]}>
            <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}><Text style={s.cellText}>ลำดับ</Text></View>
            {vcols.map((col, ci) => (
              <View key={col.key} style={[s.cell, { width: `${widths[ci]}%` }]}><Text style={s.cellText}>{col.label}</Text></View>
            ))}
          </View>

          {items.map((_, i) => (
            <View style={s.row} key={i}>
              <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}><Text style={[s.cellText, s.center]}>{i + 1}</Text></View>
              {vcols.map((col, ci) => (
                <View key={col.key} style={[s.cell, { width: `${widths[ci]}%` }]}>
                  <Text style={[s.cellText, col.type === 'text' ? {} : s.right]}>
                    {col.type === 'text' ? (computed[i][col.key] as string) : money(Number(computed[i][col.key]) || 0)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <View style={s.row} key={`empty-${i}`}>
              <View style={[s.cell, { width: `${SEQ_WIDTH}%` }]}><Text style={s.cellText}> </Text></View>
              {vcols.map((col, ci) => (
                <View key={col.key} style={[s.cell, { width: `${widths[ci]}%` }]}><Text style={s.cellText}> </Text></View>
              ))}
            </View>
          ))}

          <View style={[s.row, s.bold]}>
            <View style={[s.cell, { width: `${labelWidth}%` }]}>
              <Text style={[s.cellText, s.right]}>รวมทั้งสิ้น</Text>
            </View>
            {firstNumericIdx >= 0 && vcols.slice(firstNumericIdx).map((col, k) => (
              <View key={col.key} style={[s.cell, { width: `${widths[firstNumericIdx + k]}%` }]}>
                <Text style={[s.cellText, s.right]}>{col.type === 'text' ? ' ' : money(columnTotals[col.key] ?? 0)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* เป็นจำนวนเงิน */}
        <Text style={s.amountBox}>เป็นจำนวนเงิน  {bahtWords}</Text>

        {/* Signature blocks */}
        <View style={s.sigRow}>
          <View style={s.sigCol}>
            <View style={s.sigLine} />
            <Text>ผู้เบิก</Text>
            <Text style={s.sigDate}>วันที่ ................</Text>
          </View>
          <View style={s.sigCol}>
            <View style={s.sigLine} />
            <Text>หัวหน้าแผนก</Text>
            <Text style={s.sigDate}>วันที่ ................</Text>
          </View>
          <View style={s.sigCol}>
            <View style={s.sigLine} />
            <Text>ผู้อนุมัติ</Text>
            <Text style={s.sigDate}>วันที่ ................</Text>
          </View>
        </View>
        <View style={s.sigRow}>
          <View style={s.sigCol}>
            <View style={s.sigLine} />
            <Text>ผู้รับเงิน</Text>
            <Text style={s.sigDate}>วันที่ ................</Text>
          </View>
          <View style={s.sigCol}>
            <View style={s.sigLine} />
            <Text>ผู้ตรวจสอบ/ฝ่ายบัญชี</Text>
            <Text style={s.sigDate}>วันที่ ................</Text>
          </View>
        </View>

        {/* หมายเหตุ */}
        <View style={s.notes}>
          <Text style={s.bold}>หมายเหตุ:</Text>
          {settings.notes.map((note, i) => (
            <Text key={i}>{note}</Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
