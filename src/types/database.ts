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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          player_id: string
          present: boolean | null
          session_date: string
          type: Database["public"]["Enums"]["training_type"] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          player_id: string
          present?: boolean | null
          session_date: string
          type?: Database["public"]["Enums"]["training_type"] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          present?: boolean | null
          session_date?: string
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
      payments: {
        Row: {
          amount_eur: number | null
          created_at: string | null
          id: string
          installment_no: number
          notes: string | null
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
          id?: string
          installment_no?: number
          notes?: string | null
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
          id?: string
          installment_no?: number
          notes?: string | null
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
          privacy_accepted?: boolean | null
          profile_id?: string | null
          season_id?: string
          tax_code?: string | null
          team_sector?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
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
          id: string
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
          id?: string
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
          id?: string
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
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      inventory_category: "kit" | "equipment" | "trophy" | "other"
      payment_status: "pending" | "paid" | "overdue"
      task_status: "todo" | "in_progress" | "done"
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
  public: {
    Enums: {
      inventory_category: ["kit", "equipment", "trophy", "other"],
      payment_status: ["pending", "paid", "overdue"],
      task_status: ["todo", "in_progress", "done"],
      training_type: ["training", "match", "event"],
      user_role: ["president", "director", "coach", "player", "parent"],
    },
  },
} as const
