/**
 * First-session "aha" surface — "You can cook N recipes tonight from what you
 * have" (issue #720).
 *
 * Dark-launched behind the `onboarding_aha` feature flag (see
 * `hooks/useFirstRunAha.ts`). It is ADDITIVE: the existing onboarding tutorial
 * stays the default, and this surface only renders when (a) the flag is on,
 * (b) the user has not seen it yet, and (c) the pantry yields >=1 cook-tonight
 * recipe. It is intentionally a focused single surface (not a full home
 * render) to keep cold-start cost low per the issue's cold-start risk.
 *
 * Funnel events (via #718): aha_shown on render, aha_recipe_opened on card
 * tap, first_cook_started on entering the cooking screen — so the Day-0 lift
 * is measurable per [F7].
 *
 * Reuses: useRecipeRecommendations (existing hook), selectCookTonightRecipes
 * (pure selector over the existing AvailabilityFilter + ReadinessStrategy),
 * RecipeItemCard (home-screen card primitive), and the existing
 * /recipes/[recipeId]/steps deep-link that already passes the FIRST cook
 * through without a paywall.
 */

import React, { useEffect, useMemo } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import useColors from "~/hooks/useColor";
import RecipeItemCard from "~/components/Pantry/RecipeItemCard";
import { useRecipeRecommendations } from "~/hooks/queries/useRecipeQueries";
import {
  selectCookTonightRecipes,
  type CookTonightRecipe,
} from "~/hooks/recommendation/selectCookTonightRecipes";
import {
  emitAhaShown,
  emitAhaRecipeOpened,
  emitFirstCookStarted,
} from "~/lib/analytics/funnel-events";
import { useFirstRunAha } from "~/hooks/useFirstRunAha";

export default function AhaScreen() {
  const colors = useColors();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { markSeen } = useFirstRunAha();

  // Reuse the existing recommendations hook (cached availability + history),
  // then re-select the cook-tonight subset through the pure selector so the
  // selection logic is unit-tested in isolation.
  const { recipes, isLoading } = useRecipeRecommendations();

  const cookTonight: CookTonightRecipe[] = useMemo(() => {
    const completionPercentages = new Map<string, number>();
    for (const r of recipes) {
      completionPercentages.set(r.recipe.id, r.completionPercentage);
    }
    return selectCookTonightRecipes(
      recipes.map((r) => r.recipe),
      { completionPercentages, maxResults: 6 }
    );
  }, [recipes]);

  const topRecipe = cookTonight[0]?.recipe;

  // aha_shown — fire once when the surface actually has something to show.
  // Guarded against empty + loading so the funnel doesn't record an empty
  // climax impression.
  useEffect(() => {
    if (cookTonight.length > 0) {
      emitAhaShown(cookTonight.length);
      markSeen();
    }
  }, [cookTonight.length, markSeen]);

  const startCook = (recipeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    emitFirstCookStarted(recipeId);
    // Same deep-link BottomActionBar uses for the first cook — passes through
    // without a paywall (paywall gates the SECOND cook for cooked users).
    router.push({
      pathname: "/recipes/[recipeId]/steps",
      params: { recipeId },
    });
  };

  const skip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markSeen();
    router.replace("/");
  };

  return (
    <View className="relative flex-1">
      <LinearGradient colors={[colors.border, colors.muted]} style={[StyleSheet.absoluteFill]} />

      <View className="flex flex-1" style={{ paddingTop: top, paddingBottom: bottom }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.foreground} />
          </View>
        ) : cookTonight.length === 0 ? (
          // Graceful fallback: nothing cookable tonight. Still mark seen so we
          // don't re-impress; land on the pantry home where ranked recipes are
          // already visible (matches the issue's "never on a blank pantry" AC).
          <View className="flex-1 items-center justify-center px-8">
            <H1 className="text-center font-urbanist-medium">Add a few more ingredients</H1>
            <P className="mt-4 text-center text-foreground/80">
              We'll show you recipes you can cook tonight once your pantry has a couple more
              staples.
            </P>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-6"
            showsVerticalScrollIndicator={false}
          >
            <View className="mt-6">
              <H1 className="font-urbanist-medium">You can cook tonight</H1>
              <P className="mt-3 text-foreground/80 font-urbanist-medium">
                {cookTonight.length} {cookTonight.length === 1 ? "recipe" : "recipes"} from what you
                already have. No shopping needed.
              </P>
            </View>

            <View className="mt-6 flex-row flex-wrap">
              {cookTonight.map((item) => (
                <View key={item.recipe.id} className="w-1/2">
                  <RecipeItemCard
                    recipe={item.recipe}
                    completionPercentage={item.completionPercentage}
                    matchCategory={item.matchCategory}
                    onEngage={(id) => emitAhaRecipeOpened(id)}
                  />
                </View>
              ))}
            </View>

            {topRecipe && (
              <Button
                size="lg"
                variant="default"
                onPress={() => startCook(topRecipe.id)}
                className="mt-8 rounded-2xl bg-foreground"
                accessibilityLabel={`Start cooking ${topRecipe.title}`}
                accessibilityHint="Opens the guided cooking screen for this recipe"
              >
                <H4 className="text-background font-urbanist-bold">Cook {topRecipe.title} now</H4>
              </Button>
            )}
          </ScrollView>
        )}

        <View className="px-6" style={{ paddingBottom: bottom + 8 }}>
          <Button size="lg" variant="secondary" onPress={skip} className="rounded-2xl">
            <H4 className="text-foreground font-urbanist-bold">Skip for now</H4>
          </Button>
        </View>
      </View>
    </View>
  );
}
