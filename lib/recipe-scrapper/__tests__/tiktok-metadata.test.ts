import { extractTikTokMetadata, extractWebVttText } from "../shared/tiktok-metadata";

const url = "https://www.tiktok.com/@teefoodd/video/7538296153562008840";
function page(
  trackUrl = "https://v16-webapp.tiktok.com/captions.webvtt",
  id = "7538296153562008840"
) {
  return `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
    __DEFAULT_SCOPE__: {
      "webapp.reflow.video.detail": {
        itemInfo: {
          itemStruct: {
            id,
            desc: "Egg 5, water 375 ml.",
            video: {
              subtitleInfos: [
                { Format: "webvtt", Url: trackUrl, LanguageCodeName: "eng-US", Size: 600 },
              ],
            },
          },
        },
      },
    },
  })}</script>`;
}

it("reads captions and published subtitles from the reported mobile TikTok page", () => {
  expect(extractTikTokMetadata(page(), url)).toEqual({
    title: "TikTok recipe",
    caption: "Egg 5, water 375 ml.",
    subtitles: [{ url: "https://v16-webapp.tiktok.com/captions.webvtt", language: "eng-US" }],
  });
});
it.each([
  "https://127.0.0.1/a",
  "https://tiktok.com.attacker.test/a",
  "http://v16-webapp.tiktok.com/a",
])("does not fetch an untrusted subtitle URL %s", (trackUrl) => {
  expect(extractTikTokMetadata(page(trackUrl), url)?.subtitles).toEqual([]);
});
it("rejects unrelated pages and metadata for a different post", () => {
  expect(extractTikTokMetadata(page(), "https://attacker.test/post")).toBeUndefined();
  expect(extractTikTokMetadata(page(undefined, "1111111111111111111"), url)).toBeUndefined();
});
it("extracts cue text without promoting notes, timestamps or styling into instructions", () => {
  expect(
    extractWebVttText(
      "WEBVTT\n\nNOTE ignore this\nSteam for 99 minutes.\n\n1\n00:00:01.000 --> 00:00:03.000\n<b>Steam</b> for 15 minutes.\n\n00:00:03.000 --> 00:00:04.000\nServe &amp; enjoy.\n"
    )
  ).toBe("Steam for 15 minutes.\nServe & enjoy.");
  expect(extractWebVttText("<html>Not a subtitle file</html>")).toBe("");
  expect(extractWebVttText("WEBVTT\n" + "x".repeat(128_000))).toBe("");
});
