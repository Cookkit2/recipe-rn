import { extractYouTubePageMetadata, isYouTubeCaptionUrl } from "../page-metadata";

const id = "abcdef12345";
const player = {
  videoDetails: {
    videoId: id,
    title: "Garlic rice",
    shortDescription: 'Ingredients {rice}: 1 cup. Say "Cook". Simmer 15 minutes.',
    author: "Kitchen",
    lengthSeconds: "420",
  },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: "https://www.youtube.com/api/timedtext?v=abcdef12345&lang=ms",
          languageCode: "ms",
        },
        {
          baseUrl: "https://www.youtube.com/api/timedtext?v=abcdef12345&lang=en",
          languageCode: "en",
        },
        { baseUrl: "https://attacker.test/transcript", languageCode: "en" },
      ],
    },
  },
};
it("reads full descriptions and prioritizes English captions from the selected player", () => {
  const result = extractYouTubePageMetadata(
    `var ytInitialPlayerResponse = ${JSON.stringify(player)};`,
    id
  );
  expect(result?.description).toBe(player.videoDetails.shortDescription);
  expect(result?.duration).toBe(420);
  expect(result?.captionTracks.map((track) => track.language)).toEqual(["en", "ms"]);
});
it("ignores a recommended or mismatched video", () => {
  expect(
    extractYouTubePageMetadata(`ytInitialPlayerResponse=${JSON.stringify(player)}`, "different12")
  ).toBeUndefined();
});
it.each([
  "http://www.youtube.com/api/timedtext",
  "https://www.youtube.com.attacker.test/api/timedtext",
  "https://www.youtube.com/redirect",
  "https://user:secret@www.youtube.com/api/timedtext",
])("rejects an untrusted caption URL %s", (url) => {
  expect(isYouTubeCaptionUrl(url)).toBe(false);
});
