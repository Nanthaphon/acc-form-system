import { useState } from 'react'
import { parseEmployeeCsv } from '../../shared/csv'
import { importEmployees } from '../../data/users'

export default function ImportCsvPage() {
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<string>('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const { rows, errors } = parseEmployeeCsv(text)
    setErrors(errors)
    if (errors.length === 0) {
      const res = await importEmployees(rows)
      setResult(`เพิ่มสำเร็จ ${res.ok} คน, ล้มเหลว ${res.failed.length} คน`)
    }
  }
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">Import พนักงานจาก CSV</h1>
      <p className="text-sm text-gray-600">คอลัมน์: employeeId, firstName, lastName, position, department, companyId, defaultJob, bankAccount, role</p>
      <input type="file" accept=".csv" onChange={onFile} />
      {errors.length > 0 && <ul className="text-sm text-red-600">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      {result && <p className="text-sm text-green-700">{result}</p>}
    </div>
  )
}
