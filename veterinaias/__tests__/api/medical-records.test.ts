import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/medical-records/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validRecordBody = {
  pet_id: '123e4567-e89b-12d3-a456-426614174000',
  reason: 'Revisión general',
}

describe('POST /api/medical-records', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(validRecordBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no tenant', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: null }, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(validRecordBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when reason is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify({ pet_id: validRecordBody.pet_id }), // missing reason → 422
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when record is created', async () => {
    const mockRecord = { id: 'rec-1', ...validRecordBody, tenant_id: 'tenant-1', created_by: 'user-1' }
    const mockFrom = vi.fn()
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
      })
      .mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: mockFrom,
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(validRecordBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
