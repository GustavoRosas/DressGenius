import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HomePage from './HomePage'

describe('HomePage', () => {
  it('shows the user email', () => {
    render(<HomePage user={{ email: 'test@example.com' }} isSubmitting={false} onLogout={() => undefined} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })
})
