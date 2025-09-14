import React from "react";
import { WebView } from "react-native-webview";

export default function Webview() {
  return <WebView source={{ uri: "https://www.google.com" }} />;
}
