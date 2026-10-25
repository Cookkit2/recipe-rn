import { INSTAGRAM_VIDEO_RESOLVER } from "../shared/instagram-metadata";
import { videoResolverScript } from "../shared/video-source";
import { runInNewContext } from "node:vm";
// Exercise the exact source embedded in the native WebView, including release builds.
const findInstagramVideo = runInNewContext(INSTAGRAM_VIDEO_RESOLVER) as (
  root: unknown,
  postId: string
) => { mediaUrl: string; caption: string } | undefined;
const id = "Db18zFIR5k-";
const selected = {
  code: id,
  caption: { text: "peach oolong" },
  video_versions: [{ type: 101, url: "https://instagram.example.fbcdn.net/peach.mp4" }],
};
it("finds the modern logged-out Instagram media wrapper", () => {
  expect(
    findInstagramVideo(
      { data: { xig_polaris_media: { code: id, if_not_gated_logged_out: selected } } },
      id
    )
  ).toEqual({ mediaUrl: selected.video_versions[0]!.url, caption: "peach oolong" });
});
it("does not substitute a recommended reel or a caption-only record", () => {
  expect(
    findInstagramVideo(
      {
        items: [
          { ...selected, code: "different" },
          { code: id, caption: "recipe" },
        ],
      },
      id
    )
  ).toBeUndefined();
});
it("supports the older shortcode and direct video_url representation", () => {
  expect(
    findInstagramVideo(
      {
        shortcode_media: {
          shortcode: id,
          video_url: selected.video_versions[0]!.url,
          caption: "peach",
        },
      },
      id
    )?.caption
  ).toBe("peach");
});
it("bounds malformed and excessively deep metadata", () => {
  const cyclic: any = { child: {} };
  cyclic.child.parent = cyclic;
  expect(() => findInstagramVideo(cyclic, id)).not.toThrow();
  expect(findInstagramVideo(null, id)).toBeUndefined();
});
it("keeps CDN checks in the resolver even for matching Instagram metadata", () => {
  const postMessage = jest.fn();
  runInNewContext(videoResolverScript(), {
    window: { CookkitVideo: { postMessage } },
    document: {
      title: "Instagram",
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: (selector: string) =>
        selector.includes("application/json")
          ? [
              {
                textContent: JSON.stringify({
                  ...selected,
                  video_versions: [{ url: "https://attacker.test/private.mp4" }],
                }),
              },
            ]
          : [],
    },
    location: { href: `https://www.instagram.com/reel/${id}/` },
    navigator: { userAgent: "Safari" },
    URL,
    setInterval: () => 0,
    setTimeout: () => 0,
    clearInterval: () => {},
  });
  expect(postMessage).not.toHaveBeenCalled();
});
