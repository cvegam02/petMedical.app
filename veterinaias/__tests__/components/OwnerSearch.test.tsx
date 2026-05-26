import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { OwnerSearch } from '@/components/owners/OwnerSearch'

global.fetch = vi.fn()

describe('OwnerSearch', () => {
  it('renders search input', () => {
    render(<OwnerSearch onResults={vi.fn()} onLoadingChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument()
  })

  it('calls fetch after typing with debounce', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ data: [] }),
    } as Response)

    const onResults = vi.fn()
    render(<OwnerSearch onResults={onResults} onLoadingChange={vi.fn()} />)
    const input = screen.getByPlaceholderText(/buscar/i)

    await act(async () => {
      await userEvent.type(input, 'Ana')
      await new Promise(r => setTimeout(r, 400))
    })

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=Ana'))
  })
})
