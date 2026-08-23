import { MusicTrack } from '../../domain/entities/MusicTrack';

interface CacheEntry {
  data: MusicTrack[];
  expiresAt: number;
}

export class YouTubeService {
  private static readonly API_URL = 'https://www.googleapis.com/youtube/v3';
  
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutos

  private static decodeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  private static parseDuration(durationStr: string): number {
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    const seconds = parseInt(match[3] ?? '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private static getCacheKey(query: string, limit: number): string {
    return `${query.trim().toLowerCase()}|${limit}`;
  }

  // Chaves de standby para caso a cota da chave principal (.env) estoure
  private static get STANDBY_KEYS(): string[] {
    const standbyEnv = process.env.NEXT_PUBLIC_YOUTUBE_STANDBY_KEYS || process.env.YOUTUBE_STANDBY_KEYS;
    return standbyEnv ? standbyEnv.split(',').map(k => k.trim()).filter(Boolean) : [];
  }

  private static currentKeyIndex = 0;

  private static getActiveApiKey(): string | null {
    const envKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
    const allKeys = envKey ? [envKey, ...this.STANDBY_KEYS] : this.STANDBY_KEYS;
    
    if (allKeys.length === 0) return null;
    return allKeys[this.currentKeyIndex % allKeys.length];
  }

  private static rotateApiKey(): void {
    this.currentKeyIndex++;
    console.warn(`[YouTubeService] Cota esgotada (429)! Rotacionando para chave API #${this.currentKeyIndex}.`);
  }

  private static cleanExpiredCache(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    });
  }

  public static async search(query: string, limit: number = 15): Promise<MusicTrack[]> {
    let apiKey = this.getActiveApiKey();

    const cacheKey = this.getCacheKey(query, limit);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (!apiKey) {
      console.warn('Missing/Exhausted YOUTUBE_API_KEY. Usando endpoint de busca interna...');
      try {
        const fallbackRes = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          if (fallbackJson.results && fallbackJson.results.length > 0) {
            this.cache.set(cacheKey, {
              data: fallbackJson.results,
              expiresAt: Date.now() + this.CACHE_TTL,
            });
            return fallbackJson.results;
          }
        }
      } catch (e) {
        console.error('Erro na busca interna:', e);
      }
      return [];
    }

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (this.cache.size > 50) {
      this.cleanExpiredCache();
    }

    try {
      const getParams = (key: string) => new URLSearchParams({
        part: 'snippet',
        maxResults: '50',
        q: query,
        type: 'video',
        key: key,
      });

      let searchResponse = await fetch(`${this.API_URL}/search?${getParams(apiKey)}`);

      // Fallback para standby em caso de cota esgotada
      if (searchResponse.status === 429) {
        this.rotateApiKey();
        apiKey = this.getActiveApiKey();
        searchResponse = await fetch(`${this.API_URL}/search?${getParams(apiKey!)}`);
      }

      if (!searchResponse.ok) {
        const errBody = await searchResponse.text().catch(() => '');
        console.error(`YouTube Search API Error ${searchResponse.status}:`, errBody);
        throw new Error(
          `YouTube Search API Error ${searchResponse.status}: ${errBody || searchResponse.statusText}`
        );
      }

      const searchData = await searchResponse.json();
      const items = searchData.items ?? [];

      const videoIds = items
        .map((item: any) => item.id?.videoId)
        .filter((id: string | undefined): id is string => Boolean(id));

      if (videoIds.length === 0) {
        this.cache.set(cacheKey, {
          data: [],
          expiresAt: Date.now() + this.CACHE_TTL,
        });
        return [];
      }

      const detailsParams = new URLSearchParams({
        part: 'contentDetails',
        id: videoIds.join(','),
        key: apiKey || '',
      });

      const detailsResponse = await fetch(`${this.API_URL}/videos?${detailsParams}`);

      if (!detailsResponse.ok) {
        const errBody = await detailsResponse.text().catch(() => '');
        console.error(`YouTube Videos API Error ${detailsResponse.status}:`, errBody);
        throw new Error(
          `YouTube Videos API Error ${detailsResponse.status}: ${errBody || detailsResponse.statusText}`
        );
      }

      const detailsData = await detailsResponse.json();

      const durationMap: Record<string, number> = {};
      const licensedMap: Record<string, boolean> = {};

      for (const item of detailsData.items ?? []) {
        durationMap[item.id] = this.parseDuration(item.contentDetails?.duration ?? '');
        licensedMap[item.id] = item.contentDetails?.licensedContent === true;
      }

      const results: MusicTrack[] = items
        .map((item: any): MusicTrack | null => {
          const id = item.id?.videoId;
          if (!id) return null;

          return {
            id,
            provider: 'youtube',
            providerTrackId: id,
            title: this.decodeHtml(item.snippet?.title ?? ''),
            artist: this.decodeHtml(item.snippet?.channelTitle ?? ''),
            cover:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              '',
            duration: durationMap[id] ?? 0,
            createdAt: item.snippet?.publishedAt ?? null,
          };
        })
        .filter((track: any): track is MusicTrack => track !== null);

      // Filtro um pouco mais flexível para "Em alta"
      const filtered = results.filter(
        (track) => (track.duration ?? 0) >= 90 && (track.duration ?? 0) <= 2700 // 1:30 até 45 min
      );

      const finalResults = filtered.slice(0, limit);

      this.cache.set(cacheKey, {
        data: finalResults,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      return finalResults;
    } catch (error) {
      console.warn('[YouTubeService] API Oficial falhou ou cota esgotada. Acionando Fallback Interno via Scraper...');
      try {
        const fallbackRes = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          if (fallbackJson.results && fallbackJson.results.length > 0) {
            this.cache.set(cacheKey, {
              data: fallbackJson.results,
              expiresAt: Date.now() + this.CACHE_TTL,
            });
            return fallbackJson.results;
          }
        }
      } catch (fallbackErr) {
        console.error('[YouTubeService] Fallback Scraper também falhou:', fallbackErr);
      }
      return [];
    }
  }

  public static async getTrending(limit: number = 20): Promise<MusicTrack[]> {
    const cacheKey = this.getCacheKey('trending-feconecta', limit);
    const localStoreKey = 'fc_trending_cache';
    
    // 1. Tenta recuperar da memória
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 2. Tenta recuperar do localStorage (sobrevive a reloads)
    if (typeof window !== 'undefined') {
      try {
        const localCached = localStorage.getItem(localStoreKey);
        if (localCached) {
          const parsed = JSON.parse(localCached);
          // Cache longo de 12h para home page para economizar API
          if (parsed.expiresAt > Date.now()) {
            this.cache.set(cacheKey, parsed);
            return parsed.data;
          }
        }
      } catch (e) {}
    }

    // Queries bem direcionadas para o público do FéConecta
    const allQueries = [
      'louvor gospel 2024',
      'lançamentos gospel',
      'hillsong worship português',
      'diante do trono',
      'fernandinho',
      'gabriela rocha',
      'isadora pompeo',
      'midian lima',
      'ministério zoe',
      'nivea soares',
      'morada louvor',
      'theo rubia',
      'casa worship',
    ];

    // COTA YOUTUBE (Error 429): Para não esgotar as 100 requisições diárias com um array de 14 buscas,
    // escolhemos aleatoriamente APENAS 2 ou 3 queries por vez para formar o trending.
    const shuffledQueries = allQueries.sort(() => Math.random() - 0.5).slice(0, 3);

    try {
      // Busca em paralelo apenas das 3 escolhidas
      const settledResults = await Promise.allSettled(
        shuffledQueries.map((query) => this.search(query, 8))
      );

      const results = settledResults
        .filter((res): res is PromiseFulfilledResult<MusicTrack[]> => res.status === 'fulfilled')
        .map((res) => res.value);

      const allTracks = results.flat();
      const uniqueTracks = Array.from(
        new Map(allTracks.map((track) => [track.providerTrackId || track.id, track])).values()
      );

      const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);
      const finalResults = shuffled.slice(0, limit);

      const cacheData = {
        data: finalResults,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 horas de cache
      };

      // Salva na memória
      this.cache.set(cacheKey, cacheData);

      // Salva no LocalStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(localStoreKey, JSON.stringify(cacheData));
      }

      return finalResults;
    } catch (error) {
      console.error('Erro ao buscar trending FéConecta:', error);
      return [];
    }
  }

  public static clearCache(): void {
    this.cache.clear();
  }
}
