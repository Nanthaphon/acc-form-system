import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusBadge from './StatusBadge'
import type { Submission } from '../types/schema'

function pendingSubmission(): Submission {
  return {
    id: 'sub-1',
    formType: 'expense-claim',
    docNumber: 'GAC-202609-0001',
    header: {
      subject: '',
      categories: [],
      companyId: 'globe',
      firstName: 'พนักงาน',
      lastName: 'พีซี',
      position: '',
      job: '',
    },
    items: [],
    totals: { columnTotals: {}, grandTotal: 0, amountInThaiText: '' },
    createdBy: 'uid-1',
    createdByEmployeeId: 'E001',
    createdAt: 0,
    updatedAt: 0,
    printCount: 0,
    lastPrintedAt: null,
    signatures: [
      {
        blockId: 'checker',
        blockLabel: 'ผู้ตรวจสอบ',
        assignedUid: 'uid-2',
        assignedName: 'พนักงาน พีซี',
        status: 'pending',
      },
      {
        blockId: 'head',
        blockLabel: 'หัวหน้าแผนก',
        assignedUid: 'uid-3',
        assignedName: 'หัวหน้า DX',
        status: 'signed',
      },
    ],
  }
}

describe('StatusBadge', () => {
  it('shows a readable pending-signature tooltip on hover', () => {
    render(<StatusBadge sub={pendingSubmission()} />)

    fireEvent.mouseEnter(screen.getByText('รอลายเซ็น (1/2)'))

    expect(screen.getByText('ผู้ที่ยังไม่ได้เซ็น')).toBeInTheDocument()
    expect(screen.getByText('เหลือ 1 คน')).toBeInTheDocument()
    expect(screen.getByText('ผู้ตรวจสอบ')).toBeInTheDocument()
    expect(screen.getByText('พนักงาน พีซี')).toBeInTheDocument()
  })
})
