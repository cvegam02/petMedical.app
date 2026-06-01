export type TenantType = 'individual' | 'enterprise'
export type UserRole = 'admin' | 'staff' | 'doctor' | 'assistant'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'grace_period'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type AppointmentType = 'consultation' | 'grooming'
export type ServiceType = 'consultation' | 'grooming' | 'surgery' | 'hospitalization' | 'boarding'
export type VisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type PetSex = 'male' | 'female' | 'unknown'

export interface BusinessHoursConfig {
  days: number[]
  start: string
  end: string
  slot_interval: number
}

export interface TenantSettings {
  confirmation_reminder_days: number
  share_link_expiry_days: number
  business_hours: BusinessHoursConfig
  prescription_footer_note?: string
  prescription_validity_days?: number
}

export interface Tenant {
  id: string
  name: string
  slug: string
  type: TenantType
  subscription_status: SubscriptionStatus
  trial_ends_at: string
  grace_period_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  settings: TenantSettings
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string | null
  role: UserRole | null
  full_name: string
  phone: string | null
  professional_license: string | null
  professional_address: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface Species {
  id: string
  name: string
  created_at: string
}

export interface Breed {
  id: string
  species_id: string
  name: string
  created_at: string
}

export interface Owner {
  id: string
  tenant_id: string
  full_name: string
  email: string | null
  phone: string
  address: string | null
  created_at: string
  updated_at: string
}

export interface Pet {
  id: string
  name: string
  species_id: string
  breed_id: string | null
  sex: PetSex
  date_of_birth: string | null
  color: string | null
  microchip: string | null
  notes: string | null
  sterilized: boolean
  habitat: string | null
  feeding: string | null
  cohabitation: boolean
  cohabitation_details: string | null
  created_at: string
  updated_at: string
}

export interface VaccineCatalog {
  id: string
  tenant_id: string
  name: string
  manufacturer: string | null
  lot_number: string | null
  stock_quantity: number
  low_stock_threshold: number
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MedicationCatalog {
  id: string
  tenant_id: string
  name: string
  active_ingredient: string | null
  description: string | null
  dose_per_kg: number | null
  dose_unit: string | null
  concentration: string | null
  default_route: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PetVaccination {
  id: string
  pet_id: string
  tenant_id: string
  applied_by: string | null
  medical_record_id: string | null
  vaccine_catalog_id: string | null
  vaccine_name: string
  lot_number: string | null
  application_date: string
  next_due_date: string | null
  notes: string | null
  created_at: string
}

export interface PetDeworming {
  id: string
  pet_id: string
  tenant_id: string
  applied_by: string
  medical_record_id: string | null
  product_name: string
  application_date: string
  next_due_date: string | null
  notes: string | null
  created_at: string
}

export type PetRegistrationStatus = 'active' | 'inactive' | 'deceased'

export interface PetRegistration {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  registered_at: string
  notes: string | null
  status: PetRegistrationStatus
  status_changed_at: string | null
  date_of_death: string | null
}

export interface CrossTenantPetResult {
  pet_id: string
  pet_name: string
  species_name: string
  breed_name: string | null
  sex: PetSex
  date_of_birth: string | null
  microchip: string | null
  owner_full_name: string | null
  owner_phone: string | null
  record_count: number
  last_visit_at: string | null
  last_clinic: string | null
}

export interface MedicalRecord {
  id: string
  pet_id: string
  appointment_id: string | null
  tenant_id: string
  created_by: string
  attended_by: string | null
  reason: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  weight_kg: number | null
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate_bpm: number | null
  created_at: string
}

export interface Prescription {
  id: string
  medical_record_id: string
  medication_catalog_id: string | null
  medication_name: string
  active_ingredient: string | null
  dosage: string
  suggested_dose: string | null
  route_of_administration: string | null
  frequency: string
  duration: string
  notes: string | null
  created_at: string
}

export interface Attachment {
  id: string
  medical_record_id: string
  file_name: string
  file_type: string
  storage_path: string
  created_by: string
  created_at: string
}

export interface Addendum {
  id: string
  medical_record_id: string
  content: string
  created_by: string
  created_at: string
}

export interface ServiceVisit {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  appointment_id: string | null
  service_type: ServiceType
  status: VisitStatus
  started_at: string | null
  ended_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ServiceVisitDelivery {
  id: string
  visit_id: string
  tenant_id: string
  channel: 'whatsapp' | 'email' | 'pdf' | 'print'
  delivered_at: string
  delivered_by: string
}

export interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  assigned_to: string | null
  status: AppointmentStatus
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  notes: string | null
  medical_record_id: string | null
  origin_record_id: string | null
  google_event_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  appointment_type: AppointmentType
}

export interface ShareToken {
  id: string
  pet_id: string
  token: string
  created_by: string
  expires_at: string
  accessed_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; slug: string; type: TenantType; subscription_status: SubscriptionStatus; trial_ends_at: string; grace_period_ends_at: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null; settings: TenantSettings; created_at: string; updated_at: string }
        Insert: { name: string; slug: string; type: TenantType; subscription_status?: SubscriptionStatus; trial_ends_at?: string; grace_period_ends_at?: string | null; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; settings?: TenantSettings }
        Update: { name?: string; slug?: string; type?: TenantType; subscription_status?: SubscriptionStatus; trial_ends_at?: string; grace_period_ends_at?: string | null; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; settings?: TenantSettings; updated_at?: string }
        Relationships: []
      }
      user_profiles: {
        Row: { id: string; tenant_id: string | null; role: UserRole | null; full_name: string; phone: string | null; professional_license: string | null; professional_address: string | null; is_super_admin: boolean; created_at: string; updated_at: string }
        Insert: { id: string; tenant_id?: string | null; role?: UserRole | null; full_name: string; phone?: string | null; professional_license?: string | null; professional_address?: string | null; is_super_admin?: boolean }
        Update: { tenant_id?: string | null; role?: UserRole | null; full_name?: string; phone?: string | null; professional_license?: string | null; professional_address?: string | null; is_super_admin?: boolean; updated_at?: string }
        Relationships: []
      }
      invitations: {
        Row: { id: string; tenant_id: string; email: string; role: UserRole; token: string; invited_by: string | null; accepted_at: string | null; expires_at: string; created_at: string }
        Insert: { tenant_id: string; email: string; role: UserRole; invited_by?: string | null; accepted_at?: string | null; expires_at?: string }
        Update: { accepted_at?: string | null }
        Relationships: []
      }
      species: {
        Row: { id: string; name: string; created_at: string }
        Insert: { name: string }
        Update: { name?: string }
        Relationships: []
      }
      breeds: {
        Row: { id: string; species_id: string; name: string; created_at: string }
        Insert: { species_id: string; name: string }
        Update: { species_id?: string; name?: string }
        Relationships: []
      }
      owners: {
        Row: { id: string; tenant_id: string; full_name: string; email: string | null; phone: string; address: string | null; created_at: string; updated_at: string }
        Insert: { tenant_id: string; full_name: string; email?: string | null; phone: string; address?: string | null }
        Update: { full_name?: string; email?: string | null; phone?: string; address?: string | null; updated_at?: string }
        Relationships: []
      }
      pet_registrations: {
        Row: { id: string; tenant_id: string; pet_id: string; owner_id: string; registered_at: string; notes: string | null; status: PetRegistrationStatus; status_changed_at: string | null; date_of_death: string | null }
        Insert: { tenant_id: string; pet_id: string; owner_id: string; notes?: string | null; status?: PetRegistrationStatus; status_changed_at?: string | null; date_of_death?: string | null }
        Update: { notes?: string | null; status?: PetRegistrationStatus; status_changed_at?: string | null; date_of_death?: string | null }
        Relationships: []
      }
      pets: {
        Row: {
          id: string; name: string; species_id: string; breed_id: string | null;
          sex: PetSex; date_of_birth: string | null; color: string | null;
          microchip: string | null; notes: string | null;
          sterilized: boolean; habitat: string | null; feeding: string | null;
          cohabitation: boolean; cohabitation_details: string | null;
          created_at: string; updated_at: string
        }
        Insert: {
          name: string; species_id: string; breed_id?: string | null;
          sex: PetSex; date_of_birth?: string | null; color?: string | null;
          microchip?: string | null; notes?: string | null;
          sterilized?: boolean; habitat?: string | null; feeding?: string | null;
          cohabitation?: boolean; cohabitation_details?: string | null
        }
        Update: {
          name?: string; species_id?: string; breed_id?: string | null;
          sex?: PetSex; date_of_birth?: string | null; color?: string | null;
          microchip?: string | null; notes?: string | null;
          sterilized?: boolean; habitat?: string | null; feeding?: string | null;
          cohabitation?: boolean; cohabitation_details?: string | null;
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: { id: string; pet_id: string; appointment_id: string | null; tenant_id: string; created_by: string; attended_by: string | null; reason: string; diagnosis: string | null; treatment: string | null; notes: string | null; weight_kg: number | null; temperature_celsius: number | null; heart_rate_bpm: number | null; respiratory_rate_bpm: number | null; created_at: string }
        Insert: { pet_id: string; appointment_id?: string | null; tenant_id: string; created_by: string; attended_by?: string | null; reason: string; diagnosis?: string | null; treatment?: string | null; notes?: string | null; weight_kg?: number | null; temperature_celsius?: number | null; heart_rate_bpm?: number | null; respiratory_rate_bpm?: number | null }
        Update: { [key: string]: never }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: string; medical_record_id: string; medication_catalog_id: string | null;
          medication_name: string; active_ingredient: string | null; dosage: string;
          suggested_dose: string | null; route_of_administration: string | null;
          frequency: string; duration: string; notes: string | null; created_at: string
        }
        Insert: {
          medical_record_id: string; medication_catalog_id?: string | null;
          medication_name: string; active_ingredient?: string | null; dosage: string;
          suggested_dose?: string | null; route_of_administration?: string | null;
          frequency: string; duration: string; notes?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      attachments: {
        Row: { id: string; medical_record_id: string; file_name: string; file_type: string; storage_path: string; created_by: string; created_at: string }
        Insert: { medical_record_id: string; file_name: string; file_type: string; storage_path: string; created_by: string }
        Update: { [key: string]: never }
        Relationships: []
      }
      addendums: {
        Row: { id: string; medical_record_id: string; content: string; created_by: string; created_at: string }
        Insert: { medical_record_id: string; content: string; created_by: string }
        Update: { [key: string]: never }
        Relationships: []
      }
      appointments: {
        Row: { id: string; tenant_id: string; pet_id: string; owner_id: string; assigned_to: string | null; status: AppointmentStatus; scheduled_at: string; duration_minutes: number; reason: string | null; notes: string | null; medical_record_id: string | null; origin_record_id: string | null; google_event_id: string | null; created_by: string | null; created_at: string; updated_at: string; appointment_type: AppointmentType }
        Insert: { tenant_id: string; pet_id: string; owner_id: string; assigned_to?: string | null; status?: AppointmentStatus; scheduled_at: string; duration_minutes?: number; reason?: string | null; notes?: string | null; medical_record_id?: string | null; origin_record_id?: string | null; google_event_id?: string | null; created_by?: string | null; appointment_type?: AppointmentType }
        Update: { tenant_id?: string; pet_id?: string; owner_id?: string; assigned_to?: string | null; status?: AppointmentStatus; scheduled_at?: string; duration_minutes?: number; reason?: string | null; notes?: string | null; medical_record_id?: string | null; origin_record_id?: string | null; google_event_id?: string | null; created_by?: string | null; updated_at?: string; appointment_type?: AppointmentType }
        Relationships: []
      }
      share_tokens: {
        Row: { id: string; pet_id: string; token: string; created_by: string; expires_at: string; accessed_at: string | null; created_at: string }
        Insert: { pet_id: string; created_by: string; expires_at: string; accessed_at?: string | null }
        Update: { accessed_at?: string | null }
        Relationships: []
      }
      vaccine_catalog: {
        Row: { id: string; tenant_id: string; name: string; manufacturer: string | null; lot_number: string | null; stock_quantity: number; low_stock_threshold: number; active: boolean; notes: string | null; created_at: string; updated_at: string }
        Insert: { tenant_id: string; name: string; manufacturer?: string | null; lot_number?: string | null; stock_quantity?: number; low_stock_threshold?: number; active?: boolean; notes?: string | null }
        Update: { name?: string; manufacturer?: string | null; lot_number?: string | null; stock_quantity?: number; low_stock_threshold?: number; active?: boolean; notes?: string | null; updated_at?: string }
        Relationships: []
      }
      medication_catalog: {
        Row: { id: string; tenant_id: string; name: string; active_ingredient: string | null; description: string | null; dose_per_kg: number | null; dose_unit: string | null; concentration: string | null; default_route: string | null; active: boolean; notes: string | null; created_at: string; updated_at: string }
        Insert: { tenant_id: string; name: string; active_ingredient?: string | null; description?: string | null; dose_per_kg?: number | null; dose_unit?: string | null; concentration?: string | null; default_route?: string | null; active?: boolean; notes?: string | null }
        Update: { name?: string; active_ingredient?: string | null; description?: string | null; dose_per_kg?: number | null; dose_unit?: string | null; concentration?: string | null; default_route?: string | null; active?: boolean; notes?: string | null; updated_at?: string }
        Relationships: []
      }
      pet_vaccinations: {
        Row: { id: string; pet_id: string; tenant_id: string; applied_by: string | null; medical_record_id: string | null; vaccine_catalog_id: string | null; vaccine_name: string; lot_number: string | null; application_date: string; next_due_date: string | null; notes: string | null; created_at: string }
        Insert: { pet_id: string; tenant_id: string; applied_by?: string | null; medical_record_id?: string | null; vaccine_catalog_id?: string | null; vaccine_name: string; lot_number?: string | null; application_date: string; next_due_date?: string | null; notes?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
      pet_dewormings: {
        Row: { id: string; pet_id: string; tenant_id: string; applied_by: string; medical_record_id: string | null; product_name: string; application_date: string; next_due_date: string | null; notes: string | null; created_at: string }
        Insert: { pet_id: string; tenant_id: string; applied_by: string; medical_record_id?: string | null; product_name: string; application_date: string; next_due_date?: string | null; notes?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
      grooming_service_catalog: {
        Row: { id: string; tenant_id: string; name: string; duration_minutes: number | null; active: boolean; notes: string | null; created_at: string; updated_at: string }
        Insert: { tenant_id: string; name: string; duration_minutes?: number | null; active?: boolean; notes?: string | null }
        Update: { name?: string; duration_minutes?: number | null; active?: boolean; notes?: string | null; updated_at?: string }
        Relationships: []
      }
      grooming_sessions: {
        Row: { id: string; tenant_id: string; pet_id: string; appointment_id: string | null; session_date: string; notes: string | null; created_by: string; created_at: string; started_at: string | null; ended_at: string | null }
        Insert: { tenant_id: string; pet_id: string; appointment_id?: string | null; session_date: string; notes?: string | null; created_by: string; started_at?: string | null; ended_at?: string | null }
        Update: { notes?: string | null; started_at?: string | null; ended_at?: string | null }
        Relationships: []
      }
      grooming_session_services: {
        Row: { id: string; session_id: string; tenant_id: string; service_catalog_id: string | null; service_name: string; created_at: string }
        Insert: { session_id: string; tenant_id: string; service_catalog_id?: string | null; service_name: string }
        Update: Record<string, never>
        Relationships: []
      }
      service_visits: {
        Row: { id: string; tenant_id: string; pet_id: string; owner_id: string; appointment_id: string | null; service_type: ServiceType; status: VisitStatus; started_at: string | null; ended_at: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { tenant_id: string; pet_id: string; owner_id: string; appointment_id?: string | null; service_type: ServiceType; status?: VisitStatus; started_at?: string | null; ended_at?: string | null; created_by: string }
        Update: { status?: VisitStatus; started_at?: string | null; ended_at?: string | null; updated_at?: string }
        Relationships: []
      }
      service_visit_deliveries: {
        Row: { id: string; visit_id: string; tenant_id: string; channel: 'whatsapp' | 'email' | 'pdf' | 'print'; delivered_at: string; delivered_by: string }
        Insert: { visit_id: string; tenant_id: string; channel: 'whatsapp' | 'email' | 'pdf' | 'print'; delivered_by: string }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export type GroomingServiceCatalog = Database['public']['Tables']['grooming_service_catalog']['Row']
export type GroomingSession = Database['public']['Tables']['grooming_sessions']['Row']
export type GroomingSessionService = Database['public']['Tables']['grooming_session_services']['Row']
