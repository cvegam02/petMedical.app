import { POST } from '@/app/api/invitations/route'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { tenant_id: 'tenant-123', role: 'admin' },
        error: null,
      }),
    })),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'inv-123', token: 'abc123' },
        error: null,
      }),
    })),
  }),
}))

describe('POST /api/invitations', () => {
  it('devuelve 400 si el email es invalido', async () => {
    const req = new NextRequest('http://localhost/api/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', role: 'staff' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('devuelve 400 si el rol no es valido', async () => {
    const req = new NextRequest('http://localhost/api/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'nuevo@vet.com', role: 'superuser' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
