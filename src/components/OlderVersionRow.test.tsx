import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OlderVersionRow, { roundLabel } from './OlderVersionRow'
import type { SubmissionSummary } from '../types/schema'

describe('roundLabel', () => {
  it('names each round: the original, then R1, R2 …', () => {
    expect(roundLabel('GAC69-005-202611-0040')).toBe('ฉบับเดิม')
    expect(roundLabel('GAC69-005-202611-0040-R1')).toBe('R1')
    expect(roundLabel('GAC69-005-202611-0040-R12')).toBe('R12')
  })
})

describe('OlderVersionRow', () => {
  it('shows an earlier round as no longer used, with why it was corrected and a way to open it', () => {
    const doc = {
      id: 'old', docNumber: 'GAC-0040', createdAt: 1, totals: { grandTotal: 250 },
      voided: { at: 1, byUid: 'u', byName: 'ก', reason: 'ยอดผิด', replacedById: 'new', replacedByNumber: 'GAC-0040-R1' },
    } as unknown as SubmissionSummary
    render(<MemoryRouter><table><tbody><OlderVersionRow doc={doc} colSpan={6} label="ฉบับเดิม" last /></tbody></table></MemoryRouter>)
    expect(screen.getByText('ฉบับเดิม')).toBeInTheDocument()
    expect(screen.getByText('ไม่ได้ใช้แล้ว')).toBeInTheDocument()
    expect(screen.getByText(/เหตุผลที่แก้: ยอดผิด/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ดูเอกสารฉบับ GAC-0040' })).toHaveAttribute('href', '/submission/old/preview')
  })
})
