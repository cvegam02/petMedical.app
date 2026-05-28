import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/owners/[id]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

const validId = 'aaaaaaaa-0000-4000-a000-000000000001'
const mockOwner = {
  id: validId, full_name: 'Ana García', email: 'ana@example.com',
  phone: '5551234567', address: null, created_at: '2024-01-01', updated_at: '2024-01-01',
}
const mockPet = { id: 'pet-1', name: 'Max', sex: 'male', date_of_birth: null, color: null, microchip: null, notes: null, created_at: '2024-01-01', species: { id: 's1', name: 'Perro' }, breed: null }

describe('GET /api/owners/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'not-a-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when owner not found', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'owners') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
      }),
    }) as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with owner and pets from pet_registrations', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'owners') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOwner, error: null }),
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ pet: mockPet }], error: null }),
        }
      }),
    }) as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.full_name).toBe('Ana García')
    expect(body.data.pets).toHaveLength(1)
    expect(body.data.pets[0].name).toBe('Max')
  })

  it('returns 200 with empty pets array when no registrations', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'owners') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOwner, error: null }),
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
    }) as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.pets).toHaveLength(0)
  })
})

describe('PATCH /api/owners/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ full_name: 'Nuevo' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ full_name: 'Nuevo' }) }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) },
    )
    expect(res.status).toBe(400)
  })

  it('returns 422 for empty update body', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(422)
  })

  it('returns 200 when owner is updated', async () => {
    const updatedOwner = { ...mockOwner, full_name: 'Ana Actualizada' }
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedOwner, error: null }),
      }),
    }) as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ full_name: 'Ana Actualizada' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.full_name).toBe('Ana Actualizada')
  })

  it('returns 409 on duplicate email', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
      }),
    }) as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ email: 'duplicate@example.com' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(409)
  })
})
