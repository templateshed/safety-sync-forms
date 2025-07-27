export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cleared_form_instances: {
        Row: {
          cleared_at: string
          created_at: string
          form_id: string
          id: string
          instance_date: string
          user_id: string
        }
        Insert: {
          cleared_at?: string
          created_at?: string
          form_id: string
          id?: string
          instance_date: string
          user_id: string
        }
        Update: {
          cleared_at?: string
          created_at?: string
          form_id?: string
          id?: string
          instance_date?: string
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      form_analytics: {
        Row: {
          form_id: string | null
          id: string
          metric_name: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          form_id?: string | null
          id?: string
          metric_name: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          form_id?: string | null
          id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_analytics_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          field_type: Database["public"]["Enums"]["field_type"]
          form_id: string | null
          id: string
          label: string
          options: Json | null
          order_index: number
          placeholder: string | null
          required: boolean | null
          section_id: string | null
          validation_rules: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          field_type: Database["public"]["Enums"]["field_type"]
          form_id?: string | null
          id?: string
          label: string
          options?: Json | null
          order_index: number
          placeholder?: string | null
          required?: boolean | null
          section_id?: string | null
          validation_rules?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          form_id?: string | null
          id?: string
          label?: string
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          required?: boolean | null
          section_id?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "form_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          edit_history: Json | null
          form_id: string | null
          id: string
          ip_address: unknown | null
          respondent_email: string | null
          respondent_user_id: string | null
          response_data: Json
          submitted_at: string
          updated_at: string | null
          updated_by: string | null
          user_agent: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          edit_history?: Json | null
          form_id?: string | null
          id?: string
          ip_address?: unknown | null
          respondent_email?: string | null
          respondent_user_id?: string | null
          response_data: Json
          submitted_at?: string
          updated_at?: string | null
          updated_by?: string | null
          user_agent?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          edit_history?: Json | null
          form_id?: string | null
          id?: string
          ip_address?: unknown | null
          respondent_email?: string | null
          respondent_user_id?: string | null
          response_data?: Json
          submitted_at?: string
          updated_at?: string | null
          updated_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_sections: {
        Row: {
          created_at: string
          description: string | null
          form_id: string
          id: string
          is_collapsed: boolean
          is_collapsible: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_id: string
          id?: string
          is_collapsed?: boolean
          is_collapsible?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          form_id?: string
          id?: string
          is_collapsed?: boolean
          is_collapsible?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_sections_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_signatures: {
        Row: {
          created_at: string
          field_id: string
          id: string
          response_id: string
          signature_data: string
          signature_type: string
          typed_name: string | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          response_id: string
          signature_data: string
          signature_type: string
          typed_name?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          response_id?: string
          signature_data?: string
          signature_type?: string
          typed_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_signatures_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_signatures_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          branding: Json | null
          business_days: Json | null
          business_days_only: boolean | null
          created_at: string
          description: string | null
          exclude_holidays: boolean | null
          folder_id: string | null
          holiday_calendar: string | null
          id: string
          schedule_days: Json | null
          schedule_end_date: string | null
          schedule_frequency: string | null
          schedule_start_date: string | null
          schedule_time: string | null
          schedule_timezone: string | null
          schedule_type: string | null
          settings: Json | null
          short_code: string | null
          status: Database["public"]["Enums"]["form_status"] | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branding?: Json | null
          business_days?: Json | null
          business_days_only?: boolean | null
          created_at?: string
          description?: string | null
          exclude_holidays?: boolean | null
          folder_id?: string | null
          holiday_calendar?: string | null
          id?: string
          schedule_days?: Json | null
          schedule_end_date?: string | null
          schedule_frequency?: string | null
          schedule_start_date?: string | null
          schedule_time?: string | null
          schedule_timezone?: string | null
          schedule_type?: string | null
          settings?: Json | null
          short_code?: string | null
          status?: Database["public"]["Enums"]["form_status"] | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branding?: Json | null
          business_days?: Json | null
          business_days_only?: boolean | null
          created_at?: string
          description?: string | null
          exclude_holidays?: boolean | null
          folder_id?: string | null
          holiday_calendar?: string | null
          id?: string
          schedule_days?: Json | null
          schedule_end_date?: string | null
          schedule_frequency?: string | null
          schedule_start_date?: string | null
          schedule_time?: string | null
          schedule_timezone?: string | null
          schedule_type?: string | null
          settings?: Json | null
          short_code?: string | null
          status?: Database["public"]["Enums"]["form_status"] | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          form_id: string | null
          id: string
          message: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          form_id?: string | null
          id?: string
          message: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string | null
          id?: string
          message?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_forms: {
        Row: {
          active: boolean | null
          created_at: string
          end_date: string | null
          form_id: string | null
          id: string
          schedule_config: Json
          schedule_type: string
          start_date: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          end_date?: string | null
          form_id?: string | null
          id?: string
          schedule_config: Json
          schedule_type: string
          start_date: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          end_date?: string | null
          form_id?: string | null
          id?: string
          schedule_config?: Json
          schedule_type?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          account_type: string | null
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_short_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_form_responses_with_user_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          form_id: string
          respondent_email: string
          respondent_user_id: string
          response_data: Json
          submitted_at: string
          ip_address: unknown
          user_agent: string
          form_title: string
          first_name: string
          last_name: string
          effective_email: string
          form_fields: Json
        }[]
      }
    }
    Enums: {
      field_type:
        | "text"
        | "email"
        | "number"
        | "select"
        | "checkbox"
        | "radio"
        | "textarea"
        | "date"
        | "file"
        | "signature"
      form_status: "draft" | "published" | "archived"
      notification_status: "pending" | "sent" | "failed"
      notification_type: "email" | "sms" | "push"
      subscription_status: "active" | "inactive" | "cancelled" | "past_due"
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
    Enums: {
      field_type: [
        "text",
        "email",
        "number",
        "select",
        "checkbox",
        "radio",
        "textarea",
        "date",
        "file",
        "signature",
      ],
      form_status: ["draft", "published", "archived"],
      notification_status: ["pending", "sent", "failed"],
      notification_type: ["email", "sms", "push"],
      subscription_status: ["active", "inactive", "cancelled", "past_due"],
    },
  },
} as const
