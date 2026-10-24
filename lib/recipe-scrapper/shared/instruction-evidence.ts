/** Compare extracted instructions with source evidence, ignoring punctuation and whitespace. */
function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function hasInstructionEvidence(description: string, source: string): boolean {
  const instruction = normalize(description);
  if (
    instruction.length < (/\p{Script=Han}/u.test(instruction) ? 4 : 8) ||
    !normalize(source).includes(instruction)
  )
    return false;
  // A dish title or an ingredient name is insufficient evidence of a cooking action.
  return /\b(?:add|bake|beat|blend|boil|brown|chill|chop|combine|cook|cover|crack|cut|drain|drizzle|flip|fold|freeze|fry|garnish|grill|heat|knead|marinate|melt|mix|peel|place|pour|preheat|press|reduce|remove|rest|rinse|roast|roll|saute|sauté|scramble|season|serve|simmer|slice|soak|spread|sprinkle|steam|stir|strain|toast|toss|transfer|wash|whisk|masak|tumis|kukus|campur|kacau|goreng|rebus|panaskan|tambahkan|aduk|potong)\b|加入|搅拌|攪拌|切成|倒入|放入|煮|蒸|炒|烤|煎|வதக்க|சேர்க்க|கலக்க|வேக|பொரி/.test(
    instruction
  );
}
