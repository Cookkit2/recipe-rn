# Assistant pantry identity

Pantry changes from Assistant use `pantryApi.manageAssistantPantry`, backed by a
WatermelonDB writer. Ordinary manual-entry APIs retain their existing behavior.

## Names and matching

- Ask for a specific ingredient when a known category is supplied, including
  singular/plural forms and common wrappers such as “fresh vegetables”. Named
  mixtures such as “frozen mixed vegetables” remain valid.
- Keep specific custom foods usable without requiring catalog membership.
- Normalize English food nouns, spacing, case, and explicit regional aliases.
  Preserve meaningful words such as coconut, cherry, canned, dried, and raw.
- Use catalog canonical names and complete approved aliases when available.
  Save resolved aliases locally on creates and quantity updates for offline use.
  Native stock has no persisted catalog-ID field; this change does not add one.
- Recipe matching ignores cutting instructions and surrounding annotation
  punctuation. It compares complete names or explicit synonyms. Categories,
  substring overlap and shared keywords never imply compatibility.
- Dietary phrase containment and voice question grammar have separate policies.

The category vocabulary is intentionally finite, and English inflection is not a
multilingual food ontology. The Assistant also asks about ambiguous phrases not
covered by local vocabulary. Unknown specific custom names are accepted.

## Stock changes

- `add` increases one matching stock row. Equivalent unit spellings are accepted;
  no mass/count or container-volume conversion is guessed. Explicit different
  units can create a separate batch. Missing units for existing non-count stock
  require clarification.
- Multiple matching rows require a user choice. Name-based removals also require
  a choice when several rows match; `stockId` selects exactly one row.
- Existing vague rows are not silently counted as specific foods via synonyms.
  The user must identify their contents before `rename` or a correcting `merge`.
- `rename` preserves quantity and presentation metadata, replaces obsolete name
  aliases, and asks before creating another batch of an existing ingredient.
  `keepSeparate` applies only after the user explicitly chooses separate batches.
- `merge` requires two explicit row IDs and user instruction. Ingredient identity,
  units, storage, expiry and presentation/ownership details must be compatible.
  Related records move to the destination. Ordinary merges preserve source names
  as aliases; correcting a vague source discards its obsolete aliases.

All stock selection and mutations occur inside the same writer. Catalog network
lookups happen before entering it. This prevents concurrent additions from
creating grammatical duplicates or losing quantity increments.

## Conversation behavior

A blocked mutation returns `needs_clarification`, a question, and any candidate
rows. The chat displays useful row details and retains the IDs in conversation
context. It does not show an update activity or a technical error for clarification.
Once a pantry tool needs clarification, later mutation calls in that model turn
return the same clarification, including parallel calls. A new user turn can
supply the missing information. No existing pantry data is migrated automatically.

## Verification

Pure policy tests cover categories, mixtures, noun exceptions, aliases, compound
names and false matches. In-memory WatermelonDB tests cover atomic concurrent
updates, unit and metadata preservation, offline aliases and explicit legacy
correction. Shopping-list integration checks the same matching policy as recipe
availability; hook and tool tests cover clarification and model retry behavior.
