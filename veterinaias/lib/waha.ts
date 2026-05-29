const WAHA_URL = process.env.WAHA_URL ?? 'http://localhost:3001'
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''

export type WahaSessionStatus =
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'WORKING'
  | 'FAILED'
  | 'STOPPED'

export interface WahaSession {
  name: string
  status: WahaSessionStatus
  me?: { id: { user: string; server: string }; pushName: string } | null
}

export interface WahaQR {
  value: string   // base64 PNG без префикса data:
  mimeType: string
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': WAHA_API_KEY,
  }
}

export async function wahaGetSession(sessionName: string): Promise<WahaSession | null> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${sessionName}`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function wahaCreateSession(sessionName: string): Promise<WahaSession | null> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: sessionName }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function wahaRestartSession(sessionName: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${sessionName}/restart`, {
      method: 'POST',
      headers: headers(),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function wahaDeleteSession(sessionName: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${sessionName}`, {
      method: 'DELETE',
      headers: headers(),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function wahaGetQR(sessionName: string): Promise<WahaQR | null> {
  try {
    const res = await fetch(`${WAHA_URL}/api/${sessionName}/auth/qr`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function wahaSendText(sessionName: string, phone: string, text: string): Promise<boolean> {
  // phone debe ser 10 dígitos México → formatear como 52{phone}@c.us
  const digits = phone.replace(/\D/g, '')
  const chatId = `52${digits}@c.us`
  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chatId, text, session: sessionName }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function wahaSessionName(tenantId: string): string {
  // WAHA no acepta guiones en session names en algunas versiones
  return `waha_${tenantId.replace(/-/g, '_')}`
}
