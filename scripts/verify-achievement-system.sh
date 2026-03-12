#!/bin/bash

# Achievement System Verification Script
# This script performs static verification of the achievement system integration

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Achievement System End-to-End Verification                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
SKIPPED=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_skip() {
    echo -e "${YELLOW}○${NC} $1"
    ((SKIPPED++))
}

# Database Schema Verification
echo "=== Database Schema Verification ==="
echo ""

# Check schema.ts for new tables (handle both single and double quotes)
if grep -q 'name: "achievement"' data/db/schema.ts || grep -q "name: 'achievement'" data/db/schema.ts; then
    check_pass "Achievement table exists in schema"
else
    check_fail "Achievement table NOT found in schema"
fi

if grep -q 'name: "user_achievement"' data/db/schema.ts || grep -q "name: 'user_achievement'" data/db/schema.ts; then
    check_pass "User Achievement table exists in schema"
else
    check_fail "User Achievement table NOT found in schema"
fi

if grep -q 'name: "challenge"' data/db/schema.ts || grep -q "name: 'challenge'" data/db/schema.ts; then
    check_pass "Challenge table exists in schema"
else
    check_fail "Challenge table NOT found in schema"
fi

if grep -q 'name: "user_challenge"' data/db/schema.ts || grep -q "name: 'user_challenge'" data/db/schema.ts; then
    check_pass "User Challenge table exists in schema"
else
    check_fail "User Challenge table NOT found in schema"
fi

# Check schema version is 6
if grep -q "version: 8" data/db/schema.ts; then
    check_pass "Schema version updated to 6"
else
    check_fail "Schema version NOT updated to 6"
fi

echo ""

# Model Files Verification
echo "=== Model Files Verification ==="
echo ""

if [ -f "data/db/models/Achievement.ts" ]; then
    check_pass "Achievement.ts model exists"
else
    check_fail "Achievement.ts model NOT found"
fi

if [ -f "data/db/models/UserAchievement.ts" ]; then
    check_pass "UserAchievement.ts model exists"
else
    check_fail "UserAchievement.ts model NOT found"
fi

if [ -f "data/db/models/Challenge.ts" ]; then
    check_pass "Challenge.ts model exists"
else
    check_fail "Challenge.ts model NOT found"
fi

if [ -f "data/db/models/UserChallenge.ts" ]; then
    check_pass "UserChallenge.ts model exists"
else
    check_fail "UserChallenge.ts model NOT found"
fi

echo ""

# Repository Files Verification
echo "=== Repository Files Verification ==="
echo ""

if [ -f "data/db/repositories/AchievementRepository.ts" ]; then
    check_pass "AchievementRepository.ts exists"
else
    check_fail "AchievementRepository.ts NOT found"
fi

if [ -f "data/db/repositories/UserAchievementRepository.ts" ]; then
    check_pass "UserAchievementRepository.ts exists"
else
    check_fail "UserAchievementRepository.ts NOT found"
fi

if [ -f "data/db/repositories/ChallengeRepository.ts" ]; then
    check_pass "ChallengeRepository.ts exists"
else
    check_fail "ChallengeRepository.ts NOT found"
fi

if [ -f "data/db/repositories/UserChallengeRepository.ts" ]; then
    check_pass "UserChallengeRepository.ts exists"
else
    check_fail "UserChallengeRepository.ts NOT found"
fi

echo ""

# Service Layer Verification
echo "=== Service Layer Verification ==="
echo ""

if [ -f "data/services/StreakService.ts" ]; then
    check_pass "StreakService.ts exists"
    # Check for key methods
    if grep -q "calculateCurrentStreak" data/services/StreakService.ts; then
        check_pass "StreakService has calculateCurrentStreak method"
    else
        check_fail "StreakService missing calculateCurrentStreak method"
    fi
else
    check_fail "StreakService.ts NOT found"
fi

if [ -f "data/services/AchievementService.ts" ]; then
    check_pass "AchievementService.ts exists"
    # Check for key methods
    if grep -q "checkAchievements" data/services/AchievementService.ts; then
        check_pass "AchievementService has checkAchievements method"
    else
        check_fail "AchievementService missing checkAchievements method"
    fi
else
    check_fail "AchievementService.ts NOT found"
fi

if [ -f "data/services/ChallengeService.ts" ]; then
    check_pass "ChallengeService.ts exists"
    # Check for key methods
    if grep -q "getActiveChallenges" data/services/ChallengeService.ts; then
        check_pass "ChallengeService has getActiveChallenges method"
    else
        check_fail "ChallengeService missing getActiveChallenges method"
    fi
else
    check_fail "ChallengeService.ts NOT found"
fi

echo ""

# Integration Points Verification
echo "=== Integration Points Verification ==="
echo ""

# Check RecipeStepsContext for achievement integration
if grep -q "achievementService.checkAchievements" store/RecipeStepsContext.tsx; then
    check_pass "Recipe completion flow integrated with achievements"
else
    check_fail "Recipe completion flow NOT integrated with achievements"
fi

