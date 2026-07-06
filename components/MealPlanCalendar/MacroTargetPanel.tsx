// =============================================================================
// MacroTargetPanel — target input + projected-vs-target readout (#746)
// =============================================================================
// Dark-launched behind the ai_meal_plan feature flag (rendered only by the
// meal-plan screen). Lets the user set a daily calorie + macro target which
// feeds the planner (useMealPlanGeneration.macroTarget), and renders the
// projected-vs-target macros after a plan is generated.
//
// The target persists to MMKV (PREF_MACRO_TARGET_KEY) so it survives reloads.
// Pure presentational + storage glue — no planner logic lives here.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { View, TextInput } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { storage } from "~/data";
import { PREF_MACRO_TARGET_KEY } from "~/constants/storage-keys";
import type { MacroTarget, NutritionSummary } from "~/types/Nutrition";

/** Fields the user can edit, as plain strings for the TextInput controlled state. */
type TargetDraft = {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
};

const EMPTY_DRAFT: TargetDraft = { calories: "", proteinG: "", carbsG: "", fatG: "" };

function targetToDraft(target: MacroTarget | null): TargetDraft {
  if (!target) return { ...EMPTY_DRAFT };
  return {
    calories: target.calories != null ? String(target.calories) : "",
    proteinG: target.proteinG != null ? String(target.proteinG) : "",
    carbsG: target.carbsG != null ? String(target.carbsG) : "",
    fatG: target.fatG != null ? String(target.fatG) : "",
  };
}

function draftToTarget(draft: TargetDraft): MacroTarget {
  const num = (s: string): number | undefined => {
    const trimmed = s.trim();
    if (trimmed === "") return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const target: MacroTarget = {};
  const c = num(draft.calories);
  const p = num(draft.proteinG);
  const cb = num(draft.carbsG);
  const f = num(draft.fatG);
  if (c !== undefined) target.calories = c;
  if (p !== undefined) target.proteinG = p;
  if (cb !== undefined) target.carbsG = cb;
  if (f !== undefined) target.fatG = f;
  return target;
}

function isEmpty(target: MacroTarget): boolean {
  return (
    target.calories === undefined &&
    target.proteinG === undefined &&
    target.carbsG === undefined &&
    target.fatG === undefined
  );
}

interface MacroTargetPanelProps {
  /** Called whenever the user edits a target field, with the parsed target. */
  onTargetChange: (target: MacroTarget) => void;
  /** Days the current plan spans, used to scale the per-day target for the readout. */
  planDays: number;
  /** Projected macros for the whole plan, once generated (optional). */
  projectedMacros?: NutritionSummary | null;
}

/**
 * Numeric input for one macro field. Kept inline so the panel stays a single
 * self-contained file; uses a raw TextInput to avoid coupling to the themed
 * Input's center-aligned layout (we want left-aligned labels + numbers).
 */
function MacroField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View className="flex-1">
      <Small className="text-muted-foreground mb-1">{label}</Small>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType="numeric"
        className="h-10 rounded-lg bg-muted px-3 text-base font-urbanist-semibold text-foreground"
        accessibilityLabel={label}
      />
    </View>
  );
}

/**
 * Render a single projected-vs-target row. Projected is the whole-plan sum;
 * the target is scaled by planDays so the comparison is apples-to-apples.
 */
function ReadoutRow({
  label,
  projected,
  targetTotal,
  unit,
}: {
  label: string;
  projected: number;
  targetTotal: number | undefined;
  unit: string;
}) {
  const projectedRounded = Math.round(projected);
  const targetText =
    targetTotal !== undefined && targetTotal > 0 ? `${Math.round(targetTotal)}${unit}` : "—";
  const delta =
    targetTotal !== undefined && targetTotal > 0
      ? projectedRounded - Math.round(targetTotal)
      : null;
  const deltaText = delta !== null ? (delta >= 0 ? `+${delta}${unit}` : `${delta}${unit}`) : "";
  return (
    <View className="flex-row items-center justify-between py-1">
      <P className="text-muted-foreground text-sm">{label}</P>
      <View className="flex-row items-center gap-2">
        <P className="text-sm font-urbanist-semibold text-foreground">
          {projectedRounded}
          {unit}
        </P>
        <Small className="text-muted-foreground">/ {targetText}</Small>
        {deltaText !== "" && (
          <Small className={delta! >= 0 ? "text-emerald-600" : "text-rose-600"}>{deltaText}</Small>
        )}
      </View>
    </View>
  );
}

