import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync("data/supabase-api/BaseIngredientApi.ts", "utf8");

content = content.replace(
  'function escapeIlike(str: string): string {\n  return str.replace(/[%_\\\\]/g, "\\\\$&");\n}',
  'function escapeIlike(str: string): string {\n  // In PostgREST (Supabase), * is also a wildcard and must be escaped\n  return str.replace(/[%_\\\\*]/g, "\\\\$&");\n}'
);

writeFileSync("data/supabase-api/BaseIngredientApi.ts", content);
