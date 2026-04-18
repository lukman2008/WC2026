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
      crypto_payments: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          chain: Database["public"]["Enums"]["crypto_chain"]
          confirmations: number
          created_at: string
          crypto_amount: number
          deposit_address: string
          error_message: string | null
          expires_at: string
          id: string
          match_id: string
          quantity: number
          rate_usd_per_unit: number
          status: Database["public"]["Enums"]["crypto_payment_status"]
          transaction_id: string | null
          tx_hash: string | null
          updated_at: string
          usd_amount: number
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ticket_category"]
          chain: Database["public"]["Enums"]["crypto_chain"]
          confirmations?: number
          created_at?: string
          crypto_amount: number
          deposit_address: string
          error_message?: string | null
          expires_at: string
          id?: string
          match_id: string
          quantity: number
          rate_usd_per_unit: number
          status?: Database["public"]["Enums"]["crypto_payment_status"]
          transaction_id?: string | null
          tx_hash?: string | null
          updated_at?: string
          usd_amount: number
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          chain?: Database["public"]["Enums"]["crypto_chain"]
          confirmations?: number
          created_at?: string
          crypto_amount?: number
          deposit_address?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          match_id?: string
          quantity?: number
          rate_usd_per_unit?: number
          status?: Database["public"]["Enums"]["crypto_payment_status"]
          transaction_id?: string | null
          tx_hash?: string | null
          updated_at?: string
          usd_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          available_economy: number
          available_regular: number
          available_vip: number
          away_flag: string
          away_team: string
          city: string
          created_at: string
          group_name: string | null
          home_flag: string
          home_team: string
          id: string
          match_date: string
          price_economy: number
          price_regular: number
          price_vip: number
          stadium: string
          stage: Database["public"]["Enums"]["match_stage"]
          updated_at: string
        }
        Insert: {
          available_economy?: number
          available_regular?: number
          available_vip?: number
          away_flag?: string
          away_team: string
          city: string
          created_at?: string
          group_name?: string | null
          home_flag?: string
          home_team: string
          id?: string
          match_date: string
          price_economy: number
          price_regular: number
          price_vip: number
          stadium: string
          stage?: Database["public"]["Enums"]["match_stage"]
          updated_at?: string
        }
        Update: {
          available_economy?: number
          available_regular?: number
          available_vip?: number
          away_flag?: string
          away_team?: string
          city?: string
          created_at?: string
          group_name?: string | null
          home_flag?: string
          home_team?: string
          id?: string
          match_date?: string
          price_economy?: number
          price_regular?: number
          price_vip?: number
          stadium?: string
          stage?: Database["public"]["Enums"]["match_stage"]
          updated_at?: string
        }
        Relationships: []
      }
      pending_purchases: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          coinbase_charge_code: string
          coinbase_charge_id: string
          created_at: string
          currency: string
          hosted_url: string
          id: string
          match_id: string
          quantity: number
          status: Database["public"]["Enums"]["pending_purchase_status"]
          total_amount: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ticket_category"]
          coinbase_charge_code: string
          coinbase_charge_id: string
          created_at?: string
          currency?: string
          hosted_url: string
          id?: string
          match_id: string
          quantity: number
          status?: Database["public"]["Enums"]["pending_purchase_status"]
          total_amount: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          coinbase_charge_code?: string
          coinbase_charge_id?: string
          created_at?: string
          currency?: string
          hosted_url?: string
          id?: string
          match_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["pending_purchase_status"]
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_purchases_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_purchases_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          match_id: string
          price: number
          qr_data: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          match_id: string
          price: number
          qr_data: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          match_id?: string
          price?: number
          qr_data?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_crypto_payment: {
        Args: { _payment_id: string }
        Returns: {
          ticket_codes: string[]
          transaction_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_tickets: {
        Args: {
          _category: Database["public"]["Enums"]["ticket_category"]
          _match_id: string
          _quantity: number
          _user_id: string
        }
        Returns: {
          ticket_codes: string[]
          transaction_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      crypto_chain: "btc" | "eth"
      crypto_payment_status:
        | "awaiting_payment"
        | "submitted"
        | "confirming"
        | "completed"
        | "failed"
        | "expired"
      match_stage:
        | "Group Stage"
        | "Round of 16"
        | "Quarter-Final"
        | "Semi-Final"
        | "Third Place"
        | "Final"
      pending_purchase_status: "pending" | "completed" | "expired" | "failed"
      ticket_category: "vip" | "regular" | "economy"
      ticket_status: "active" | "used" | "cancelled"
      transaction_status: "pending" | "succeeded" | "failed" | "refunded"
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
      app_role: ["admin", "user"],
      crypto_chain: ["btc", "eth"],
      crypto_payment_status: [
        "awaiting_payment",
        "submitted",
        "confirming",
        "completed",
        "failed",
        "expired",
      ],
      match_stage: [
        "Group Stage",
        "Round of 16",
        "Quarter-Final",
        "Semi-Final",
        "Third Place",
        "Final",
      ],
      pending_purchase_status: ["pending", "completed", "expired", "failed"],
      ticket_category: ["vip", "regular", "economy"],
      ticket_status: ["active", "used", "cancelled"],
      transaction_status: ["pending", "succeeded", "failed", "refunded"],
    },
  },
} as const
