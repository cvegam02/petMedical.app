import { HotelStayPage } from '@/components/servicios/HotelStayPage'

export default async function HotelStayRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <HotelStayPage visitId={id} />
}
