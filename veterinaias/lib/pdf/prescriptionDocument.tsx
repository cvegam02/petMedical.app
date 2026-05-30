import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  clinicName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d6b6e' },
  clinicMeta: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  rxLabel: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d6b6e' },
  logo: { width: 55, height: 55 },
  vetBlock: { marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  vetName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  vetMeta: { fontSize: 9, color: '#374151', marginTop: 2 },
  emitDate: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  twoCol: { flexDirection: 'row', gap: 24, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  col: { flex: 1 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  fieldLine: { fontSize: 10, marginBottom: 2 },
  fieldLabel: { fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  block: { marginBottom: 12 },
  bodyText: { fontSize: 10, lineHeight: 1.4 },
  rxItem: { marginBottom: 8 },
  rxName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  rxDetail: { fontSize: 9, color: '#374151', marginTop: 1 },
  rxNotes: { fontSize: 9, color: '#6b7280', marginTop: 1, fontStyle: 'italic' },
  footerNote: { fontSize: 9, color: '#374151', marginTop: 14 },
  validity: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  signature: { marginTop: 36, alignItems: 'center' },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1a1a1a', width: 220, marginBottom: 4 },
  signatureName: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  signatureCaption: { fontSize: 8, color: '#6b7280', marginTop: 1 },
  legend: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' },
})

export interface PrescriptionData {
  clinic: { name: string; address: string | null; phone: string | null; logoUrl: string | null }
  vet: { full_name: string; professional_license: string | null; professional_address: string | null }
  patient: { name: string; species: string | null; breed: string | null; sex: string; age: string | null; weight: number | null }
  owner: { full_name: string; address: string | null }
  record: { diagnosis: string | null; treatment: string | null; emittedAt: string }
  prescriptions: Array<{ medication_name: string; active_ingredient: string | null; dosage: string; route_of_administration: string | null; frequency: string; duration: string; notes: string | null }>
  footerNote: string | null
  validityDays: number | null
}

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }
const BLANK = '________________'

export function PrescriptionDocument({ clinic, vet, patient, owner, record, prescriptions, footerNote, validityDays }: PrescriptionData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: clinic + RECETA */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            {(clinic.address || clinic.phone) && (
              <Text style={styles.clinicMeta}>
                {[clinic.address, clinic.phone].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          {clinic.logoUrl
            ? <Image src={clinic.logoUrl} style={styles.logo} />
            : <Text style={styles.rxLabel}>RECETA</Text>}
        </View>

        {/* Vet block */}
        <View style={styles.vetBlock}>
          <Text style={styles.vetName}>M.V.Z. {vet.full_name}</Text>
          <Text style={styles.vetMeta}>Cédula Profesional: {vet.professional_license || BLANK}</Text>
          <Text style={styles.vetMeta}>{vet.professional_address || BLANK}</Text>
          <Text style={styles.emitDate}>Fecha de emisión: {record.emittedAt}</Text>
        </View>

        {/* Patient + Owner */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Paciente</Text>
            <Text style={styles.fieldLine}>{patient.name}</Text>
            <Text style={styles.fieldLine}>
              {[patient.species, patient.breed].filter(Boolean).join(' · ') || '—'}
            </Text>
            <Text style={styles.fieldLine}>
              {[SEX_LABELS[patient.sex] ?? patient.sex, patient.age, patient.weight != null ? `${patient.weight} kg` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Propietario</Text>
            <Text style={styles.fieldLine}>{owner.full_name}</Text>
            <Text style={styles.fieldLine}>{owner.address || '—'}</Text>
          </View>
        </View>

        {/* Diagnóstico */}
        {record.diagnosis && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.bodyText}>{record.diagnosis}</Text>
          </View>
        )}

        {/* Tratamiento */}
        {record.treatment && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Tratamiento</Text>
            <Text style={styles.bodyText}>{record.treatment}</Text>
          </View>
        )}

        {/* Prescripción */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Prescripción</Text>
          {prescriptions.map((p, i) => (
            <View key={i} style={styles.rxItem}>
              <Text style={styles.rxName}>
                {i + 1}. {p.medication_name}{p.active_ingredient ? ` (${p.active_ingredient})` : ''}
              </Text>
              <Text style={styles.rxDetail}>
                {[`Dosis: ${p.dosage}`, p.route_of_administration ? `Vía: ${p.route_of_administration}` : null, `Frecuencia: ${p.frequency}`, `Duración: ${p.duration}`].filter(Boolean).join(' · ')}
              </Text>
              {p.notes && <Text style={styles.rxNotes}>{p.notes}</Text>}
            </View>
          ))}
        </View>

        {/* Footer note + validity */}
        {footerNote && <Text style={styles.footerNote}>{footerNote}</Text>}
        {validityDays != null && <Text style={styles.validity}>Vigencia: {validityDays} días</Text>}

        {/* Signature space */}
        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>
            {vet.full_name}{vet.professional_license ? ` · Céd. ${vet.professional_license}` : ''}
          </Text>
          <Text style={styles.signatureCaption}>Firma del médico</Text>
        </View>

        {/* Mandatory legend */}
        <Text style={styles.legend}>Reservado al tratamiento de animales</Text>
      </Page>
    </Document>
  )
}
