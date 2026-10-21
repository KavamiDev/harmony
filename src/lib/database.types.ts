export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_feeds: {
        Row: {
          created_at: string
          family_id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_feeds_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          created_at: string
          family_id: string
          first_name: string
          id: string
          mail_local: string
        }
        Insert: {
          created_at?: string
          family_id: string
          first_name: string
          id?: string
          mail_local: string
        }
        Update: {
          created_at?: string
          family_id?: string
          first_name?: string
          id?: string
          mail_local?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_changes: {
        Row: {
          anchor: string | null
          child_id: string
          created_at: string
          cycle: string | null
          decided_at: string | null
          decided_by: string | null
          end_date: string | null
          family_id: string
          handover_time: string | null
          id: string
          kind: string
          note: string | null
          proposed_by: string | null
          side: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          anchor?: string | null
          child_id: string
          created_at?: string
          cycle?: string | null
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string | null
          family_id: string
          handover_time?: string | null
          id?: string
          kind: string
          note?: string | null
          proposed_by?: string | null
          side?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          anchor?: string | null
          child_id?: string
          created_at?: string
          cycle?: string | null
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string | null
          family_id?: string
          handover_time?: string | null
          id?: string
          kind?: string
          note?: string | null
          proposed_by?: string | null
          side?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_changes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_changes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_plans: {
        Row: {
          anchor: string
          child_id: string
          cycle: string
          family_id: string
          handover_time: string
          updated_at: string
        }
        Insert: {
          anchor: string
          child_id: string
          cycle: string
          family_id: string
          handover_time?: string
          updated_at?: string
        }
        Update: {
          anchor?: string
          child_id?: string
          cycle?: string
          family_id?: string
          handover_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_plans_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_plans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          child_id: string | null
          created_at: string
          created_by: string | null
          family_id: string
          id: string
          mail_id: string | null
          mime: string
          name: string
          path: string
          size: number
        }
        Insert: {
          category: string
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          family_id: string
          id?: string
          mail_id?: string | null
          mime: string
          name: string
          path: string
          size: number
        }
        Update: {
          category?: string
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          family_id?: string
          id?: string
          mail_id?: string | null
          mime?: string
          name?: string
          path?: string
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_mail_id_fkey"
            columns: ["mail_id"]
            isOneToOne: false
            referencedRelation: "mails"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          child_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          family_id: string
          id: string
          notes: string | null
          place: string | null
          starts_at: string
          title: string
        }
        Insert: {
          all_day?: boolean
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          family_id: string
          id?: string
          notes?: string | null
          place?: string | null
          starts_at: string
          title: string
        }
        Update: {
          all_day?: boolean
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          family_id?: string
          id?: string
          notes?: string | null
          place?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          paid_until: string | null
          stripe_customer_id: string | null
          trial_ends_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          paid_until?: string | null
          stripe_customer_id?: string | null
          trial_ends_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          paid_until?: string | null
          stripe_customer_id?: string | null
          trial_ends_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id: string
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      mails: {
        Row: {
          child_id: string
          family_id: string
          from_addr: string
          from_name: string | null
          id: string
          message_id: string
          received_at: string
          skipped_attachments: Json
          subject: string
          text: string
        }
        Insert: {
          child_id: string
          family_id: string
          from_addr: string
          from_name?: string | null
          id?: string
          message_id: string
          received_at?: string
          skipped_attachments?: Json
          subject?: string
          text?: string
        }
        Update: {
          child_id?: string
          family_id?: string
          from_addr?: string
          from_name?: string | null
          id?: string
          message_id?: string
          received_at?: string
          skipped_attachments?: Json
          subject?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "mails_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mails_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          display_name: string
          family_id: string
          joined_at: string
          notify_change: boolean
          notify_mail: boolean
          notify_message: boolean
          side: string
          user_id: string
        }
        Insert: {
          display_name: string
          family_id: string
          joined_at?: string
          notify_change?: boolean
          notify_mail?: boolean
          notify_message?: boolean
          side: string
          user_id: string
        }
        Update: {
          display_name?: string
          family_id?: string
          joined_at?: string
          notify_change?: boolean
          notify_mail?: boolean
          notify_message?: boolean
          side?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          family_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          family_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          family_id: string
          id: string
          kind: string
          recipient: string
          ref_id: string
          sent_at: string | null
          skipped: string | null
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          family_id: string
          id?: string
          kind: string
          recipient: string
          ref_id: string
          sent_at?: string | null
          skipped?: string | null
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          recipient?: string
          ref_id?: string
          sent_at?: string | null
          skipped?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _apply_change: {
        Args: { c: Database["public"]["Tables"]["custody_changes"]["Row"] }
        Returns: undefined
      }
      _propose: {
        Args: { c: Database["public"]["Tables"]["custody_changes"]["Row"] }
        Returns: string
      }
      accept_invite: {
        Args: { display_name: string; token: string }
        Returns: string
      }
      can_write: { Args: { f: string }; Returns: boolean }
      cancel_change: { Args: { change: string }; Returns: undefined }
      claim_notifications: {
        Args: { max: number }
        Returns: {
          attempts: number
          claimed_at: string | null
          created_at: string
          family_id: string
          id: string
          kind: string
          recipient: string
          ref_id: string
          sent_at: string | null
          skipped: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_family: {
        Args: {
          anchor: string
          child_first_name: string
          child_mail_local: string
          cycle: string
          display_name: string
          family_name: string
        }
        Returns: string
      }
      delete_calendar_feed: { Args: never; Returns: undefined }
      invite_preview: {
        Args: { token: string }
        Returns: {
          child: string
          inviter: string
          status: string
        }[]
      }
      is_member: { Args: { f: string }; Returns: boolean }
      new_calendar_feed: { Args: never; Returns: string }
      path_family: { Args: { p: string }; Returns: string }
      propose_cycle: {
        Args: {
          anchor: string
          child: string
          cycle: string
          handover_time: string
          note?: string
        }
        Returns: string
      }
      propose_override: {
        Args: {
          child: string
          end_date: string
          note?: string
          side: string
          start_date: string
        }
        Returns: string
      }
      respond_change: {
        Args: { accept: boolean; change: string }
        Returns: undefined
      }
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

