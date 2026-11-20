type PostWithCarouselMedia = {
  metadata?: unknown;
  media_urls?: unknown;
};

function parseUrls(value: unknown): string[] {
  let candidate = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate)) return [];
  const urls: string[] = [];
  const seen = new Set<string>();
  candidate.forEach((value) => {
    if (typeof value !== 'string') return;
    const url = value.trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  });
  return urls;
}

/** Reads carousel URLs from both the legacy column and JSONB metadata formats. */
export function getPostCarouselUrls(post: PostWithCarouselMedia | null | undefined): string[] {
  let metadata = post?.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = null;
    }
  }

  const metadataUrls = parseUrls(
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).media_urls
      : null,
  );
  return metadataUrls.length > 0 ? metadataUrls : parseUrls(post?.media_urls);
}