export function MacroTargetPanel({
  onTargetChange,
  planDays,
  projectedMacros,
}: MacroTargetPanelProps) {
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_DRAFT);
  const [target, setTarget] = useState<MacroTarget>({});

  // Load the persisted target once on mount.
  useEffect(() => {
    const stored = storage.get<MacroTarget>(PREF_MACRO_TARGET_KEY);
    if (stored && !isEmpty(stored)) {
      setDraft(targetToDraft(stored));
      setTarget(stored);
      onTargetChange(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = useCallback(
    (field: keyof TargetDraft) => (value: string) => {
      // Restrict to digits / decimals so the numeric keyboard stays sane.
      const sanitized = value.replace(/[^0-9.]/g, "");
      setDraft((prev) => {
        const next = { ...prev, [field]: sanitized };
        const parsed = draftToTarget(next);
        setTarget(parsed);
        onTargetChange(parsed);
        // Persist (even when empty, so a cleared field clears storage).
        if (isEmpty(parsed)) {
          storage.set<MacroTarget>(PREF_MACRO_TARGET_KEY, {});
        } else {
          storage.set<MacroTarget>(PREF_MACRO_TARGET_KEY, parsed);
        }
        return next;
      });
    },
    [onTargetChange]
  );

  const scale = Math.max(1, planDays);
  const hasProjection = !!projectedMacros;
  // Only show the readout if there's a projection AND at least one target set
  // (otherwise "projected vs —" is noise).
  const showReadout = hasProjection && !isEmpty(target);

  return (
    <View className="px-4 py-3 border-b border-border/20 gap-3">
      <View>
        <H4 className="font-bowlby-one text-base">Daily macro target</H4>
        <Small className="text-muted-foreground">
          Optional — the planner will bias picks toward your goal.
        </Small>
      </View>
      <View className="flex-row gap-2">
        <MacroField
          label="Calories"
          value={draft.calories}
          onChangeText={updateField("calories")}
          placeholder="kcal"
        />
        <MacroField
          label="Protein"
          value={draft.proteinG}
          onChangeText={updateField("proteinG")}
          placeholder="g"
        />
        <MacroField
          label="Carbs"
          value={draft.carbsG}
          onChangeText={updateField("carbsG")}
          placeholder="g"
        />
        <MacroField
          label="Fat"
          value={draft.fatG}
          onChangeText={updateField("fatG")}
          placeholder="g"
        />
      </View>

      {showReadout && projectedMacros ? (
        <View className="rounded-lg bg-muted/50 px-3 py-2">
          <Small className="text-muted-foreground font-urbanist-semibold uppercase tracking-wide">
            Projected vs target ({planDays}d)
          </Small>
          <ReadoutRow
            label="Calories"
            projected={projectedMacros.calories}
            targetTotal={target.calories !== undefined ? target.calories * scale : undefined}
            unit=""
          />
          <ReadoutRow
            label="Protein"
            projected={projectedMacros.protein}
            targetTotal={target.proteinG !== undefined ? target.proteinG * scale : undefined}
            unit="g"
          />
          <ReadoutRow
            label="Carbs"
            projected={projectedMacros.carbs}
            targetTotal={target.carbsG !== undefined ? target.carbsG * scale : undefined}
            unit="g"
          />
          <ReadoutRow
            label="Fat"
            projected={projectedMacros.fat}
            targetTotal={target.fatG !== undefined ? target.fatG * scale : undefined}
            unit="g"
          />
        </View>
      ) : null}
    </View>
  );
}
