export interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string
  pets?: Array<{
    id: string
    name: string
    species?: { name: string }
  }>
}
