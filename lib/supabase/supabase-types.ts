// Auto-generated types from Supabase
// Generated using MCP Supabase server

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      base_ingredient: {
        Row: {
          days_to_expire: number;
          id: string;
          name: string;
          steps_to_store_id: string | null;
          storage_type: string;
        };
        Insert: {
          days_to_expire: number;
          id?: string;
          name: string;
          steps_to_store_id?: string | null;
          storage_type: string;
        };
        Update: {
          days_to_expire?: number;
          id?: string;
          name?: string;
          steps_to_store_id?: string | null;
          storage_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_base_ingredient_steps_to_store";
            columns: ["steps_to_store_id"];
            isOneToOne: false;
            referencedRelation: "steps_to_store";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredient_category: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      ingredient_synonym: {
        Row: {
          base_ingredient_id: string | null;
          created_at: string | null;
          id: string;
          synonym: string;
        };
        Insert: {
          base_ingredient_id?: string | null;
          created_at?: string | null;
          id?: string;
          synonym: string;
        };
        Update: {
          base_ingredient_id?: string | null;
          created_at?: string | null;
          id?: string;
          synonym?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingredient_synonym_base_ingredient_id_fkey";
            columns: ["base_ingredient_id"];
            isOneToOne: false;
            referencedRelation: "base_ingredient";
            referencedColumns: ["id"];
          },
        ];
      };
      pivot_ingredient_category: {
        Row: {
          category_id: string;
          id: string;
          ingredient_id: string;
        };
        Insert: {
          category_id: string;
          id?: string;
          ingredient_id: string;
        };
        Update: {
          category_id?: string;
          id?: string;
          ingredient_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pivot_ingredient_category_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "ingredient_category";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pivot_ingredient_category_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "base_ingredient";
            referencedColumns: ["id"];
          },
        ];
      };
      pivot_recipe_ingredient: {
        Row: {
          base_ingredient_id: string;
          id: string;
          name: string | null;
          notes: string | null;
          quantity: number | null;
          unit: string | null;
          recipe_id: string;
        };
        Insert: {
          base_ingredient_id: string;
          id?: string;
          name?: string | null;
          notes?: string | null;
          quantity?: number | null;
          unit?: string | null;
          recipe_id: string;
        };
        Update: {
          base_ingredient_id?: string;
          id?: string;
          name?: string | null;
          notes?: string | null;
          quantity?: number | null;
          unit?: string | null;
          recipe_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pivot_recipe_ingredient_base_ingredient_id_fkey";
            columns: ["base_ingredient_id"];
            isOneToOne: false;
            referencedRelation: "base_ingredient";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pivot_recipe_ingredient_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipe";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe: {
        Row: {
          calories: number | null;
          cook_minutes: number | null;
          description: string | null;
          difficulty_stars: number | null;
          id: string;
          image_url: string | null;
          prep_minutes: number | null;
          servings: number | null;
          source_url: string | null;
          tags: string[] | null;
          title: string;
        };
        Insert: {
          calories?: number | null;
          cook_minutes?: number | null;
          description?: string | null;
          difficulty_stars?: number | null;
          id?: string;
          image_url?: string | null;
          prep_minutes?: number | null;
          servings?: number | null;
          source_url?: string | null;
          tags?: string[] | null;
          title: string;
        };
        Update: {
          calories?: number | null;
          cook_minutes?: number | null;
          description?: string | null;
          difficulty_stars?: number | null;
          id?: string;
          image_url?: string | null;
          prep_minutes?: number | null;
          servings?: number | null;
          source_url?: string | null;
          tags?: string[] | null;
          title?: string;
        };
        Relationships: [];
      };
      recipe_step: {
        Row: {
          description: string | null;
          id: string;
          recipe_id: string;
          step: number;
          title: string | null;
        };
        Insert: {
          description?: string | null;
          id?: string;
          recipe_id: string;
          step: number;
          title?: string | null;
        };
        Update: {
          description?: string | null;
          id?: string;
          recipe_id?: string;
          step?: number;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_step_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipe";
            referencedColumns: ["id"];
          },
        ];
      };
      steps_to_store: {
        Row: {
          description: string | null;
          id: string;
          ingredient_id: string | null;
          sequence: number | null;
          title: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          ingredient_id?: string | null;
          sequence?: number | null;
          title: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          ingredient_id?: string | null;
          sequence?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "steps_to_store_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "base_ingredient";
            referencedColumns: ["id"];
          },
        ];
      };
      stock: {
        Row: {
          base_ingredient_id: string | null;
          category: string | null;
          created_at: string | null;
          expiry_date: string | null;
          id: string;
          image_url: string | null;
          name: string;
          quantity: number | null;
          scale: number | null;
          unit: string | null;
          updated_at: string | null;
          x: number | null;
          y: number | null;
        };
        Insert: {
          base_ingredient_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          expiry_date?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          quantity?: number | null;
          scale?: number | null;
          unit?: string | null;
          updated_at?: string | null;
          x?: number | null;
          y?: number | null;
        };
        Update: {
          base_ingredient_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          expiry_date?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          quantity?: number | null;
          scale?: number | null;
          unit?: string | null;
          updated_at?: string | null;
          x?: number | null;
          y?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pantry_item_base_ingredient_id_fkey";
            columns: ["base_ingredient_id"];
            isOneToOne: false;
            referencedRelation: "base_ingredient";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          id: string;
          preferences: Json | null;
          username: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          preferences?: Json | null;
          username?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          preferences?: Json | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
