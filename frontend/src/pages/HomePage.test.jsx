import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HomePage from './HomePage'

describe('HomePage', () => {
  it('shows the user email', () => {
    render(<HomePage user={{ email: 'test@example.com' }} isSubmitting={false} onLogout={() => undefined} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('calls onLogout when clicking logout', () => {
    const onLogout = vi.fn()
    render(<HomePage user={{ email: 'test@example.com' }} isSubmitting={false} onLogout={onLogout} />)

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('disables logout when submitting', () => {
    render(<HomePage user={{ email: 'test@example.com' }} isSubmitting={true} onLogout={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Logging out…' })).toBeDisabled()
  })
})
