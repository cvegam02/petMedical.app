import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/pets/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validPetBody = {
  name: 'Max',
  owner_id: 'ab7a5c57-ae17-4e49-ba5a-fdd90d2e0dc3',
  species_id: 'cf63956c-d04c-459e-940d-688d58347a7e',
  sex: 'male',
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

  it('returns 422 when name is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ owner_id: validPetBody.owner_id, species_id: validPetBody.species_id, sex: 'male' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when pet is created', async () => {
    const mockPet = { id: 'pet-1', ...validPetBody }
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPet, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 when body is not valid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when microchip already exists', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ ...validPetBody, microchip: 'CHIP-001' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
