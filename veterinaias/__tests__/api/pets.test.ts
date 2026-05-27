import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/pets/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validPetBody = {
  name: 'Max',
  owner_id: 'ab7a5c57-ae17-4e49-ba5a-fdd90d2e0dc3',
  species_id: 'cf63956c-d04c-459e-940d-688d58347a7e',
  sex: 'male',
}

const mockProfile = { tenant_id: 'tenant-1' }
const mockPet = { id: 'pet-1', name: 'Max', sex: 'male' }

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

describe('POST /api/pets', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
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
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when name is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ owner_id: validPetBody.owner_id, species_id: validPetBody.species_id, sex: 'male' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when pet and registration are created', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'pets') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPet, error: null }),
          }
        }
        // pet_registrations
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Max')
  })

  it('returns 400 when body is not valid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when microchip already exists', async () => {
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
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ ...validPetBody, microchip: 'CHIP-001' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('GET /api/pets', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns pets list from pet_registrations', async () => {
    const mockRegs = [
      { pet: { id: 'pet-1', name: 'Max', sex: 'male', date_of_birth: null }, owner: { id: 'owner-1', full_name: 'Carlos' } },
    ]
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockRegs, error: null }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Max')
    expect(body.data[0].owner.full_name).toBe('Carlos')
  })
})
