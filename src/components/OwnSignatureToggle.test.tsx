import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import OwnSignatureToggle from './OwnSignatureToggle'
import { updateProfile } from '../data/users'
import { uiAlert } from './dialog/dialogService'

vi.mock('../data/users', () => ({ updateProfile: vi.fn(() => Promise.resolve()) }))
vi.mock('./dialog/dialogService', () => ({ uiAlert: vi.fn() }))

const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'sig.png', { type: 'image/png' })

const show = (withUpload = true) => {
  const onChange = vi.fn(), onUploaded = vi.fn()
  render(<MemoryRouter>
    <OwnSignatureToggle signature={null} blockLabel="ผู้จัดทำเอกสาร" on={false} onChange={onChange}
      upload={withUpload ? { uid: 'u1', onUploaded } : undefined} />
  </MemoryRouter>)
  return { onChange, onUploaded }
}

beforeEach(() => vi.clearAllMocks())

describe('a signature uploaded from the card', () => {
  it('is saved to the profile from a picked file, and the card turns on with it', async () => {
    const { onChange, onUploaded } = show()
    fireEvent.change(screen.getByLabelText('เลือกไฟล์ลายเซ็น'), { target: { files: [png()] } })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true))
    expect(updateProfile).toHaveBeenCalledWith('u1', { signatureImage: expect.stringMatching(/^data:image\/png;base64,/) })
    expect(onUploaded).toHaveBeenCalled()
  })

  it('is taken from a file dropped on the card', async () => {
    const { onChange } = show()
    fireEvent.drop(screen.getByText('ยังไม่มีลายเซ็นในระบบ').closest('div')!.parentElement!, { dataTransfer: { files: [png()] } })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true))
  })

  it('turns away a file that is not an image', async () => {
    const { onChange } = show()
    fireEvent.change(screen.getByLabelText('เลือกไฟล์ลายเซ็น'), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(uiAlert).toHaveBeenCalledWith('เลือกไฟล์รูปภาพ (PNG หรือ JPG)', expect.anything()))
    expect(updateProfile).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('points to the profile page where it cannot upload itself', () => {
    show(false)
    expect(screen.getByRole('link', { name: /อัปโหลดลายเซ็น/ })).toHaveAttribute('href', '/profile')
  })
})
