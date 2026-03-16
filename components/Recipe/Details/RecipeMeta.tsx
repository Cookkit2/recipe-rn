import { View } from "react-native";
import { ClockIcon, StarIcon } from "lucide-uniwind";
import { P } from "~/components/ui/typography";

interface RecipeMetaProps {
  totalMinutes: number;
  readyByLabel: { label: string; time: string };
  difficultyStars: number;
}

export default function RecipeMeta({
  totalMinutes,
  readyByLabel,
  difficultyStars,
}: RecipeMetaProps) {
  if (totalMinutes <= 0 && difficultyStars <= 0) {
    return null;
  }

  return (
    <View className="flex-column items-center justify-center gap-3 my-2">
      {totalMinutes > 0 && (
        <View className="flex-row items-center gap-2">
          <ClockIcon className="text-muted-foreground" size={16} strokeWidth={3} />
          <P className="font-urbanist-medium text-foreground">{readyByLabel.label}</P>
          <P className="font-urbanist-regular text-muted-foreground font-bold">•</P>
          <P className="font-urbanist-regular text-muted-foreground">{totalMinutes} min</P>
        </View>
      )}
      {difficultyStars > 0 && (
        <View className="flex-row items-center gap-1">
          {Array.from({ length: difficultyStars }).map((_, i) => (
            <StarIcon
              key={i}
              className="text-yellow-500"
              size={16}
              strokeWidth={3}
              fill="#ffd700"
            />
          ))}
          <P className="font-urbanist-regular text-muted-foreground ml-1">difficulty</P>
        </View>
      )}
    </View>
  );
}
