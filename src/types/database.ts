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
      pattern_sizes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          pattern_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          label: string
          pattern_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          pattern_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_sizes_pattern_id_user_id_fkey"
            columns: ["pattern_id", "user_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      pattern_stitch_entries: {
        Row: {
          abbreviation: string
          created_at: string
          definition: string
          id: string
          kind: string
          link: string | null
          name: string
          pattern_id: string
          user_id: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          definition: string
          id?: string
          kind: string
          link?: string | null
          name: string
          pattern_id: string
          user_id?: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          definition?: string
          id?: string
          kind?: string
          link?: string | null
          name?: string
          pattern_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_stitch_entries_pattern_id_user_id_fkey"
            columns: ["pattern_id", "user_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      patterns: {
        Row: {
          created_at: string
          designer: string
          id: string
          is_paid: boolean
          name: string
          slug: string
          source_link: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          designer: string
          id?: string
          is_paid?: boolean
          name: string
          slug: string
          source_link?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          designer?: string
          id?: string
          is_paid?: boolean
          name?: string
          slug?: string
          source_link?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_progress: {
        Row: {
          checkbox_states: Json
          current_step_id: string | null
          id: string
          project_id: string
          repeat_pass_counts: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          checkbox_states?: Json
          current_step_id?: string | null
          id?: string
          project_id: string
          repeat_pass_counts?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          checkbox_states?: Json
          current_step_id?: string | null
          id?: string
          project_id?: string
          repeat_pass_counts?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_current_step_id_user_id_fkey"
            columns: ["current_step_id", "user_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "project_progress_project_id_user_id_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          pattern_id: string
          size_label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pattern_id: string
          size_label: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          pattern_id?: string
          size_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_pattern_id_user_id_fkey"
            columns: ["pattern_id", "user_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      repeat_groups: {
        Row: {
          created_at: string
          id: string
          last_repeat_note: string | null
          pattern_id: string
          repeat_condition: string | null
          repeat_count: Json | null
          size_params: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_repeat_note?: string | null
          pattern_id: string
          repeat_condition?: string | null
          repeat_count?: Json | null
          size_params?: Json | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_repeat_note?: string | null
          pattern_id?: string
          repeat_condition?: string | null
          repeat_count?: Json | null
          size_params?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repeat_groups_pattern_id_user_id_fkey"
            columns: ["pattern_id", "user_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      steps: {
        Row: {
          applies_to_sizes: string[] | null
          branch_options: Json | null
          created_at: string
          errata_note: string | null
          id: string
          instructions_after: string | null
          instructions_before: string | null
          link: string | null
          pattern_id: string
          repeat_group_id: string | null
          repeat_step_number: number | null
          row_or_round: string | null
          section: string
          side: string | null
          size_params: Json | null
          step_order: number
          step_type: string
          stitch_count: Json | null
          stitch_instructions: string | null
          subsection: string | null
          user_id: string
        }
        Insert: {
          applies_to_sizes?: string[] | null
          branch_options?: Json | null
          created_at?: string
          errata_note?: string | null
          id?: string
          instructions_after?: string | null
          instructions_before?: string | null
          link?: string | null
          pattern_id: string
          repeat_group_id?: string | null
          repeat_step_number?: number | null
          row_or_round?: string | null
          section: string
          side?: string | null
          size_params?: Json | null
          step_order: number
          step_type: string
          stitch_count?: Json | null
          stitch_instructions?: string | null
          subsection?: string | null
          user_id?: string
        }
        Update: {
          applies_to_sizes?: string[] | null
          branch_options?: Json | null
          created_at?: string
          errata_note?: string | null
          id?: string
          instructions_after?: string | null
          instructions_before?: string | null
          link?: string | null
          pattern_id?: string
          repeat_group_id?: string | null
          repeat_step_number?: number | null
          row_or_round?: string | null
          section?: string
          side?: string | null
          size_params?: Json | null
          step_order?: number
          step_type?: string
          stitch_count?: Json | null
          stitch_instructions?: string | null
          subsection?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_pattern_id_user_id_fkey"
            columns: ["pattern_id", "user_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "steps_repeat_group_id_user_id_fkey"
            columns: ["repeat_group_id", "user_id"]
            isOneToOne: false
            referencedRelation: "repeat_groups"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      stitch_dictionary: {
        Row: {
          abbreviation: string
          created_at: string
          definition: string
          id: string
          kind: string
          link: string | null
          name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          definition: string
          id?: string
          kind: string
          link?: string | null
          name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          definition?: string
          id?: string
          kind?: string
          link?: string | null
          name?: string
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
