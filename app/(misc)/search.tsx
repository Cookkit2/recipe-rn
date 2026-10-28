import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SearchContent } from "~/components/Search/SearchContent";

export default function SearchScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <>
      <Stack.Screen options={{ animation: "fade" }} />
      <SearchContent
        initialConversation={mode === "chat"}
        onDismiss={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
      />
    </>
  );
}
