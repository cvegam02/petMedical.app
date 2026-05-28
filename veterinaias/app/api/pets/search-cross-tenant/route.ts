import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const phone     = req.nextUrl.searchParams.get('phone') || undefined
  const petName   = req.nextUrl.searchParams.get('name') || undefined
  const speciesId = req.nextUrl.searchParams.get('species_id') || undefined
  const breedId   = req.nextUrl.searchParams.get('breed_id') || undefined

  if (!phone && !petName && !speciesId && !breedId) {
    return NextResponse.json({ error: 'Se requiere al menos un parámetro de búsqueda' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('search_pets_cross_tenant', {
    p_phone:      phone      ?? null,
    p_pet_name:   petName    ?? null,
    p_species_id: speciesId  ?? null,
    p_breed_id:   breedId    ?? null,
  })

  if (error) return NextResponse.json({ error: 'Error al buscar historial' }, { status: 500 })
  return NextResponse.json({ data })
}
