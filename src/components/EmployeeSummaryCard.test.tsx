import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmployeeSummaryCard from './EmployeeSummaryCard'

const companies = [{ id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', address: '', shortName: 'Globe Syndicate' }]
const groups = [{ id: 'bd', name: 'Business Development' }] as never[]
const person = {
  firstName: 'นันทพล', lastName: 'นายาต', position: 'IT Support Officer', employeeId: '1010145', role: 'employee' as const,
  companyId: 'globe', department: 'Business Development', accessGroup: 'bd', email: '',
}

describe('the employee at a glance', () => {
  it('shows who it is, with the company and group by name', () => {
    render(<EmployeeSummaryCard person={person} companies={companies} groups={groups} />)
    expect(screen.getByRole('heading', { name: 'นันทพล นายาต' })).toBeInTheDocument()
    expect(screen.getByText('นน')).toBeInTheDocument()
    expect(screen.getByText('1010145')).toBeInTheDocument()
    expect(screen.getByText('พนักงาน')).toBeInTheDocument()
    expect(screen.getByText('Globe Syndicate')).toBeInTheDocument()
    expect(screen.getAllByText('Business Development')).toHaveLength(2)
  })

  it('says what is still missing instead of leaving blanks', () => {
    render(<EmployeeSummaryCard person={{ ...person, firstName: '', lastName: '', position: '' }} companies={[]} groups={[]} />)
    expect(screen.getByText('ยังไม่ได้ใส่ชื่อ')).toBeInTheDocument()
    expect(screen.getByText('ยังไม่ได้ใส่ตำแหน่ง')).toBeInTheDocument()
  })
})
