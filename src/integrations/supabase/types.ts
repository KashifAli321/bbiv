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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      credentials: {
        Row: {
          citizen_address: string
          citizen_user_id: string
          created_at: string
          credential_hash: string
          date_of_birth: string | null
          expiry_date: string | null
          face_descriptor: number[] | null
          face_descriptor_hash: string | null
          full_name: string
          id: string
          issued_at: string
          issuer_address: string
          issuer_user_id: string
          national_id: string
          revocation_tx_hash: string | null
          revoked_at: string | null
          revoked_by: string | null
          signature: string
          updated_at: string
        }
        Insert: {
          citizen_address: string
          citizen_user_id: string
          created_at?: string
          credential_hash: string
          date_of_birth?: string | null
          expiry_date?: string | null
          face_descriptor?: number[] | null
          face_descriptor_hash?: string | null
          full_name: string
          id?: string
          issued_at?: string
          issuer_address: string
          issuer_user_id: string
          national_id: string
          revocation_tx_hash?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          signature: string
          updated_at?: string
        }
        Update: {
          citizen_address?: string
          citizen_user_id?: string
          created_at?: string
          credential_hash?: string
          date_of_birth?: string | null
          expiry_date?: string | null
          face_descriptor?: number[] | null
          face_descriptor_hash?: string | null
          full_name?: string
          id?: string
          issued_at?: string
          issuer_address?: string
          issuer_user_id?: string
          national_id?: string
          revocation_tx_hash?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          signature?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          face_descriptor: number[] | null
          face_descriptor_hash: string | null
          id: string
          updated_at: string
          user_id: string
          username: string
          wallet_address: string | null
          wallet_private_key_encrypted: string | null
        }
        Insert: {
          created_at?: string
          face_descriptor?: number[] | null
          face_descriptor_hash?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
          wallet_address?: string | null
          wallet_private_key_encrypted?: string | null
        }
        Update: {
          created_at?: string
          face_descriptor?: number[] | null
          face_descriptor_hash?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
          wallet_address?: string | null
          wallet_private_key_encrypted?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      check_credential_face_similarity: {
        Args: { _descriptor: number[]; _threshold?: number }
        Returns: boolean
      }
      check_face_similarity: {
        Args: { _descriptor: number[]; _threshold?: number }
        Returns: boolean
      }
      check_face_similarity_with_wallet: {
        Args: { _descriptor: number[]; _threshold?: number }
        Returns: {
          similar_exists: boolean
          wallet_address: string
        }[]
      }
      credential_exists_for_address: {
        Args: { _address: string }
        Returns: boolean
      }
      credential_face_hash_exists: { Args: { _hash: string }; Returns: boolean }
      face_hash_exists: { Args: { _hash: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized_issuer: { Args: { _user_id?: string }; Returns: boolean }
      username_exists: { Args: { _username: string }; Returns: boolean }
      verify_credential: { Args: { _citizen_address: string }; Returns: Json }
      wallet_address_exists: { Args: { _address: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
