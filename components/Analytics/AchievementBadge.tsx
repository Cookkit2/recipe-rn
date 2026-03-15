import * as React from "react";
import { View } from "react-native";
import { Card, CardContent } from "~/components/ui/card";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export interface AchievementBadgeProps {
  achievement: Achievement;
  className?: string;
}

function AchievementBadge({ achievement, className }: AchievementBadgeProps) {
  const { title, description, icon, unlocked, progress, target } = achievement;

  const progressPercentage = React.useMemo(() => {
    if (progress !== undefined && target !== undefined && target > 0) {
      return Math.min(Math.round((progress / target) * 100), 100);
    }
    return unlocked ? 100 : 0;
  }, [progress, target, unlocked]);

  return (
    <Card
      className={cn("relative overflow-hidden", unlocked ? "bg-card" : "bg-muted/50", className)}
    >
      <CardContent className="p-4 gap-3">
        <View className="flex-row items-center gap-3">
          {/* Achievement Icon */}
          <View
            className={cn(
              "h-12 w-12 rounded-full items-center justify-center",
              unlocked ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted-foreground/10"
            )}
          >
            <P className="text-2xl">{icon}</P>
          </View>

          {/* Achievement Info */}
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <P
                className={cn(
                  "font-urbanist-semibold text-base",
                  unlocked ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {title}
              </P>
              {!unlocked && (
                <View className="rounded-full bg-muted-foreground/20 px-2 py-0.5">
                  <P className="text-xs text-muted-foreground font-urbanist-medium">Locked</P>
                </View>
              )}
            </View>
            <P className="text-sm text-muted-foreground font-urbanist-medium">{description}</P>
          </View>
        </View>

        {/* Progress Bar (for achievements with progress) */}
        {progress !== undefined && target !== undefined && (
          <View className="mt-1 gap-1">
            <View className="flex-row justify-between items-center">
              <P className="text-xs text-muted-foreground font-urbanist-medium">
                {unlocked ? "Completed" : "Progress"}
              </P>
              <P className="text-xs text-muted-foreground font-urbanist-medium">
                {progress}/{target}
              </P>
            </View>
            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <View
                className={cn(
                  "h-full rounded-full",
                  unlocked ? "bg-amber-500" : "bg-muted-foreground/30"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </View>
          </View>
        )}

        {/* Unlocked Date */}
        {unlocked && achievement.unlockedAt && (
          <View className="mt-1">
            <P className="text-xs text-muted-foreground font-urbanist-medium">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </P>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

export { AchievementBadge };
