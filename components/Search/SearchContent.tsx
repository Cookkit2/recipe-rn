import React, { useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { View, Keyboard, TouchableOpacity, StyleSheet, BackHandler, Platform } from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  type BottomSheetMethods,
} from "@expo/ui/community/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { cn } from "~/lib/utils";
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native";
import { useRecipes, type RecipeFilters } from "~/hooks/queries/useRecipeQueries";
import { usePantryItems } from "~/hooks/queries/usePantryQueries";
import { filterPantryItemsByName } from "~/utils/filterPantryItemsByName";
import { filterRecipesForSearch } from "~/utils/filterRecipesForSearch";
import { useQueryClient } from "@tanstack/react-query";
import { pantryQueryKeys } from "~/hooks/queries/pantryQueryKeys";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";
import type { PantryAdditionReceipt } from "~/lib/agent/pantry-action";
import { TEST_IDS } from "~/constants/test-ids";
import { useSearchAssistant } from "~/hooks/useSearchAssistant";
import { AssistantMessages } from "~/components/Assistant/AssistantMessages";
import { SearchAssistantHeader } from "~/components/Search/SearchAssistantHeader";
import { SearchAssistantPresets } from "~/components/Search/SearchAssistantPresets";
import { SearchResultsList } from "~/components/Search/SearchResultsList";
import { SearchPreview } from "~/components/Search/SearchPreview";
import { SearchKeyboardViewport } from "~/components/Search/SearchKeyboardViewport";
import useColors from "~/hooks/useColor";
import * as Haptics from "expo-haptics";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import { useSearchBarFocus } from "~/hooks/useSearchBarFocus";
import { SearchInputBar } from "~/components/Search/SearchInputBar";
import { useWebRecipeSearch } from "~/hooks/queries/useWebRecipeSearch";
import { normalizeWebRecipeQuery } from "~/utils/web-recipe-search";
import type { WebRecipeSearchResult } from "~/types/WebRecipeSearch";

const TIME_OPTIONS = [
  { label: "15m", maxTotalTime: 15 },
  { label: "30m", maxTotalTime: 30 },
  { label: "60m", maxTotalTime: 60 },
  { label: "60m+", minTotalTime: 60 },
];

