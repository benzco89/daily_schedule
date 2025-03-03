export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          created_at: string
          title: string
          details: string | null
          notes: string | null
          event_type: 'continuous' | 'full_day' | 'time_specific'
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          color: string
          status: 'active' | 'archived'
          user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          details?: string | null
          notes?: string | null
          event_type: 'continuous' | 'full_day' | 'time_specific'
          start_date: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          color: string
          status?: 'active' | 'archived'
          user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          details?: string | null
          notes?: string | null
          event_type?: 'continuous' | 'full_day' | 'time_specific'
          start_date?: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          color?: string
          status?: 'active' | 'archived'
          user_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}