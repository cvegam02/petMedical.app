import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/pets/[id]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

const validId = 'aaaaaaaa-0000-4000-a000-000000000001'
const mockPet = {
  id: validId, name: 'Max', sex: 'male', date_of_birth: null, color: null,
  microchip: null, notes: null, created_at: '2024-01-01', updated_at: '2024-01-01',
  species: { id: 's1', name: 'Perro' }, breed: null, medical_records: [],
}
const mockOwner = { id: 'owner-1', full_name: 'Carlos', email: null, phone: '555' }

describe('GET /api/pets/[id]', () => {
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

  it('returns 404 when pet not found', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pets') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }) as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with pet and owner', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pets') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockPet, error: null }),
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { owner: mockOwner }, error: null }),
        }
      }),
    }) as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Max')
    expect(body.data.owner.full_name).toBe('Carlos')
  })

  it('returns 200 with null owner when pet has no registration', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pets') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockPet, error: null }),
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }) as any)
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: validId }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.owner).toBeNull()
  })
})

describe('PATCH /api/pets/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'Buddy' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'Buddy' }) }),
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

  it('returns 200 when pet is updated', async () => {
    const updatedPet = { ...mockPet, name: 'Buddy' }
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedPet, error: null }),
      }),
    }) as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'Buddy' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Buddy')
  })

  it('returns 404 when pet not found', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    }) as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'Buddy' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 on duplicate microchip', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
      }),
    }) as any)
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ microchip: 'CHIP-001' }) }),
      { params: Promise.resolve({ id: validId }) },
    )
    expect(res.status).toBe(409)
  })
})
