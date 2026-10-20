import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SignerSelect from './SignerSelect'

const names = ['Saksit Srivatana', 'กชกร เรืองนุ้ย', 'Boonchai Putakotirat', 'เกียรติ ศรีสุข', 'ฮานา ใจดี', 'กนกวรรณ พิลานนท์', 'Jadsada Dachanithi']
const signers = names.map((name, i) => ({ uid: `u${i}`, name }))

describe('SignerSelect', () => {
  it('lists names in dictionary order: Thai ก–ฮ, then English A–Z', () => {
    render(<SignerSelect value="" onChange={() => {}} signers={signers} />)
    fireEvent.focus(screen.getByRole('textbox'))
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
      'กชกร เรืองนุ้ย', 'กนกวรรณ พิลานนท์', 'เกียรติ ศรีสุข', 'ฮานา ใจดี',
      'Boonchai Putakotirat', 'Jadsada Dachanithi', 'Saksit Srivatana',
    ])
  })

  it('keeps that order while searching', () => {
    render(<SignerSelect value="" onChange={() => {}} signers={signers} />)
    fireEvent.focus(screen.getByRole('textbox'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ก' } })
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['กชกร เรืองนุ้ย', 'กนกวรรณ พิลานนท์', 'เกียรติ ศรีสุข'])
  })
})
