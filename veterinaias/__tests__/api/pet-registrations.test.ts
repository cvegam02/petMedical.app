import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/pet-registrations/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validBody = {
  pet_id:   'aaaaaaaa-0000-4000-a000-000000000001',
  owner_id: 'bbbbbbbb-0000-4000-a000-000000000001',
}

const mockProfile = { tenant_id: 'tenant-1' }

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

describe('POST /api/pet-registrations', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no tenant', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: null }, error: null }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when pet_id is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify({ owner_id: validBody.owner_id }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 422 when pet_id is not a valid UUID', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify({ pet_id: 'not-a-uuid', owner_id: validBody.owner_id }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 201 when registration is created', async () => {
    const mockReg = { id: 'reg-1', tenant_id: 'tenant-1', ...validBody }
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockReg, error: null }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.tenant_id).toBe('tenant-1')
  })

  it('returns 409 when pet is already registered at this clinic', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
