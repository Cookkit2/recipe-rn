/** Compare extracted instructions with source evidence, ignoring punctuation and whitespace. */
function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const COOKING_ACTION =
  /\b(?:add|bake|beat|blend|boil|brown|chill|chop|combine|cook|cover|crack|cut|drain|drizzle|filter|flip|fold|freeze|fry|garnish|grill|heat|knead|marinate|melt|mix|peel|place|pour|preheat|press|reduce|remove|rest|rinse|roast|roll|saute|sauté|scramble|season|serve|simmer|slice|soak|spread|sprinkle|steam|stir|strain|toast|toss|transfer|wash|whisk|masak|masukkan|tumis(?:kan)?|kukus|campur|kacau(?:kan)?|goreng|rebus|panaskan|tambahkan|tapiskan|aduk|potong)\b|加入|搅拌|攪拌|切成|倒入|放入|煮|蒸|炒|烤|煎|வதக்க|சேர்க்க|கலக்க|வேக|பொரி/;
const LEADING_COOKING_ACTION = new RegExp("^(?:" + COOKING_ACTION.source + ")");

export function hasInstructionEvidence(description: string, source: string): boolean {
  const instruction = normalize(description);
  if (
    instruction.length < (/\p{Script=Han}/u.test(instruction) ? 4 : 8) ||
    !normalize(source).includes(instruction)
  )
    return false;
  // A dish title or an ingredient name is insufficient evidence of a cooking action.
  return COOKING_ACTION.test(instruction);
}

/** Subtitle introductions and ingredient fragments are not cooking instructions. */
export function hasLeadingCookingAction(description: string): boolean {
  return LEADING_COOKING_ACTION.test(
    normalize(description).replace(/^(?:then|next|now|and)\s+/, "")
  );
}

/** Select only action-bearing published subtitle lines, keeping the schema bounded. */
export function getPublishedSubtitleInstructions(source: string): string[] {
  for (const track of source.split("PUBLISHED VIDEO SUBTITLES").slice(1)) {
    const instructions: string[] = [];
    let characters = 0;
    for (const line of track.split("\n").slice(1)) {
      const instruction = line.trim();
      if (
        instruction.length > 800 ||
        !hasLeadingCookingAction(instruction) ||
        !hasInstructionEvidence(instruction, instruction) ||
        instructions.includes(instruction)
      )
        continue;
      if (characters + instruction.length > 6000 || instructions.length >= 24) break;
      characters += instruction.length;
      instructions.push(instruction);
    }
    if (instructions.length) return instructions;
  }
  return [];
}

/** Keep explicit caption actions available to the translation schema as well. */
export function getCaptionInstructions(source: string): string[] {
  const instructions: string[] = [];
  let characters = 0;
  for (const sentence of source.split(/(?<=[.!?。！？])\s+|\n+/u)) {
    const instruction = sentence.trim();
    if (
      instruction.length > 800 ||
      !hasLeadingCookingAction(instruction) ||
      !hasInstructionEvidence(instruction, instruction) ||
      instructions.includes(instruction)
    )
      continue;
    if (characters + instruction.length > 6000 || instructions.length >= 24) break;
    characters += instruction.length;
    instructions.push(instruction);
  }
  return instructions;
}
