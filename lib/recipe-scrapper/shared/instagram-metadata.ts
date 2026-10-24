/** Explicit WebView source avoids depending on a bundled function's toString() representation. */
export const INSTAGRAM_VIDEO_RESOLVER = `((root, postId) => {
  let remaining = 12_000;
  const visit = (value, depth) => {
    if (!value || typeof value !== "object" || depth > 30 || --remaining < 0) return;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, depth + 1);
        if (found) return found;
      }
      return;
    }
    const entry = value;
    // Match the selected post. Recommended reels and comments must not supply its video.
    if (entry.code === postId || entry.shortcode === postId) {
      const media = entry.if_not_gated_logged_out ?? entry;
      const versions = Array.isArray(media.video_versions) ? media.video_versions : [];
      const variant = versions.find((item) => item && typeof item.url === "string");
      const mediaUrl = media.video_url ?? variant?.url;
      const caption = media.caption;
      if (typeof mediaUrl === "string")
        return { mediaUrl, caption: typeof caption === "string" ? caption : (caption?.text ?? "") };
    }
    for (const child of Object.values(entry)) {
      const found = visit(child, depth + 1);
      if (found) return found;
    }
  };
  return visit(root, 0);
})`;
