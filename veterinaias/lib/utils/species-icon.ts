import { Bird, Cat, Dog, PawPrint, Rabbit, Rat, Turtle, type LucideIcon } from 'lucide-react'

const SPECIES_ICON_MAP: Record<string, LucideIcon> = {
  perro: Dog,
  gato: Cat,
  conejo: Rabbit,
  ave: Bird,
  reptil: Turtle,
  roedores: Rat,
}

export function getSpeciesIcon(speciesName: string | null | undefined): LucideIcon {
  const key = speciesName?.toLowerCase().trim() ?? ''
  return SPECIES_ICON_MAP[key] ?? PawPrint
}
