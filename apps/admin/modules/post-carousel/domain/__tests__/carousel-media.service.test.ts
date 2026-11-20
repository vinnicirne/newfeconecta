import { describe, expect, it } from 'vitest';
import { getPostCarouselUrls } from '../carousel-media.service';

describe('getPostCarouselUrls', () => {
  it('reads media URLs from JSONB metadata', () => {
    expect(getPostCarouselUrls({ metadata: { media_urls: [' first.jpg ', 'second.jpg'] } }))
      .toEqual(['first.jpg', 'second.jpg']);
  });

  it('reads serialized metadata and falls back to the legacy column', () => {
    expect(getPostCarouselUrls({
      metadata: '{"media_urls":[]}',
      media_urls: ['first.jpg', 'second.jpg'],
    })).toEqual(['first.jpg', 'second.jpg']);
  });

  it('ignores invalid and duplicate entries', () => {
    expect(getPostCarouselUrls({ metadata: { media_urls: ['first.jpg', null, 'first.jpg', '  '] } }))
      .toEqual(['first.jpg']);
    expect(getPostCarouselUrls({ metadata: '{invalid json' })).toEqual([]);
  });
});
