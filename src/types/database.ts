export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          severity: Database["public"]["Enums"]["announcement_severity"]
          team_sector: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          severity: Database["public"]["Enums"]["announcement_severity"]
          team_sector?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          severity?: Database["public"]["Enums"]["announcement_severity"]
          team_sector?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          player_id: string
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
          type: Database["public"]["Enums"]["training_type"] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          player_id: string
          session_date: string
          status?: Database["public"]["Enums"]["attendance_status"]
          type?: Database["public"]["Enums"]["training_type"] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          type?: Database["public"]["Enums"]["training_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      call_ups: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          player_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          player_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_ups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_ups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_teams: {
        Row: {
          created_at: string | null
          profile_id: string
          team_sector: string
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          team_sector: string
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          team_sector?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_teams_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_usage: {
        Row: {
          group_target: string | null
          id: string
          recipient_count: number
          sent_at: string
          sent_by: string | null
          subject: string | null
        }
        Insert: {
          group_target?: string | null
          id?: string
          recipient_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Update: {
          group_target?: string | null
          id?: string
          recipient_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          call_up_published_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          meetup_time: string | null
          opponent: string | null
          start_date: string
          team_sector: string | null
          title: string
          updated_at: string
        }
        Insert: {
          call_up_published_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          meetup_time?: string | null
          opponent?: string | null
          start_date: string
          team_sector?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          call_up_published_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          meetup_time?: string | null
          opponent?: string | null
          start_date?: string
          team_sector?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"] | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["inventory_category"] | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"] | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_visits: {
        Row: {
          created_at: string | null
          expiry_date: string
          id: string
          notes: string | null
          player_id: string
          visit_date: string
        }
        Insert: {
          created_at?: string | null
          expiry_date: string
          id?: string
          notes?: string | null
          player_id: string
          visit_date: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string
          id?: string
          notes?: string | null
          player_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_visits_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_players: {
        Row: {
          created_at: string | null
          parent_profile_id: string
          player_id: string
          status: Database["public"]["Enums"]["parent_link_status"]
        }
        Insert: {
          created_at?: string | null
          parent_profile_id: string
          player_id: string
          status?: Database["public"]["Enums"]["parent_link_status"]
        }
        Update: {
          created_at?: string | null
          parent_profile_id?: string
          player_id?: string
          status?: Database["public"]["Enums"]["parent_link_status"]
        }
        Relationships: [
          {
            foreignKeyName: "parent_players_parent_profile_id_fkey"
            columns: ["parent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_eur: number | null
          created_at: string | null
          due_date: string | null
          id: string
          installment_no: number
          notes: string | null
          paid_amount_eur: number | null
          payment_method: string | null
          plan: string | null
          player_id: string
          receipt_date: string | null
          receipt_number: string | null
          season_id: string
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount_eur?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          installment_no?: number
          notes?: string | null
          paid_amount_eur?: number | null
          payment_method?: string | null
          plan?: string | null
          player_id: string
          receipt_date?: string | null
          receipt_number?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount_eur?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          installment_no?: number
          notes?: string | null
          paid_amount_eur?: number | null
          payment_method?: string | null
          plan?: string | null
          player_id?: string
          receipt_date?: string | null
          receipt_number?: string | null
          season_id?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          address_city: string | null
          address_locality: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          birth_place: string | null
          citizenship: string | null
          created_at: string | null
          email: string | null
          figc_registration: string | null
          first_name: string
          id: string
          is_active: boolean | null
          is_registered: boolean
          last_name: string
          legacy_id: number | null
          medical_expiry: string | null
          notes: string | null
          parent1_name: string | null
          parent1_phone: string | null
          parent1_tax_code: string | null
          parent2_name: string | null
          parent2_phone: string | null
          parent2_tax_code: string | null
          phone_home: string | null
          phone_player: string | null
          previous_player_id: string | null
          privacy_accepted: boolean | null
          profile_id: string | null
          season_id: string
          tax_code: string | null
          team_sector: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_locality?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          birth_place?: string | null
          citizenship?: string | null
          created_at?: string | null
          email?: string | null
          figc_registration?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          is_registered?: boolean
          last_name: string
          legacy_id?: number | null
          medical_expiry?: string | null
          notes?: string | null
          parent1_name?: string | null
          parent1_phone?: string | null
          parent1_tax_code?: string | null
          parent2_name?: string | null
          parent2_phone?: string | null
          parent2_tax_code?: string | null
          phone_home?: string | null
          phone_player?: string | null
          previous_player_id?: string | null
          privacy_accepted?: boolean | null
          profile_id?: string | null
          season_id: string
          tax_code?: string | null
          team_sector?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_locality?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          birth_place?: string | null
          citizenship?: string | null
          created_at?: string | null
          email?: string | null
          figc_registration?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          is_registered?: boolean
          last_name?: string
          legacy_id?: number | null
          medical_expiry?: string | null
          notes?: string | null
          parent1_name?: string | null
          parent1_phone?: string | null
          parent1_tax_code?: string | null
          parent2_name?: string | null
          parent2_phone?: string | null
          parent2_tax_code?: string | null
          phone_home?: string | null
          phone_player?: string | null
          previous_player_id?: string | null
          privacy_accepted?: boolean | null
          profile_id?: string | null
          season_id?: string
          tax_code?: string | null
          team_sector?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_previous_player_id_fkey"
            columns: ["previous_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          ics_token: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          ics_token?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          ics_token?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_payment_plan: {
        Args: {
          p_installments: Json
          p_player_id: string
          p_season_id: string
          p_total_amount: number
        }
        Returns: undefined
      }
      create_season_from_wizard: {
        Args: {
          p_end_date: string
          p_name: string
          p_players: Json
          p_start_date: string
        }
        Returns: Json
      }
      get_coach_sectors: { Args: never; Returns: string[] }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_financial_trend: { Args: { p_season_id: string }; Returns: Json }
      get_my_announcement_sectors: { Args: never; Returns: string[] }
      get_my_next_call_up: {
        Args: never
        Returns: {
          event_type: Database["public"]["Enums"]["event_type"]
          is_called_up: boolean
          is_published: boolean
          meetup_time: string
          opponent: string
          start_date: string
        }[]
      }
      get_my_parent_players: {
        Args: never
        Returns: {
          created_at: string
          first_name: string
          last_name: string
          parent_profile_id: string
          player_id: string
          status: Database["public"]["Enums"]["parent_link_status"]
          team_sector: string
        }[]
      }
      get_parent_player_ids: { Args: never; Returns: string[] }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_call_up_published: { Args: { p_event_id: string }; Returns: boolean }
      is_coach_of_player: { Args: { p_player_id: string }; Returns: boolean }
      is_coach_of_sector: { Args: { p_team_sector: string }; Returns: boolean }
      regenerate_ics_token: { Args: never; Returns: string }
      search_players_for_parent_request: {
        Args: { p_query: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
          team_sector: string
        }[]
      }
    }
    Enums: {
      announcement_severity: "urgent" | "reminder" | "communication"
      attendance_status: "present" | "absent" | "justified"
      event_type:
        | "training"
        | "home_match"
        | "away_match"
        | "meeting"
        | "generic"
      inventory_category: "kit" | "equipment" | "trophy" | "other"
      parent_link_status: "pending" | "confirmed"
      payment_status: "pending" | "paid" | "overdue"
      task_status:
        | "todo"
        | "in_progress"
        | "done"
        | "ready"
        | "archive"
        | "created"
      training_type: "training" | "match" | "event"
      user_role: "president" | "director" | "coach" | "player" | "parent"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      announcement_severity: ["urgent", "reminder", "communication"],
      attendance_status: ["present", "absent", "justified"],
      event_type: [
        "training",
        "home_match",
        "away_match",
        "meeting",
        "generic",
      ],
      inventory_category: ["kit", "equipment", "trophy", "other"],
      parent_link_status: ["pending", "confirmed"],
      payment_status: ["pending", "paid", "overdue"],
      task_status: [
        "todo",
        "in_progress",
        "done",
        "ready",
        "archive",
        "created",
      ],
      training_type: ["training", "match", "event"],
      user_role: ["president", "director", "coach", "player", "parent"],
    },
  },
} as const

