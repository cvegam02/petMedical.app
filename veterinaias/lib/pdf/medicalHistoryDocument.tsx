import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  clinicName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#c1502e' },
  meta: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  label: { fontSize: 9, color: '#6b7280', fontFamily: 'Helvetica-Bold', width: 90 },
  value: { fontSize: 10, flex: 1 },
  divider: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginVertical: 12 },
  entryBox: { backgroundColor: '#f9fafb', borderRadius: 4, padding: 10, marginBottom: 10 },
  entryDate: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  entryReason: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  fieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2, marginTop: 6 },
  fieldValue: { fontSize: 10 },
  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  vitalChip: { backgroundColor: '#e5e7eb', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9 },
  rxRow: { flexDirection: 'row', gap: 8, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  rxName: { fontFamily: 'Helvetica-Bold', width: 120 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af' },
})

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcAge(dob: string) {
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return years > 0 ? `${years} año${years !== 1 ? 's' : ''}` : '< 1 año'
}

interface PdfData {
  pet: any
  owner: any
  records: any[]
  tenantName: string
  tenantLogoUrl: string | null
  generatedAt: string
}

export function MedicalHistoryDocument({ pet, owner, records, tenantName, tenantLogoUrl, generatedAt }: PdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{tenantName}</Text>
            <Text style={styles.meta}>Historial médico generado el {generatedAt}</Text>
          </View>
          {tenantLogoUrl && <Image src={tenantLogoUrl} style={styles.logo} />}
        </View>

        {/* Patient */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del paciente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text><Text style={styles.value}>{pet.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Especie</Text><Text style={styles.value}>{pet.species?.name ?? '—'}</Text>
            <Text style={styles.label}>Raza</Text><Text style={styles.value}>{pet.breed ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sexo</Text><Text style={styles.value}>{SEX_LABELS[pet.sex] ?? pet.sex ?? '—'}</Text>
            <Text style={styles.label}>Nacimiento</Text>
            <Text style={styles.value}>
              {pet.date_of_birth ? `${formatDate(pet.date_of_birth)} (${calcAge(pet.date_of_birth)})` : '—'}
            </Text>
          </View>
          {(pet.color || pet.microchip) && (
            <View style={styles.row}>
              <Text style={styles.label}>Color</Text><Text style={styles.value}>{pet.color ?? '—'}</Text>
              <Text style={styles.label}>Microchip</Text><Text style={styles.value}>{pet.microchip ?? '—'}</Text>
            </View>
          )}
          {(pet.sterilized != null || pet.habitat || pet.feeding) && (
            <View style={styles.row}>
              <Text style={styles.label}>Esterilizado</Text><Text style={styles.value}>{pet.sterilized == null ? '—' : pet.sterilized ? 'Sí' : 'No'}</Text>
              <Text style={styles.label}>Dónde vive</Text><Text style={styles.value}>{pet.habitat ?? '—'}</Text>
            </View>
          )}
          {pet.feeding && (
            <View style={styles.row}><Text style={styles.label}>Alimentación</Text><Text style={styles.value}>{pet.feeding}</Text></View>
          )}
          {pet.cohabitation && pet.cohabitation_details && (
            <View style={styles.row}><Text style={styles.label}>Convive con</Text><Text style={styles.value}>{pet.cohabitation_details}</Text></View>
          )}
        </View>

        {/* Owner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dueño</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text><Text style={styles.value}>{owner?.full_name ?? '—'}</Text>
          </View>
          {owner?.phone && (
            <View style={styles.row}><Text style={styles.label}>Teléfono</Text><Text style={styles.value}>{owner.phone}</Text></View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Records */}
        <Text style={styles.sectionTitle}>Historial de consultas ({records.length})</Text>
        {records.map((rec: any) => (
          <View key={rec.id} style={styles.entryBox} wrap={false}>
            <Text style={styles.entryDate}>
              {formatDate(rec.created_at)}
              {rec.created_by_profile?.full_name ? ` · Dr. ${rec.created_by_profile.full_name}` : ''}
            </Text>
            <Text style={styles.entryReason}>{rec.reason}</Text>

            {rec.diagnosis && <>
              <Text style={styles.fieldLabel}>Diagnóstico</Text>
              <Text style={styles.fieldValue}>{rec.diagnosis}</Text>
            </>}
            {rec.treatment && <>
              <Text style={styles.fieldLabel}>Tratamiento</Text>
              <Text style={styles.fieldValue}>{rec.treatment}</Text>
            </>}
            {rec.notes && <>
              <Text style={styles.fieldLabel}>Notas</Text>
              <Text style={styles.fieldValue}>{rec.notes}</Text>
            </>}

            {[rec.weight_kg, rec.temperature_celsius].some(v => v != null) && (
              <>
                <Text style={styles.fieldLabel}>Signos vitales</Text>
                <View style={styles.vitalsRow}>
                  {rec.weight_kg != null && <Text style={styles.vitalChip}>Peso: {rec.weight_kg} kg</Text>}
                  {rec.temperature_celsius != null && <Text style={styles.vitalChip}>Temp: {rec.temperature_celsius}°C</Text>}
                </View>
              </>
            )}

            {rec.prescriptions?.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Medicamentos</Text>
                {rec.prescriptions.map((p: any) => (
                  <View key={p.id} style={styles.rxRow}>
                    <Text style={styles.rxName}>{p.medication_name}</Text>
                    <Text>{[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}</Text>
                  </View>
                ))}
              </>
            )}

            {rec.attachments?.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Archivos adjuntos</Text>
                <Text style={styles.fieldValue}>{rec.attachments.map((a: any) => a.file_name).join(', ')}</Text>
              </>
            )}

            {rec.addendums?.length > 0 && rec.addendums.map((a: any) => (
              <View key={a.id} style={{ marginTop: 6, backgroundColor: '#fef9c3', borderRadius: 3, padding: 6 }}>
                <Text style={{ fontSize: 8, color: '#92400e', fontFamily: 'Helvetica-Bold' }}>
                  Corrección · {formatDate(a.created_at)}
                  {a.created_by_profile?.full_name ? ` · ${a.created_by_profile.full_name}` : ''}
                </Text>
                <Text style={{ fontSize: 9, color: '#78350f', marginTop: 2 }}>{a.content}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Historial generado el ${generatedAt} | MundoPet          Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
