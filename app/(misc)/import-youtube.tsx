import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import RecipeDetailsSkeleton from "~/components/Recipe/Details/RecipeDetailsSkeleton";
import { savePendingRecipeShare } from "~/lib/recipe-share-inbox";
import { normalizeVideoPostUrl } from "~/lib/recipe-scrapper/shared/video-source";

/** Keep old YouTube links working without showing the retired import form. */
export default function ImportYouTubeRecipe() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const videoUrl = typeof url === "string" ? normalizeVideoPostUrl(url) : undefined;
    if (!videoUrl || new URL(videoUrl).hostname !== "www.youtube.com") {
      router.replace("/");
      return;
    }
    if (handled.current === videoUrl) return;
    handled.current = videoUrl;
    const pending = savePendingRecipeShare({ url: videoUrl });
    router.replace({ pathname: "/recipes/import", params: { shareId: pending.id } });
  }, [url, router]);
  return <RecipeDetailsSkeleton message="Reading recipe…" />;
}
