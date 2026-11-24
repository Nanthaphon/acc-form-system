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

describe('SignerSelect — nickname', () => {
  const people = [
    { uid: 'a', name: 'กชกร เรืองนุ้ย', nickname: 'Jib' },
    { uid: 'b', name: 'พรทิพย์ รุ่งเรือง', nickname: 'ปุ้ย' },
    { uid: 'c', name: 'นันทพล นายาต' },
  ]

  it('finds someone by their nickname, and shows it beside the name', () => {
    render(<SignerSelect value="" onChange={() => {}} signers={people} />)
    const box = screen.getByPlaceholderText(/ค้นหาผู้เซ็น/)
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'ปุ้ย' } })
    expect(screen.getByRole('button', { name: /พรทิพย์ รุ่งเรือง/ })).toHaveTextContent('(ปุ้ย)')
    expect(screen.queryByRole('button', { name: /กชกร/ })).toBeNull()
  })

  it('matches a nickname whatever its case', () => {
    render(<SignerSelect value="" onChange={() => {}} signers={people} />)
    const box = screen.getByPlaceholderText(/ค้นหาผู้เซ็น/)
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'jib' } })
    expect(screen.getByRole('button', { name: /กชกร เรืองนุ้ย/ })).toBeInTheDocument()
  })
})
