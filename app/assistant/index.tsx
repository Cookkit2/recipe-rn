import { Redirect } from "expo-router";

/** Preserve existing links while search becomes the single assistant entry. */
export default function AssistantScreen() {
  return <Redirect href="/search" />;
}