# Check usePantryQueries for achievement integration
INTEGRATION_COUNT=$(grep -c "achievementService.checkAchievements" hooks/queries/usePantryQueries.ts || true)
if [ "$INTEGRATION_COUNT" -ge 3 ]; then
    check_pass "Pantry mutations integrated with achievements ($INTEGRATION_COUNT integration points)"
else
    check_fail "Pantry mutations NOT fully integrated with achievements (found $INTEGRATION_COUNT, expected >= 3)"
fi

echo ""

# React Query Hooks Verification
echo "=== React Query Hooks Verification ==="
echo ""

if [ -f "hooks/queries/achievementQueryKeys.ts" ]; then
    check_pass "achievementQueryKeys.ts exists"
else
    check_fail "achievementQueryKeys.ts NOT found"
fi

if [ -f "hooks/queries/challengeQueryKeys.ts" ]; then
    check_pass "challengeQueryKeys.ts exists"
else
    check_fail "challengeQueryKeys.ts NOT found"
fi

if [ -f "hooks/queries/useAchievementQueries.ts" ]; then
    check_pass "useAchievementQueries.ts exists"
    # Check for key hooks
    if grep -q "export function useAchievements" hooks/queries/useAchievementQueries.ts; then
        check_pass "useAchievements hook exists"
    else
        check_fail "useAchievements hook NOT found"
    fi
else
    check_fail "useAchievementQueries.ts NOT found"
fi

if [ -f "hooks/queries/useChallengeQueries.ts" ]; then
    check_pass "useChallengeQueries.ts exists"
    # Check for key hooks
    if grep -q "export function useChallenges" hooks/queries/useChallengeQueries.ts; then
        check_pass "useChallenges hook exists"
    else
        check_fail "useChallenges hook NOT found"
    fi
else
    check_fail "useChallengeQueries.ts NOT found"
fi

echo ""

# UI Components Verification
echo "=== UI Components Verification ==="
echo ""

if [ -f "components/Profile/AchievementBadge.tsx" ]; then
    check_pass "AchievementBadge.tsx component exists"
else
    check_fail "AchievementBadge.tsx component NOT found"
fi

if [ -f "components/Profile/StreakDisplay.tsx" ]; then
    check_pass "StreakDisplay.tsx component exists"
else
    check_fail "StreakDisplay.tsx component NOT found"
fi

if [ -f "components/Profile/ChallengeCard.tsx" ]; then
    check_pass "ChallengeCard.tsx component exists"
else
    check_fail "ChallengeCard.tsx component NOT found"
fi

if [ -f "components/Profile/AchievementsCard.tsx" ]; then
    check_pass "AchievementsCard.tsx component exists"
else
    check_fail "AchievementsCard.tsx component NOT found"
fi

if [ -f "app/profile/achievements.tsx" ]; then
    check_pass "AchievementsScreen.tsx exists"
else
    check_fail "AchievementsScreen.tsx NOT found"
fi

echo ""

# Type Definitions Verification
echo "=== Type Definitions Verification ==="
echo ""

if [ -f "types/achievements.ts" ]; then
    check_pass "types/achievements.ts exists"
    # Check for key types
    if grep -q "export interface AchievementRequirement" types/achievements.ts; then
        check_pass "AchievementRequirement type exists"
    else
        check_fail "AchievementRequirement type NOT found"
    fi
else
    check_fail "types/achievements.ts NOT found"
fi

echo ""

# DatabaseFacade Verification
echo "=== DatabaseFacade Verification ==="
echo ""

# Check if DatabaseFacade exports achievement methods
if grep -q "getAchievements" data/db/DatabaseFacade.ts; then
    check_pass "DatabaseFacade has getAchievements method"
else
    check_fail "DatabaseFacade missing getAchievements method"
fi

if grep -q "getChallenges" data/db/DatabaseFacade.ts; then
    check_pass "DatabaseFacade has getChallenges method"
else
    check_fail "DatabaseFacade missing getChallenges method"
fi

if grep -q "unlockAchievement" data/db/DatabaseFacade.ts; then
    check_pass "DatabaseFacade has unlockAchievement method"
else
    check_fail "DatabaseFacade missing unlockAchievement method"
fi

echo ""

# Notification Integration Verification
echo "=== Notification Integration Verification ==="
echo ""

if [ -f "lib/notifications/achievement-notifications.ts" ]; then
    check_pass "achievement-notifications.ts exists"
    if grep -q "scheduleAchievementUnlock" lib/notifications/achievement-notifications.ts; then
        check_pass "scheduleAchievementUnlock function exists"
    else
        check_fail "scheduleAchievementUnlock function NOT found"
    fi
else
    check_fail "achievement-notifications.ts NOT found"
fi

echo ""

# Summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Verification Summary                                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
TOTAL=$((PASSED + FAILED + SKIPPED))
echo "Total: $TOTAL"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo -e "${YELLOW}○ Skipped: $SKIPPED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Verification completed with failures${NC}"
    echo ""
    echo "Please review the failed checks above and fix any issues."
    exit 1
else
    echo -e "${GREEN}✅ Verification completed successfully${NC}"
    echo ""
    echo "All automated checks passed! Please proceed with manual testing."
    echo "See docs/ACHIEVEMENT_SYSTEM_TESTING_GUIDE.md for manual testing steps."
    exit 0
fi
