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
      body_measurements: {
        Row: {
          arms: number | null
          avambraccio_cm: number | null
          body_fat: number | null
          braccio_front_cm: number | null
          collo_cm: number | null
          coscia_cm: number | null
          created_at: string
          fianchi_cm: number | null
          glutei_circonferenza_cm: number | null
          height_cm: number | null
          id: string
          legs: number | null
          measured_at: string
          notes: string | null
          petto_torace_cm: number | null
          polpaccio_cm: number | null
          schiena_altezza_dorsali_cm: number | null
          spalle_ampiezza_cm: number | null
          user_id: string | null
          vita_cm: number | null
          waist: number | null
          weight: number | null
        }
        Insert: {
          arms?: number | null
          avambraccio_cm?: number | null
          body_fat?: number | null
          braccio_front_cm?: number | null
          collo_cm?: number | null
          coscia_cm?: number | null
          created_at?: string
          fianchi_cm?: number | null
          glutei_circonferenza_cm?: number | null
          height_cm?: number | null
          id?: string
          legs?: number | null
          measured_at?: string
          notes?: string | null
          petto_torace_cm?: number | null
          polpaccio_cm?: number | null
          schiena_altezza_dorsali_cm?: number | null
          spalle_ampiezza_cm?: number | null
          user_id?: string | null
          vita_cm?: number | null
          waist?: number | null
          weight?: number | null
        }
        Update: {
          arms?: number | null
          avambraccio_cm?: number | null
          body_fat?: number | null
          braccio_front_cm?: number | null
          collo_cm?: number | null
          coscia_cm?: number | null
          created_at?: string
          fianchi_cm?: number | null
          glutei_circonferenza_cm?: number | null
          height_cm?: number | null
          id?: string
          legs?: number | null
          measured_at?: string
          notes?: string | null
          petto_torace_cm?: number | null
          polpaccio_cm?: number | null
          schiena_altezza_dorsali_cm?: number | null
          spalle_ampiezza_cm?: number | null
          user_id?: string | null
          vita_cm?: number | null
          waist?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      body_parts: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      diet_meal_foods: {
        Row: {
          created_at: string | null
          food_id: string
          id: string
          meal_id: string
          order_index: number | null
          portion_size_g: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          food_id: string
          id?: string
          meal_id: string
          order_index?: number | null
          portion_size_g: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          food_id?: string
          id?: string
          meal_id?: string
          order_index?: number | null
          portion_size_g?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_meal_foods_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_meal_foods_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "diet_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_meals: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          meal_type: string
          updated_at: string | null
          weekly_plan_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          meal_type: string
          updated_at?: string | null
          weekly_plan_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          meal_type?: string
          updated_at?: string | null
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_meals_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_weekly_plans: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercise_ai_info: {
        Row: {
          bodyweight_percentage: number | null
          exercise_name: string
          generated_at: string | null
          id: string
          is_bodyweight: boolean | null
          model_used: string | null
          normalized_name: string
          primary_muscles: string[] | null
          secondary_muscles: string[] | null
          technique: string | null
          tips: string[] | null
          variations: string[] | null
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          bodyweight_percentage?: number | null
          exercise_name: string
          generated_at?: string | null
          id?: string
          is_bodyweight?: boolean | null
          model_used?: string | null
          normalized_name: string
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          technique?: string | null
          tips?: string[] | null
          variations?: string[] | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          bodyweight_percentage?: number | null
          exercise_name?: string
          generated_at?: string | null
          id?: string
          is_bodyweight?: boolean | null
          model_used?: string | null
          normalized_name?: string
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          technique?: string | null
          tips?: string[] | null
          variations?: string[] | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      food_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      food_equivalences: {
        Row: {
          base_quantity_g: number
          created_at: string | null
          food_id: string
          group_id: string
          id: string
        }
        Insert: {
          base_quantity_g: number
          created_at?: string | null
          food_id: string
          group_id: string
          id?: string
        }
        Update: {
          base_quantity_g?: number
          created_at?: string | null
          food_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_equivalences_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_equivalences_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "substitution_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          calories_approx: number | null
          category_id: string
          created_at: string | null
          id: string
          name: string
          standard_portion_g: number
        }
        Insert: {
          calories_approx?: number | null
          category_id: string
          created_at?: string | null
          id?: string
          name: string
          standard_portion_g: number
        }
        Update: {
          calories_approx?: number | null
          category_id?: string
          created_at?: string | null
          id?: string
          name?: string
          standard_portion_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "foods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          created_at: string
          exercise_name: string
          hold_seconds: number | null
          id: string
          reps: number | null
          set_number: number
          skill_slug: string | null
          skill_step_order: number | null
          user_id: string | null
          weight: number | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          hold_seconds?: number | null
          id?: string
          reps?: number | null
          set_number: number
          skill_slug?: string | null
          skill_step_order?: number | null
          user_id?: string | null
          weight?: number | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          hold_seconds?: number | null
          id?: string
          reps?: number | null
          set_number?: number
          skill_slug?: string | null
          skill_step_order?: number | null
          user_id?: string | null
          weight?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_relations: {
        Row: {
          id: string
          note: string | null
          related_skill_slug: string
          relation_type: string
          skill_slug: string
        }
        Insert: {
          id?: string
          note?: string | null
          related_skill_slug: string
          relation_type: string
          skill_slug: string
        }
        Update: {
          id?: string
          note?: string | null
          related_skill_slug?: string
          relation_type?: string
          skill_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_relations_related_skill_slug_fkey"
            columns: ["related_skill_slug"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "skill_relations_skill_slug_fkey"
            columns: ["skill_slug"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["slug"]
          },
        ]
      }
      skill_steps: {
        Row: {
          criteria_sessions: number
          id: string
          name: string
          next_step_id: string | null
          notes: string | null
          skill_slug: string
          step_order: number
          target_max: number | null
          target_min: number
          target_type: string
        }
        Insert: {
          criteria_sessions: number
          id?: string
          name: string
          next_step_id?: string | null
          notes?: string | null
          skill_slug: string
          step_order: number
          target_max?: number | null
          target_min: number
          target_type: string
        }
        Update: {
          criteria_sessions?: number
          id?: string
          name?: string
          next_step_id?: string | null
          notes?: string | null
          skill_slug?: string
          step_order?: number
          target_max?: number | null
          target_min?: number
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_steps_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "skill_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_steps_skill_slug_fkey"
            columns: ["skill_slug"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["slug"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          difficulty_rank: number | null
          is_priority: boolean
          name: string
          prerequisite: string | null
          recommended_rest_seconds: number
          recommended_sets: number
          slug: string
          type: string
          warning: string | null
        }
        Insert: {
          category: string
          created_at?: string
          difficulty_rank?: number | null
          is_priority?: boolean
          name: string
          prerequisite?: string | null
          recommended_rest_seconds: number
          recommended_sets: number
          slug: string
          type: string
          warning?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          difficulty_rank?: number | null
          is_priority?: boolean
          name?: string
          prerequisite?: string | null
          recommended_rest_seconds?: number
          recommended_sets?: number
          slug?: string
          type?: string
          warning?: string | null
        }
        Relationships: []
      }
      substitution_groups: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_skill_progress: {
        Row: {
          consecutive_clean_sessions: number
          created_at: string
          current_step_order: number
          id: string
          last_trained_at: string | null
          skill_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_clean_sessions?: number
          created_at?: string
          current_step_order?: number
          id?: string
          last_trained_at?: string | null
          skill_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_clean_sessions?: number
          created_at?: string
          current_step_order?: number
          id?: string
          last_trained_at?: string | null
          skill_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          started_at: string
          updated_at: string
          user_id: string | null
          workout_day: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          updated_at?: string
          user_id?: string | null
          workout_day: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          updated_at?: string
          user_id?: string | null
          workout_day?: string
        }
        Relationships: []
      }
      workout_plan_days: {
        Row: {
          created_at: string
          day_name: string
          day_number: number
          id: string
          workout_plan_id: string
        }
        Insert: {
          created_at?: string
          day_name: string
          day_number: number
          id?: string
          workout_plan_id: string
        }
        Update: {
          created_at?: string
          day_name?: string
          day_number?: number
          id?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          order_number: number
          primary_body_part_id: string | null
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number
          skill_slug: string | null
          tracking_unit: string
          weight: number | null
          workout_plan_day_id: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          order_number: number
          primary_body_part_id?: string | null
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          skill_slug?: string | null
          tracking_unit?: string
          weight?: number | null
          workout_plan_day_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          order_number?: number
          primary_body_part_id?: string | null
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          skill_slug?: string | null
          tracking_unit?: string
          weight?: number | null
          workout_plan_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_primary_body_part_id_fkey"
            columns: ["primary_body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_day_id_fkey"
            columns: ["workout_plan_day_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_weeks: number | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
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
