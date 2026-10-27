import { normalizeIngredientIdentity } from "~/utils/ingredient-identity";

export interface CatalogIdentity {
  id: string;
  name: string;
  aliases: string[];
}

function isExplicitVariant(key: string, canonical: string): boolean {
  return key !== canonical && ` ${key} `.includes(` ${canonical} `);
}

/** Catalog aliases can share a coarse ID without describing interchangeable forms. */
export function catalogIdentityForName(
  canonical: { id: string; name: string },
  aliases: readonly string[],
  query: string
): CatalogIdentity | null {
  const key = normalizeIngredientIdentity(query);
  const canonicalKey = normalizeIngredientIdentity(canonical.name);
  if (
    !key ||
    ![canonical.name, ...aliases].some((name) => normalizeIngredientIdentity(name) === key)
  )
    return null;
  const knownKeys = [canonicalKey, ...aliases.map(normalizeIngredientIdentity)];
  const isVariant = (candidate: string) =>
    knownKeys.some((base) => isExplicitVariant(candidate, base));
  const variant = isVariant(key);
  return {
    id: canonical.id,
    name: variant ? query.trim() : canonical.name,
    aliases: aliases.filter((alias) => {
      const aliasKey = normalizeIngredientIdentity(alias);
      return variant ? aliasKey === key : !isVariant(aliasKey);
    }),
  };
}
