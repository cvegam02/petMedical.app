export type TenantType = 'individual' | 'enterprise'
export type UserRole = 'admin' | 'staff' | 'doctor' | 'assistant'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'grace_period'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type PetSex = 'male' | 'female' | 'unknown'

export interface TenantSettings {
  confirmation_reminder_days: number
  share_link_expiry_days: number
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
  full_name: string
  email: string | null
  phone: string
  address: string | null
  created_at: string
  updated_at: string
}

export interface Pet {
  id: string
  owner_id: string
  name: string
  species_id: string
  breed_id: string | null
  sex: PetSex
  date_of_birth: string | null
  color: string | null
  microchip: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MedicalRecord {
  id: string
  pet_id: string
  appointment_id: string | null
  tenant_id: string
  created_by: string
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
  medication_name: string
  dosage: string
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
        Row: { id: string; tenant_id: string | null; role: UserRole | null; full_name: string; phone: string | null; is_super_admin: boolean; created_at: string; updated_at: string }
        Insert: { id: string; tenant_id?: string | null; role?: UserRole | null; full_name: string; phone?: string | null; is_super_admin?: boolean }
        Update: { tenant_id?: string | null; role?: UserRole | null; full_name?: string; phone?: string | null; is_super_admin?: boolean; updated_at?: string }
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
        Row: { id: string; full_name: string; email: string | null; phone: string; address: string | null; created_at: string; updated_at: string }
        Insert: { full_name: string; email?: string | null; phone: string; address?: string | null }
        Update: { full_name?: string; email?: string | null; phone?: string; address?: string | null; updated_at?: string }
        Relationships: []
      }
      pets: {
        Row: { id: string; owner_id: string; name: string; species_id: string; breed_id: string | null; sex: PetSex; date_of_birth: string | null; color: string | null; microchip: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { owner_id: string; name: string; species_id: string; breed_id?: string | null; sex: PetSex; date_of_birth?: string | null; color?: string | null; microchip?: string | null; notes?: string | null }
        Update: { owner_id?: string; name?: string; species_id?: string; breed_id?: string | null; sex?: PetSex; date_of_birth?: string | null; color?: string | null; microchip?: string | null; notes?: string | null; updated_at?: string }
        Relationships: []
      }
      medical_records: {
        Row: { id: string; pet_id: string; appointment_id: string | null; tenant_id: string; created_by: string; reason: string; diagnosis: string | null; treatment: string | null; notes: string | null; weight_kg: number | null; temperature_celsius: number | null; heart_rate_bpm: number | null; respiratory_rate_bpm: number | null; created_at: string }
        Insert: { pet_id: string; appointment_id?: string | null; tenant_id: string; created_by: string; reason: string; diagnosis?: string | null; treatment?: string | null; notes?: string | null; weight_kg?: number | null; temperature_celsius?: number | null; heart_rate_bpm?: number | null; respiratory_rate_bpm?: number | null }
        Update: { [key: string]: never }
        Relationships: []
      }
      prescriptions: {
        Row: { id: string; medical_record_id: string; medication_name: string; dosage: string; frequency: string; duration: string; notes: string | null; created_at: string }
        Insert: { medical_record_id: string; medication_name: string; dosage: string; frequency: string; duration: string; notes?: string | null }
        Update: { [key: string]: never }
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
        Row: { id: string; tenant_id: string; pet_id: string; owner_id: string; assigned_to: string | null; status: AppointmentStatus; scheduled_at: string; duration_minutes: number; reason: string | null; notes: string | null; medical_record_id: string | null; origin_record_id: string | null; google_event_id: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { tenant_id: string; pet_id: string; owner_id: string; assigned_to?: string | null; status?: AppointmentStatus; scheduled_at: string; duration_minutes?: number; reason?: string | null; notes?: string | null; medical_record_id?: string | null; origin_record_id?: string | null; google_event_id?: string | null; created_by?: string | null }
        Update: { tenant_id?: string; pet_id?: string; owner_id?: string; assigned_to?: string | null; status?: AppointmentStatus; scheduled_at?: string; duration_minutes?: number; reason?: string | null; notes?: string | null; medical_record_id?: string | null; origin_record_id?: string | null; google_event_id?: string | null; created_by?: string | null; updated_at?: string }
        Relationships: []
      }
      share_tokens: {
        Row: { id: string; pet_id: string; token: string; created_by: string; expires_at: string; accessed_at: string | null; created_at: string }
        Insert: { pet_id: string; created_by: string; expires_at: string; accessed_at?: string | null }
        Update: { accessed_at?: string | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
