const postHosts = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "instagram.com",
  "www.instagram.com",
]);

export function normalizeVideoPostUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !postHosts.has(url.hostname)
    )
      return;
    const pathValid = url.hostname.endsWith("instagram.com")
      ? /^\/(?:p|reel|reels)\/[\w-]+\/?$/.test(url.pathname)
      : ["vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname)
        ? /^\/[A-Za-z0-9]{4,64}\/?$/.test(url.pathname)
        : /^\/@[\w.-]+\/video\/\d+\/?$/.test(url.pathname);
    if (!pathValid) return;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return;
  }
}

/** Only download media from the platform's known CDN hosts. No arbitrary URLs or blob handles. */
export function isAllowedVideoMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 12_000) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return [
      "tiktok.com",
      "tiktokcdn.com",
      "tiktokcdn-us.com",
      "tiktokcdn-eu.com",
      "byteoversea.com",
      "ibytedtos.com",
      "cdninstagram.com",
      "fbcdn.net",
    ].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/** Runs in a temporary platform WebView. No credentials, provider keys, or external app cookies are injected. */
export function videoResolverScript(): string {
  return `(() => {
    const send = (value) => {
      const json = JSON.stringify(value);
      if (window.webkit?.messageHandlers?.cookkitVideo) window.webkit.messageHandlers.cookkitVideo.postMessage(json);
      else window.CookkitVideo?.postMessage(json);
    };
    let finished = false;
    const allowedMedia = (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
          ['tiktok.com','tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','byteoversea.com','ibytedtos.com','cdninstagram.com','fbcdn.net']
            .some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
      } catch { return false; }
    };
    const finish = (mediaUrl, caption) => {
      if (finished || typeof mediaUrl !== 'string' || mediaUrl.length > 12000 || !allowedMedia(mediaUrl)) return;
      finished = true;
      send({ mediaUrl, caption: String(caption || '').slice(0,32000), title: document.title.slice(0,500), userAgent: navigator.userAgent });
    };
    const scan = () => {
      const caption = document.querySelector('meta[property="og:description"]')?.content || document.querySelector('meta[name="description"]')?.content || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
      const id = canonical.match(/\\/video\\/(\\d+)/)?.[1];
      for (const name of ['__UNIVERSAL_DATA_FOR_REHYDRATION__','SIGI_STATE']) {
        try {
          const data = JSON.parse(document.getElementById(name)?.textContent || '{}');
          const scope = data.__DEFAULT_SCOPE__;
          const items = [
            scope?.['webapp.video-detail']?.itemInfo?.itemStruct,
            scope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct,
            id && data.ItemModule?.[id]
          ];
          for (const item of items) {
            if (item && (!id || String(item.id) === id)) finish(item.video?.playAddr || item.video?.downloadAddr, item.desc || caption);
          }
        } catch {}
      }
      for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const root = JSON.parse(node.textContent || '{}');
          const items = Array.isArray(root) ? root : [root, ...(root['@graph'] || [])];
          for (const item of items) {
            const video = item?.video || item;
            if (video?.['@type'] === 'VideoObject') finish(video.contentUrl, item.articleBody || video.description || caption);
          }
        } catch {}
      }
      const video = document.querySelector('video');
      finish(video?.currentSrc || video?.src, caption);
      const og = document.querySelector('meta[property="og:video:secure_url"]') || document.querySelector('meta[property="og:video"]');
      finish(og?.content, caption);
      if (!finished && video) { video.muted = true; video.play().catch(() => {}); }
    };
    scan();
    const timer = setInterval(() => { if (finished) clearInterval(timer); else scan(); }, 500);
    setTimeout(() => clearInterval(timer), 15000);
  })();`;
}
