export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          record_id: string | null
          record_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          company_id: string
          created_at: string
          id: string
          report_type: string
          summary: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          report_type: string
          summary: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          report_type?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communications_log: {
        Row: {
          channel: string
          customer_id: string | null
          direction: string
          from_address: string | null
          id: string
          organization_id: string
          payload: string
          provider_message_id: string | null
          status: string
          subject: string | null
          timestamp: string | null
          to_address: string | null
        }
        Insert: {
          channel: string
          customer_id?: string | null
          direction: string
          from_address?: string | null
          id?: string
          organization_id: string
          payload: string
          provider_message_id?: string | null
          status?: string
          subject?: string | null
          timestamp?: string | null
          to_address?: string | null
        }
        Update: {
          channel?: string
          customer_id?: string | null
          direction?: string
          from_address?: string | null
          id?: string
          organization_id?: string
          payload?: string
          provider_message_id?: string | null
          status?: string
          subject?: string | null
          timestamp?: string | null
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "master_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string
          brand_color: string
          business_sector: string
          created_at: string
          id: string
          industry: string | null
          name: string
          notification_preferences: Json
          plan: string
          status: string
        }
        Insert: {
          accent_color?: string
          brand_color?: string
          business_sector?: string
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          notification_preferences?: Json
          plan?: string
          status?: string
        }
        Update: {
          accent_color?: string
          brand_color?: string
          business_sector?: string
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          notification_preferences?: Json
          plan?: string
          status?: string
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          customer_type: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_record_links: {
        Row: {
          company_id: string
          created_at: string
          external_hash: string | null
          external_id: string
          id: string
          integration_id: string | null
          internal_id: string
          internal_table: string
          last_seen_at: string
          provider: string
          sync_connection_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          external_hash?: string | null
          external_id: string
          id?: string
          integration_id?: string | null
          internal_id: string
          internal_table: string
          last_seen_at?: string
          provider: string
          sync_connection_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          external_hash?: string | null
          external_id?: string
          id?: string
          integration_id?: string | null
          internal_id?: string
          internal_table?: string
          last_seen_at?: string
          provider?: string
          sync_connection_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_record_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_record_links_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_record_links_sync_connection_id_fkey"
            columns: ["sync_connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          customer_id: string | null
          due_date: string
          id: string
          lead_id: string | null
          message: string | null
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          due_date: string
          id?: string
          lead_id?: string | null
          message?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          due_date?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      import_session_rows: {
        Row: {
          action: string
          company_id: string
          created_at: string
          duplicate_reason: string | null
          external_hash: string | null
          external_id: string | null
          id: string
          import_session_id: string
          match_confidence: number | null
          normalized_data: Json
          raw_data: Json
          row_number: number
          status: string
          target_id: string | null
          target_table: string | null
          updated_at: string
          validation_errors: Json
        }
        Insert: {
          action?: string
          company_id: string
          created_at?: string
          duplicate_reason?: string | null
          external_hash?: string | null
          external_id?: string | null
          id?: string
          import_session_id: string
          match_confidence?: number | null
          normalized_data?: Json
          raw_data?: Json
          row_number: number
          status?: string
          target_id?: string | null
          target_table?: string | null
          updated_at?: string
          validation_errors?: Json
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          duplicate_reason?: string | null
          external_hash?: string | null
          external_id?: string | null
          id?: string
          import_session_id?: string
          match_confidence?: number | null
          normalized_data?: Json
          raw_data?: Json
          row_number?: number
          status?: string
          target_id?: string | null
          target_table?: string | null
          updated_at?: string
          validation_errors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_session_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_session_rows_import_session_id_fkey"
            columns: ["import_session_id"]
            isOneToOne: false
            referencedRelation: "import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sessions: {
        Row: {
          committed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          created_rows: number
          duplicate_rows: number
          error_message: string | null
          error_rows: number
          file_name: string | null
          id: string
          mapping: Json
          record_type: string
          skipped_rows: number
          source_name: string | null
          source_type: string
          status: string
          summary: Json
          sync_connection_id: string | null
          total_rows: number
          updated_at: string
          updated_rows: number
          valid_rows: number
        }
        Insert: {
          committed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          created_rows?: number
          duplicate_rows?: number
          error_message?: string | null
          error_rows?: number
          file_name?: string | null
          id?: string
          mapping?: Json
          record_type: string
          skipped_rows?: number
          source_name?: string | null
          source_type?: string
          status?: string
          summary?: Json
          sync_connection_id?: string | null
          total_rows?: number
          updated_at?: string
          updated_rows?: number
          valid_rows?: number
        }
        Update: {
          committed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_rows?: number
          duplicate_rows?: number
          error_message?: string | null
          error_rows?: number
          file_name?: string | null
          id?: string
          mapping?: Json
          record_type?: string
          skipped_rows?: number
          source_name?: string | null
          source_type?: string
          status?: string
          summary?: Json
          sync_connection_id?: string | null
          total_rows?: number
          updated_at?: string
          updated_rows?: number
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_sessions_sync_connection_id_fkey"
            columns: ["sync_connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          company_id: string
          created_at: string
          errors: Json | null
          file_name: string
          id: string
          import_type: string
          records_created: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          errors?: Json | null
          file_name: string
          id?: string
          import_type: string
          records_created?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          errors?: Json | null
          file_name?: string
          id?: string
          import_type?: string
          records_created?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          company_id: string
          created_at: string
          id: string
          metadata: Json
          provider: string
          provider_account_name: string | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          company_id: string
          created_at?: string
          id?: string
          metadata?: Json
          provider: string
          provider_account_name?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          company_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_account_name?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string
          completed_date: string | null
          created_at: string
          customer_id: string | null
          id: string
          job_value: number | null
          lead_id: string | null
          notes: string | null
          paid_status: string
          service_type: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          job_value?: number | null
          lead_id?: string | null
          notes?: string | null
          paid_status?: string
          service_type?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          job_value?: number | null
          lead_id?: string | null
          notes?: string | null
          paid_status?: string
          service_type?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          estimated_value: number | null
          id: string
          next_follow_up_date: string | null
          notes: string | null
          service_requested: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          estimated_value?: number | null
          id?: string
          next_follow_up_date?: string | null
          notes?: string | null
          service_requested?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          estimated_value?: number | null
          id?: string
          next_follow_up_date?: string | null
          notes?: string | null
          service_requested?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      master_customer_audit_logs: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          changed_by: string | null
          customer_id: string | null
          id: string
          organization_id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          changed_by?: string | null
          customer_id?: string | null
          id?: string
          organization_id: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          changed_by?: string | null
          customer_id?: string | null
          id?: string
          organization_id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      master_customers: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          data_health_score: number | null
          first_name: string | null
          hubspot_contact_id: string | null
          id: string
          jobber_client_id: string | null
          last_name: string | null
          metadata: Json | null
          organization_id: string
          primary_email: string | null
          primary_phone: string | null
          quickbooks_customer_id: string | null
          service_address: Json | null
          sync_tokens: Json | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          data_health_score?: number | null
          first_name?: string | null
          hubspot_contact_id?: string | null
          id?: string
          jobber_client_id?: string | null
          last_name?: string | null
          metadata?: Json | null
          organization_id: string
          primary_email?: string | null
          primary_phone?: string | null
          quickbooks_customer_id?: string | null
          service_address?: Json | null
          sync_tokens?: Json | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          data_health_score?: number | null
          first_name?: string | null
          hubspot_contact_id?: string | null
          id?: string
          jobber_client_id?: string | null
          last_name?: string | null
          metadata?: Json | null
          organization_id?: string
          primary_email?: string | null
          primary_phone?: string | null
          quickbooks_customer_id?: string | null
          service_address?: Json | null
          sync_tokens?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clerk_user_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rate_limit_requests: {
        Row: {
          id: number
          key: string
          requested_at: string
        }
        Insert: {
          id?: number
          key: string
          requested_at?: string
        }
        Update: {
          id?: number
          key?: string
          requested_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          customer_id: string | null
          id: string
          job_id: string | null
          payment_status: string
          sale_date: string
          service_type: string | null
          source: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          payment_status?: string
          sale_date?: string
          service_type?: string | null
          source?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          payment_status?: string
          sale_date?: string
          service_type?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          type?: string
        }
        Relationships: []
      }
      sync_connections: {
        Row: {
          company_id: string
          created_at: string
          id: string
          integration_id: string | null
          last_sync_at: string | null
          mapping: Json
          name: string
          record_type: string
          source_name: string | null
          source_type: string
          status: string
          sync_frequency: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          integration_id?: string | null
          last_sync_at?: string | null
          mapping?: Json
          name: string
          record_type: string
          source_name?: string | null
          source_type?: string
          status?: string
          sync_frequency?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          integration_id?: string | null
          last_sync_at?: string | null
          mapping?: Json
          name?: string
          record_type?: string
          source_name?: string | null
          source_type?: string
          status?: string
          sync_frequency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_connections_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          company_id: string
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          records_created: number
          records_failed: number
          records_seen: number
          records_updated: number
          started_at: string
          status: string
          sync_connection_id: string | null
        }
        Insert: {
          company_id: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          records_created?: number
          records_failed?: number
          records_seen?: number
          records_updated?: number
          started_at?: string
          status?: string
          sync_connection_id?: string | null
        }
        Update: {
          company_id?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          records_created?: number
          records_failed?: number
          records_seen?: number
          records_updated?: number
          started_at?: string
          status?: string
          sync_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_runs_sync_connection_id_fkey"
            columns: ["sync_connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_requests: {
        Row: {
          company: string
          company_size: string
          created_at: string
          email: string
          id: string
          name: string
          status: string
          use_case: string
          website: string | null
        }
        Insert: {
          company: string
          company_size: string
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
          use_case: string
          website?: string | null
        }
        Update: {
          company?: string
          company_size?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          use_case?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company: {
        Args: {
          p_business_sector?: string
          p_industry?: string
          p_name: string
        }
        Returns: string
      }
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      set_org_scope: { Args: { p_org_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
