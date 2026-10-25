import { Stack, useRouter } from "expo-router";
import { SearchContent } from "~/components/Search/SearchContent";

export default function SearchScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ animation: "fade" }} />
      <SearchContent
        onDismiss={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
      />
    </>
  );
}
