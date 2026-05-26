import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/owners/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('POST /api/owners', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
    } as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García', phone: '5551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 422 when phone is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when owner is created', async () => {
    const mockOwner = { id: 'owner-1', full_name: 'Ana García', phone: '5551234567', email: null, address: null }
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockOwner, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García', phone: '5551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.full_name).toBe('Ana García')
  })
})

describe('GET /api/owners', () => {
  it('returns owners list when authenticated', async () => {
    const mockOwners = [{ id: 'owner-1', full_name: 'Ana García', phone: '555', email: null }]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockOwners, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/owners')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})
