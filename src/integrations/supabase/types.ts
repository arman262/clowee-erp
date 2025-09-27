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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string
          franchise_id: string | null
          file_name: string
          file_url: string
          file_type: string
          file_size: number | null
          mime_type: string | null
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          franchise_id?: string | null
          file_name: string
          file_url: string
          file_type: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          franchise_id?: string | null
          file_name?: string
          file_url?: string
          file_type?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      franchises: {
        Row: {
          agreement_copy: string | null
          clowee_share: number
          coin_price: number
          created_at: string | null
          doll_price: number
          electricity_cost: number
          franchise_share: number
          id: string
          maintenance_percentage: number | null
          name: string
          payment_duration: string
          security_deposit_notes: string | null
          security_deposit_type: string | null
          trade_nid_copy: string[] | null
          updated_at: string | null
          vat_percentage: number | null
        }
        Insert: {
          agreement_copy?: string | null
          clowee_share: number
          coin_price: number
          created_at?: string | null
          doll_price: number
          electricity_cost: number
          franchise_share: number
          id?: string
          maintenance_percentage?: number | null
          name: string
          payment_duration: string
          security_deposit_notes?: string | null
          security_deposit_type?: string | null
          trade_nid_copy?: string[] | null
          updated_at?: string | null
          vat_percentage?: number | null
        }
        Update: {
          agreement_copy?: string | null
          clowee_share?: number
          coin_price?: number
          created_at?: string | null
          doll_price?: number
          electricity_cost?: number
          franchise_share?: number
          id?: string
          maintenance_percentage?: number | null
          name?: string
          payment_duration?: string
          security_deposit_notes?: string | null
          security_deposit_type?: string | null
          trade_nid_copy?: string[] | null
          updated_at?: string | null
          vat_percentage?: number | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          item_name: string
          quantity: number
          sku: string | null
          supplier: string | null
          total_value: number | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name: string
          quantity?: number
          sku?: string | null
          supplier?: string | null
          total_value?: number | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name?: string
          quantity?: number
          sku?: string | null
          supplier?: string | null
          total_value?: number | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          notes: string | null
          quantity: number
          related_invoice: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity: number
          related_invoice?: string | null
          transaction_date: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          related_invoice?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_related_invoice_fkey"
            columns: ["related_invoice"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          clowee_share_amount: number
          created_at: string | null
          electricity_cost: number | null
          franchise_id: string | null
          franchise_share_amount: number
          id: string
          invoice_date: string
          machine_id: string | null
          net_profit: number
          pay_to_clowee: number
          pdf_url: string | null
          status: string | null
          total_prize_cost: number
          total_sales: number
          vat_amount: number | null
        }
        Insert: {
          clowee_share_amount: number
          created_at?: string | null
          electricity_cost?: number | null
          franchise_id?: string | null
          franchise_share_amount: number
          id?: string
          invoice_date: string
          machine_id?: string | null
          net_profit: number
          pay_to_clowee: number
          pdf_url?: string | null
          status?: string | null
          total_prize_cost: number
          total_sales: number
          vat_amount?: number | null
        }
        Update: {
          clowee_share_amount?: number
          created_at?: string | null
          electricity_cost?: number | null
          franchise_id?: string | null
          franchise_share_amount?: number
          id?: string
          invoice_date?: string
          machine_id?: string | null
          net_profit?: number
          pay_to_clowee?: number
          pdf_url?: string | null
          status?: string | null
          total_prize_cost?: number
          total_sales?: number
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          balance: number | null
          created_at: string | null
          credit: number
          debit: number
          description: string | null
          entry_date: string
          id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_date: string
          id?: string
          reference_id?: string | null
          type: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_date?: string
          id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      machine_counters: {
        Row: {
          coin_counter: number
          created_at: string | null
          id: string
          machine_id: string | null
          notes: string | null
          prize_counter: number
          reading_date: string
        }
        Insert: {
          coin_counter: number
          created_at?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          prize_counter: number
          reading_date: string
        }
        Update: {
          coin_counter?: number
          created_at?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          prize_counter?: number
          reading_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_counters_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          branch_location: string
          created_at: string | null
          esp_id: string
          franchise_id: string | null
          id: string
          initial_coin_counter: number
          initial_prize_counter: number
          installation_date: string
          machine_name: string
          machine_number: string
          notes: string | null
        }
        Insert: {
          branch_location: string
          created_at?: string | null
          esp_id: string
          franchise_id?: string | null
          id?: string
          initial_coin_counter: number
          initial_prize_counter: number
          installation_date: string
          machine_name: string
          machine_number: string
          notes?: string | null
        }
        Update: {
          branch_location?: string
          created_at?: string | null
          esp_id?: string
          franchise_id?: string | null
          id?: string
          initial_coin_counter?: number
          initial_prize_counter?: number
          installation_date?: string
          machine_name?: string
          machine_number?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          coin_price: number | null
          created_at: string | null
          doll_price: number | null
          effective_date: string
          electricity_cost: number | null
          franchise_id: string | null
          id: string
          vat_percentage: number | null
        }
        Insert: {
          coin_price?: number | null
          created_at?: string | null
          doll_price?: number | null
          effective_date: string
          electricity_cost?: number | null
          franchise_id?: string | null
          id?: string
          vat_percentage?: number | null
        }
        Update: {
          coin_price?: number | null
          created_at?: string | null
          doll_price?: number | null
          effective_date?: string
          electricity_cost?: number | null
          franchise_id?: string | null
          id?: string
          vat_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          coin_sales: number
          created_at: string | null
          franchise_id: string | null
          id: string
          machine_id: string | null
          prize_out_cost: number
          prize_out_quantity: number
          sales_amount: number
          sales_date: string
        }
        Insert: {
          coin_sales: number
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          machine_id?: string | null
          prize_out_cost: number
          prize_out_quantity: number
          sales_amount: number
          sales_date: string
        }
        Update: {
          coin_sales?: number
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          machine_id?: string | null
          prize_out_cost?: number
          prize_out_quantity?: number
          sales_amount?: number
          sales_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          franchise_id: string | null
          id: string
          name: string
          password_hash: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          franchise_id?: string | null
          id?: string
          name: string
          password_hash: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          franchise_id?: string | null
          id?: string
          name?: string
          password_hash?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
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
