import { supabase } from "~/lib/supabase/supabase-client";

export const baseIngredientApi = {
  getAllBaseIngredients: async () => {
    const { data, error } = await supabase.from("base_ingredient").select("*");
    if (error) throw error;
    return data;
  },
};
