import { POST } from '@/app/api/tenants/route'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'vet@test.com' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'tenant-123', name: 'Test Clinic', slug: 'test-clinic', type: 'individual' },
        error: null,
      }),
    })),
  }),
}))

describe('POST /api/tenants', () => {
  it('devuelve 400 si falta el nombre del tenant', async () => {
    const req = new NextRequest('http://localhost/api/tenants', {
      method: 'POST',
      body: JSON.stringify({ type: 'individual' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('devuelve 400 si el tipo no es valido', async () => {
    const req = new NextRequest('http://localhost/api/tenants', {
      method: 'POST',
      body: JSON.stringify({ name: 'Clinica Test', type: 'invalid_type' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
