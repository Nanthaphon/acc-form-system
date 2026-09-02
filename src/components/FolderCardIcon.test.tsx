import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FolderCardIcon from './FolderCardIcon'

describe('FolderCardIcon', () => {
  it('shows the folder count inside the folder illustration', () => {
    const { container } = render(<FolderCardIcon count={7} />)

    expect(screen.getByLabelText('7 ฟอร์ม')).toBeInTheDocument()
    expect(container.querySelector('img[src="/icons/open-folder.png"]')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
