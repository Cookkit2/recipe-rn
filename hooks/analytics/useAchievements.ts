import { useState, useRef, useEffect, useMemo } from "react";
import type { WasteStats } from "~/data/db/repositories/WasteLogRepository";
import type { Achievement } from "~/components/Analytics/AchievementBadge";

// CO2 conversion factor: 1kg of food waste ≈ 2.5kg CO2 equivalent
export const CO2_CONVERSION_FACTOR = 2.5;

export function calculateAchievements(stats: Partial<WasteStats>): Achievement[] {
  const totalWasteEntries = stats.totalWasteEntries || 0;
  const totalMoneyWasted = (stats.totalEstimatedCost || 0) / 100; // Convert cents to dollars
  const totalCO2FromWaste = (stats.totalQuantityWasted || 0) * CO2_CONVERSION_FACTOR; // Apply conversion
  const currentStreak = stats.currentStreak || 0;
  const longestStreak = stats.longestStreak || 0;

  const achievements: Achievement[] = [
    {
      id: "first-log",
      title: "Waste Warrior",
      description: "Log your first waste item",
      icon: "🗑️",
      unlocked: totalWasteEntries > 0,
    },
    {
      id: "zero-waste-week",
      title: "Zero Waste Week",
      description: "Go 7 days without logging any waste",
      icon: "🌿",
      unlocked: currentStreak >= 7,
      progress: currentStreak,
      target: 7,
    },
    {
      id: "money-saver",
      title: "Money Saver",
      description: "Track $100 worth of waste (awareness saves money)",
      icon: "💰",
      unlocked: totalMoneyWasted >= 100,
      progress: Math.floor(totalMoneyWasted),
      target: 100,
    },
    {
      id: "eco-hero",
      title: "Eco Hero",
      description: "Track 50kg of CO2 equivalent emissions",
      icon: "🌍",
      unlocked: totalCO2FromWaste >= 50,
      progress: Math.floor(totalCO2FromWaste),
      target: 50,
    },
    {
      id: "streak-master",
      title: "Streak Master",
      description: "Maintain a 30-day no-waste streak",
      icon: "🔥",
      unlocked: longestStreak >= 30,
      progress: longestStreak,
      target: 30,
    },
  ];
  return achievements;
}

export function useAchievements(wasteStats: Partial<WasteStats> | undefined) {
  const [showConfetti, setShowConfetti] = useState(false);
  const previousUnlockedIds = useRef<Set<string>>(new Set());

  // Calculate achievements from stats
  const achievements = useMemo(() => calculateAchievements(wasteStats || {}), [wasteStats]);

  const unlockedAchievements = useMemo(
    () => achievements.filter((a) => a.unlocked),
    [achievements]
  );
  const lockedAchievements = useMemo(() => achievements.filter((a) => !a.unlocked), [achievements]);

  // Detect newly unlocked achievements and show confetti
  useEffect(() => {
    const currentUnlockedIds = new Set(unlockedAchievements.map((a) => a.id));
    const newlyUnlocked = Array.from(currentUnlockedIds).filter(
      (id) => !previousUnlockedIds.current.has(id)
    );

    if (newlyUnlocked.length > 0) {
      setShowConfetti(true);
      // Auto-hide confetti after animation completes (2000ms + buffer)
      const timeout = setTimeout(() => {
        setShowConfetti(false);
      }, 2500);
      return () => clearTimeout(timeout);
    }

    // Update previous unlocked state for next comparison
    previousUnlockedIds.current = currentUnlockedIds;
  }, [unlockedAchievements]);

  return {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    showConfetti,
    setShowConfetti,
  };
}