const DIFFICULTY_OPTIONS = [
  { label: "Easy", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Hard", value: 3 },
];

const DIETARY_TAGS = ["Vegetarian", "Vegan", "Gluten-Free"];

export function SearchContent({
  onDismiss,
  focusEnabled = true,
  transparent = false,
  initialConversation = false,
}: {
  onDismiss: () => void;
  focusEnabled?: boolean;
  transparent?: boolean;
  initialConversation?: boolean;
}) {
  const { top, bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // Keep the inline Pantry surface anchored while the keyboard opens.
  const contentTop =
    transparent && Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26
      ? top
      : Math.max(top, headerHeight);
  const [input, setInput] = useState("");
  const [webQuery, setWebQuery] = useState("");
  const [showConversation, setConversation] = useState(initialConversation);
  const conversationRef = useRef(initialConversation);
  const setShowConversation = useCallback((visible: boolean) => {
    conversationRef.current = visible;
    setConversation(visible);
  }, []);
  const [sessionStarted, setSessionStarted] = useState(initialConversation);
  const submitAI = useRef<((text: string) => void) | null>(null);
  const { searchBarRef, onFocus, onBlur } = useSearchBarFocus(focusEnabled);
  const switchMode = useCallback(() => {
    setSessionStarted(true);
    setShowConversation(!conversationRef.current);
  }, [setShowConversation]);
  const placeholder = showConversation ? "Ask Cookkit…" : "Search ingredients and recipes…";

  const handleChangeText = useCallback((value: string) => {
    setInput(value);
    setWebQuery("");
    if (value.trim()) {
      setSessionStarted(true);
    }
  }, []);
  const handleSearch = useCallback(() => {
    if (conversationRef.current) {
      submitAI.current?.(input);
      return;
    }
    Keyboard.dismiss();
    setWebQuery(input.trim());
  }, [input]);
  const clearInput = useCallback(() => {
    setInput("");
    setWebQuery("");
    searchBarRef.current?.clearText();
  }, [searchBarRef]);
  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  useFocusEffect(
    useCallback(() => {
      if (!focusEnabled) return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (showConversation) setShowConversation(false);
        else handleDismiss();
        return true;
      });
      return () => subscription.remove();
    }, [focusEnabled, handleDismiss, showConversation])
  );

  return (
    <View
      testID={TEST_IDS.search.screen}
      className={transparent ? "flex-1" : "flex-1 bg-background"}
    >
      {sessionStarted ? (
        <SearchSession
          input={input}
          submitAI={submitAI}
          clearInput={clearInput}
          showConversation={showConversation}
          focusEnabled={focusEnabled}
          contentTop={contentTop}
          safeTop={top}
          bottom={bottom}
          transparent={transparent}
          webQuery={webQuery}
          onWebSearch={handleSearch}
        />
      ) : (
        <SearchPreview top={contentTop} />
      )}
      {focusEnabled && (
        <SearchInputBar
          ref={searchBarRef}
          value={input}
          conversation={showConversation}
          placeholder={placeholder}
          bottom={bottom}
          onChangeText={handleChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmit={handleSearch}
          onSwitchMode={switchMode}
          onDismiss={handleDismiss}
        />
      )}
    </View>
  );
}

/** Start catalog queries, assistant state and filter views only when someone types. */
function SearchSession({
  input,
  submitAI,
  clearInput,
  showConversation,
  focusEnabled,
  contentTop,
  safeTop,
  bottom,
  transparent,
  webQuery,
  onWebSearch,
}: {
  input: string;
  submitAI: React.RefObject<((text: string) => void) | null>;
  clearInput: () => void;
  showConversation: boolean;
  focusEnabled: boolean;
  contentTop: number;
  safeTop: number;
  bottom: number;
  transparent: boolean;
  webQuery: string;
  onWebSearch: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const router = useRouter();
  const openingWebRecipe = useRef(false);
  useFocusEffect(
    useCallback(() => {
      openingWebRecipe.current = false;
    }, [])
  );
  const webSearch = useWebRecipeSearch(webQuery, focusEnabled && !showConversation);
  const openWebRecipe = useCallback(
    (result: WebRecipeSearchResult) => {
      if (openingWebRecipe.current) return;
      openingWebRecipe.current = true;
      Keyboard.dismiss();
      router.push({ pathname: "/recipes/web-import", params: { url: result.url } });
    },
    [router]
  );
  const filterSheetRef = useRef<BottomSheetMethods>(null);
  const filterSnapPoints = useMemo(() => ["55%"], []);
  const { messages, status, send, stop, markPantryAdditionUndone } = useSearchAssistant();
  const streaming = status === "streaming";
  useLayoutEffect(() => {
    submitAI.current = (text) => {
      if (!focusEnabled || streaming || !text.trim()) return;
      clearInput();
      void send(text.trim());
    };
    return () => {
      submitAI.current = null;
    };
  }, [clearInput, focusEnabled, send, streaming, submitAI]);
  const undoAddition = async (receipt: PantryAdditionReceipt) => {
    const { pantryApi } = await import("~/data/api/pantryApi");
    await pantryApi.undoAssistantAddition(receipt);
    markPantryAdditionUndone(receipt.id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.all }),
    ]);
  };
  const hasConversation = messages.length > 0;
  useEffect(() => {
    if (!focusEnabled) stop();
  }, [focusEnabled, stop]);
  useFocusEffect(useCallback(() => () => stop(), [stop]));

  // Filters state
  const [selectedTime, setSelectedTime] = useState<{
    label: string;
    maxTotalTime?: number;
    minTotalTime?: number;
  } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);

  const hasFilters =
    selectedTime !== null ||
    selectedDifficulty !== null ||
    selectedTags.length > 0 ||
    minRating !== null;
  const trimmedInput = input.trim();
  const hasQuery = trimmedInput.length > 0 || hasFilters;
  const activeFilterCount =
    (selectedTime ? 1 : 0) +
    (selectedDifficulty ? 1 : 0) +
    selectedTags.length +
    (minRating ? 1 : 0);

  const activeFilters = useMemo(() => {
    const filters: RecipeFilters = {};
    if (selectedTime?.maxTotalTime) filters.maxTotalTime = selectedTime.maxTotalTime;
    if (selectedTime?.minTotalTime) filters.minTotalTime = selectedTime.minTotalTime;
    if (selectedDifficulty) filters.difficulty = selectedDifficulty;
    if (selectedTags.length > 0) filters.tags = selectedTags;
    if (minRating) filters.minRating = minRating;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [selectedTime, selectedDifficulty, selectedTags, minRating]);

  const { data: allRecipes = [], isPending: isRecipesCatalogPending } = useRecipes();
  const { data: pantryItems = [], isPending: isPantryPending } = usePantryItems();
  const { enabled: reviewsEnabled } = useFeatureFlag("ratings_and_reviews");

  const recipeResults = useMemo(
    () => (hasQuery ? filterRecipesForSearch(allRecipes, trimmedInput, activeFilters) : []),
    [allRecipes, trimmedInput, activeFilters, hasQuery]
  );

  const ingredientResults = useMemo(
    () => filterPantryItemsByName(pantryItems, trimmedInput),
    [pantryItems, trimmedInput]
  );

  const showSearchLoading =
    (hasQuery && isRecipesCatalogPending) || (trimmedInput.length > 0 && isPantryPending);

  const assistantHeader = (
    <>
      <SearchAssistantHeader
        showHint={!hasConversation}
        showConversation={showConversation}
        streaming={streaming}
        onStop={stop}
      />
    </>
  );

  const openFilterSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    filterSheetRef.current?.expand();
  };

  const closeFilterSheet = () => {
    filterSheetRef.current?.close();
  };

  const clearFilters = () => {
    setSelectedTime(null);
    setSelectedDifficulty(null);
    setSelectedTags([]);
    setMinRating(null);
  };

  const renderFilterChip = ({
    label,
    isActive,
    onPress,
  }: {
    label: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      className={cn(
        "px-4 py-2 rounded-full border border-border",
        isActive ? "bg-primary border-primary" : "bg-card"
      )}
    >
      <Text
        className={cn(
          "text-sm font-urbanist-semibold",
          isActive ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFilterSheet = () => (
    <Portal name="search-filter-sheet">
      <BottomSheet
        ref={filterSheetRef}
        index={-1}
        snapPoints={filterSnapPoints}
        enablePanDownToClose
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom + 24 }}
        >
          <View className="flex-row items-start justify-between mb-6">
            <View>
              <Text className="text-2xl font-bowlby-one text-foreground">Filters</Text>
              <Text className="text-sm text-muted-foreground font-urbanist-medium mt-1">
                Narrow recipes by time, difficulty, or diet
              </Text>
            </View>

            {hasFilters ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear search filters"
                onPress={clearFilters}
                className="px-3 py-2 rounded-full bg-muted"
              >
                <Text className="text-sm font-urbanist-semibold text-foreground">Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="gap-6">
            <View className="gap-3">
              <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                Cooking time
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <React.Fragment key={opt.label}>
                    {renderFilterChip({
                      label: opt.label,
                      isActive: selectedTime?.label === opt.label,
                      onPress: () =>
                        setSelectedTime(selectedTime?.label === opt.label ? null : opt),
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <View className="gap-3">
              <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                Difficulty
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <React.Fragment key={opt.label}>
                    {renderFilterChip({
                      label: opt.label,
                      isActive: selectedDifficulty === opt.value,
                      onPress: () =>
                        setSelectedDifficulty(selectedDifficulty === opt.value ? null : opt.value),
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <View className="gap-3">
              <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                Dietary
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => (
                  <React.Fragment key={tag}>
                    {renderFilterChip({
                      label: tag,
                      isActive: selectedTags.includes(tag),
                      onPress: () =>
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        ),
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {reviewsEnabled && (
              <View className="gap-3">
                <Text className="text-xs text-muted-foreground font-urbanist-semibold uppercase tracking-wider">
                  Rating
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {renderFilterChip({
                    label: "4+ Stars",
                    isActive: minRating === 4,
                    onPress: () => setMinRating(minRating === 4 ? null : 4),
                  })}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close search filters"
            onPress={closeFilterSheet}
            className="mt-8 rounded-2xl bg-foreground py-4 items-center"
          >
            <Text className="text-background font-urbanist-semibold text-base">Done</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </Portal>
  );

  return (
    <>
      {showConversation ? (
        <SearchKeyboardViewport testID="search-conversation-viewport">
          <View testID="search-conversation-header" style={{ paddingTop: safeTop + 10 }}>
            {assistantHeader}
          </View>
          {hasConversation ? (
            <AssistantMessages
              messages={messages}
              top={0}
              bottom={12}
              streaming={streaming}
              recipes={allRecipes}
              onUndo={undoAddition}
              onViewPantry={() => router.replace("/")}
              onReply={(question) => {
                if (!streaming) void send(question);
              }}
              onOpenRecipe={(id) => router.push(`/recipes/${id}`)}
            />
          ) : (
            <View className="flex-1" />
          )}
          <SearchAssistantPresets
            visible={!hasConversation && !trimmedInput}
            bottom={bottom}
            disabled={!focusEnabled || streaming}
            onAsk={(question) => {
              if (!focusEnabled || streaming) return;
              clearInput();
              void send(question);
            }}
          />
        </SearchKeyboardViewport>
      ) : (
        <SearchResultsList
          recipes={recipeResults}
          ingredients={ingredientResults}
          colors={colors}
          hasQuery={hasQuery}
          loading={showSearchLoading}
          top={contentTop}
          bottom={bottom}
          transparent={transparent}
          header={assistantHeader}
          query={normalizeWebRecipeQuery(trimmedInput)}
          web={{
            results: webSearch.data ?? [],
            loading: webSearch.isFetching,
            error: webSearch.isError,
            errorMessage: webSearch.error?.message,
            submitted: normalizeWebRecipeQuery(webQuery).length >= 2,
            canSearch: trimmedInput.length >= 2 && trimmedInput.length <= 200,
            onSearch: onWebSearch,
            onRetry: () => {
              void webSearch.refetch();
            },
            onOpen: openWebRecipe,
          }}
        />
      )}
      {/* <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hasFilters ? `Open filters, ${activeFilterCount} active` : "Open filters"
        }
        onPress={openFilterSheet}
        className="absolute right-4 z-50 rounded-full border border-border bg-card p-2 shadow-sm"
        style={{ top: top + 8 }}
      >
        <SlidersHorizontalIcon
          className={hasFilters ? "text-primary" : "text-foreground"}
          size={22}
          strokeWidth={2.4}
        />
        {hasFilters ? (
          <View className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-primary items-center justify-center px-1">
            <Text className="text-[10px] leading-3 text-primary-foreground font-urbanist-bold">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable> */}
      {renderFilterSheet()}
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
  },
});
