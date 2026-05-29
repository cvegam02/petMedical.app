import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/appointments/route'
import { GET as GET_ID, PATCH } from '@/app/api/appointments/[id]/route'

const mockUser = { id: 'user-1' }
const mockProfile = { tenant_id: 'tenant-1' }

// Valid RFC 4122 UUIDs that pass Zod's uuid() check
const VALID_APT_ID   = '550e8400-e29b-41d4-a716-446655440000'
const VALID_PET_ID   = '123e4567-e89b-12d3-a456-426614174000'
const VALID_OWNER_ID = '123e4567-e89b-12d3-a456-426614174001'

function makeChain(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
  }
  return { ...base, ...overrides }
}

function makeSupabase(chainOverrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: vi.fn().mockReturnValue(makeChain(chainOverrides)),
  }
}

// ──────────────────────────────────────────────────────────
// GET /api/appointments
// ──────────────────────────────────────────────────────────
describe('GET /api/appointments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
      from: vi.fn(),
    } as any)
    const req = new NextRequest('http://localhost/api/appointments')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with appointment list for authenticated user', async () => {
    const appointments = [{ id: VALID_APT_ID, status: 'scheduled', scheduled_at: new Date().toISOString() }]
    // GET route:
    //   1st from() call: user_profiles → single() returns mockProfile
    //   2nd from() call: appointments → select().eq().order().gte().lt() resolves query
    let fromCallCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return makeChain({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })
      }
      return makeChain({
        order: vi.fn().mockResolvedValue({ data: appointments, error: null }),
      })
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: fromMock,
    } as any)
    const req = new NextRequest('http://localhost/api/appointments')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────────────────
// POST /api/appointments
// ──────────────────────────────────────────────────────────
describe('POST /api/appointments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 422 for missing required fields', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as any)
    const req = new NextRequest('http://localhost/api/appointments', {
      method: 'POST',
      body: JSON.stringify({ reason: 'solo esto' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 for valid appointment creation', async () => {
    const newAppointment = {
      id: VALID_APT_ID,
      pet_id: VALID_PET_ID,
      owner_id: VALID_OWNER_ID,
      scheduled_at: new Date().toISOString(),
      duration_minutes: 30,
      status: 'scheduled',
    }
    // POST route calls from() 3 times:
    //   1st: user_profiles → profile
    //   2nd: tenants → settings (business_hours)
    //   3rd: appointments → insert
    let fromCallCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return makeChain({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })
      }
      if (fromCallCount === 2) {
        return makeChain({
          single: vi.fn().mockResolvedValue({
            data: { settings: { business_hours: { days: [1,2,3,4,5,6], start: '09:00', end: '18:00', slot_interval: 30 } } },
            error: null,
          }),
        })
      }
      // 3rd: appointments insert
      return makeChain({
        single: vi.fn().mockResolvedValue({ data: newAppointment, error: null }),
      })
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: fromMock,
    } as any)
    const req = new NextRequest('http://localhost/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        pet_id: VALID_PET_ID,
        owner_id: VALID_OWNER_ID,
        scheduled_at: new Date().toISOString(),
        // duration_minutes intentionally omitted — API derives it from settings
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe(VALID_APT_ID)
  })
})

// ──────────────────────────────────────────────────────────
// PATCH /api/appointments/[id]
// ──────────────────────────────────────────────────────────
describe('PATCH /api/appointments/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    // PATCH route: validateId runs FIRST (returns 400 on bad ID), then getUser
    // We must pass a valid UUID so validateId passes and auth check runs
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
      from: vi.fn(),
    } as any)
    const req = new NextRequest(`http://localhost/api/appointments/${VALID_APT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: VALID_APT_ID }) })
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid status transition from completed', async () => {
    // PATCH with status:
    //   1st from() call: user_profiles → single() returns mockProfile
    //   2nd from() call: appointments.select('status').eq(id).eq(tenant_id).single() → { status: 'completed' }
    //   Then ALLOWED_TRANSITIONS['completed'] is undefined → [] → 422
    let fromCallCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return makeChain({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })
      }
      return makeChain({
        single: vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null }),
      })
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: fromMock,
    } as any)
    const req = new NextRequest(`http://localhost/api/appointments/${VALID_APT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: VALID_APT_ID }) })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toContain('completed')
  })

  it('returns 200 for valid scheduled → confirmed transition', async () => {
    const updatedAppointment = { id: VALID_APT_ID, status: 'confirmed' }
    // PATCH with status = 'confirmed':
    //   1st from() call: user_profiles → single() returns mockProfile
    //   2nd from() call: appointments.select('status').eq(id).eq(tenant_id).single() → { status: 'scheduled' }
    //   3rd from() call: appointments.update().eq(id).eq(tenant_id).eq(currentStatus).select().single() → updatedAppointment
    let fromCallCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return makeChain({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })
      }
      if (fromCallCount === 2) {
        return makeChain({
          single: vi.fn().mockResolvedValue({ data: { status: 'scheduled' }, error: null }),
        })
      }
      return makeChain({
        single: vi.fn().mockResolvedValue({ data: updatedAppointment, error: null }),
      })
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: fromMock,
    } as any)
    const req = new NextRequest(`http://localhost/api/appointments/${VALID_APT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: VALID_APT_ID }) })
    expect(res.status).toBe(200)
  })
})

// ──────────────────────────────────────────────────────────
// GET /api/appointments con ?from= y ?to=
// ──────────────────────────────────────────────────────────
describe('GET /api/appointments con ?from= y ?to=', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filtra por rango de fechas cuando from y to están presentes', async () => {
    const appointments = [
      { id: 'apt-range', status: 'confirmed', scheduled_at: '2026-06-15T10:00:00Z' },
    ]
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: appointments, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const req = new NextRequest(
      'http://localhost/api/appointments?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(chain.gte).toHaveBeenCalledWith('scheduled_at', '2026-06-01T00:00:00Z')
    expect(chain.lte).toHaveBeenCalledWith('scheduled_at', '2026-06-30T23:59:59Z')
  })

  it('ignora from si to no está presente y usa el tab por defecto', async () => {
    const todayApts = [{ id: 'apt-today', status: 'scheduled', scheduled_at: new Date().toISOString() }]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(makeChain({
        order: vi.fn().mockResolvedValue({ data: todayApts, error: null }),
      })),
    } as any)
    const req = new NextRequest('http://localhost/api/appointments?from=2026-06-01T00:00:00Z')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('retorna 400 con fecha malformada', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(makeChain()),
    } as any)
    const req = new NextRequest('http://localhost/api/appointments?from=not-a-date&to=also-wrong')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
