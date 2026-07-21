import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { Company, ExpenseHeader, ExpenseItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

Font.register({ family: 'Prompt', fonts: [
  { src: '/fonts/Prompt-Regular.ttf' },
  { src: '/fonts/Prompt-Bold.ttf', fontWeight: 'bold' },
]})

const s = StyleSheet.create({
  page: { fontFamily: 'Prompt', fontSize: 9, padding: 28 },
  center: { textAlign: 'center' }, right: { textAlign: 'right' },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#000', padding: 2, flexGrow: 1 },
  bold: { fontWeight: 'bold' },
})

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseItem[]; docNumber: string }

export function ExpenseClaimPdf({ company, header, items, docNumber }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={[s.center, s.bold]}>{company?.name}</Text>
        <Text style={s.center}>{company?.address}</Text>
        <Text style={s.right}>{docNumber}</Text>
        <Text>เรื่อง ขออนุมัติเบิกค่าใช้จ่าย หมวด: {header.categories.join(', ')}</Text>
        <Text>ชื่อ {header.firstName} {header.lastName} ตำแหน่ง {header.position} Job {header.job}</Text>
        <View style={{ marginTop: 6 }}>
          <View style={[s.row, s.bold]}>
            {['วันเดือนปี','PC Code','PC Name','วันทำงาน','วันละ','ก่อนหัก','หัก3%','สุทธิ'].map(h => <Text key={h} style={s.cell}>{h}</Text>)}
          </View>
          {items.map((it, i) => (
            <View style={s.row} key={i}>
              <Text style={s.cell}>{it.date}</Text><Text style={s.cell}>{it.pcCode}</Text>
              <Text style={s.cell}>{it.pcName}</Text><Text style={s.cell}>{it.workDays}</Text>
              <Text style={s.cell}>{it.ratePerDay}</Text>
              <Text style={[s.cell, s.right]}>{computed[i].amountBeforeWht.toLocaleString()}</Text>
              <Text style={[s.cell, s.right]}>{computed[i].wht3.toLocaleString()}</Text>
              <Text style={[s.cell, s.right]}>{computed[i].amountNet.toLocaleString()}</Text>
            </View>
          ))}
          <View style={[s.row, s.bold]}>
            <Text style={[s.cell, { flexGrow: 5 }, s.right]}>รวมทั้งสิ้น</Text>
            <Text style={[s.cell, s.right]}>{totals.totalBefore.toLocaleString()}</Text>
            <Text style={[s.cell, s.right]}>{totals.totalWht.toLocaleString()}</Text>
            <Text style={[s.cell, s.right]}>{totals.totalNet.toLocaleString()}</Text>
          </View>
        </View>
        <Text style={{ marginTop: 4 }}>เป็นจำนวนเงิน {totals.amountInThaiText}</Text>
        <View style={[s.row, { marginTop: 40, justifyContent: 'space-around' }]}>
          <Text>............... ผู้เบิก</Text><Text>............... หัวหน้าแผนก</Text><Text>............... ผู้อนุมัติ</Text>
        </View>
      </Page>
    </Document>
  )
}
