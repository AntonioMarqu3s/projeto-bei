import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Cliente principal para operações normais
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente administrativo para operações que requerem privilégios elevados
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient(supabaseUrl, supabaseAnonKey)

// Tipos para o banco de dados
export interface User {
  id: string
  email: string
  name: string
  role: 'technician' | 'maintainer' | 'cluster_manager' | 'admin'
  cluster_id?: string
  available: boolean
  created_at: string
  updated_at: string
}

export interface Cluster {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Plant {
  id: string
  name: string
  cluster_id: string
  location?: string
  created_at: string
  updated_at: string
  cluster?: Cluster
}

export interface DiaryUser {
  user: User;
  role: 'creator' | 'participant';
}

export interface ExternalPerson {
  id: string;
  name: string;
  role?: string;
  contact?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryExternalPerson {
  external_person: ExternalPerson;
}

export interface Diary {
  id: string;
  user_id: string;
  cluster_id: string;
  plant_id: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  general_observations?: string;
  observations?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  plant?: Plant;
  user?: User;
  activities?: DiaryActivity[];
  participants?: DiaryUser[];
  external_people?: DiaryExternalPerson[];
}

export interface DiaryActivity {
  id: string;
  diary_id: string;
  equipment: string;
  activity: string;
  start_time: string;
  end_time: string;
  ss_number?: string;
  observations?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string
  name: string
  cluster_id: string
  created_at: string
  updated_at: string
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  created_at: string
  user?: User
}

// Interface removida - Maintenance não é mais utilizada

// Tipos para relatórios
export interface SSReport {
  cluster_name: string
  plant_name: string
  ss_count: number
  ss_list: string[]
}

export interface HoursReport {
  date: string
  cluster_name: string
  total_hours: number
  activities: {
    equipment: string
    hours: number
    activity: string
  }[]
}

export interface ExportRequest {
  type: 'pdf' | 'txt' | 'excel'
  report_type: 'ss' | 'hours'
  filters: {
    cluster_id?: string
    plant_id?: string
    start_date?: string
    end_date?: string
  }
}

// Tipos para integração Sismetro
export interface SismetroIntegrationRequest {
  equipment: string
  plant_name: string
  activity: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  description?: string
}

export interface SismetroResponse {
  success: boolean
  ss_number?: string
  link?: string
  error?: string
}