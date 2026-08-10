import { ExtractedMetadata, IMetadataProvider } from '../../domain/repositories/IMetadataProvider';

export class SpotifyProvider implements IMetadataProvider {
  canHandle(url: string): boolean {
    return url.includes('spotify.com');
  }

  async extractMetadata(url: string): Promise<ExtractedMetadata> {
    try {
      // Em produção, isso deve rodar no Server (Server Action) pois requer as chaves do .env
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Chaves do Spotify não configuradas');
      }

      // Extrair o tipo e ID da URL do Spotify
      // Exemplo: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
      const match = url.match(/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
      if (!match) throw new Error('URL do Spotify inválida');

      const [, type, id] = match;

      // 1. Obter Token de Acesso
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      });
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 2. Buscar Dados da API
      const apiResponse = await fetch(`https://api.spotify.com/v1/${type}s/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await apiResponse.json();

      let title = data.name;
      let artist = '';
      let cover = '';
      let duration = 0;
      let musicType: 'track' | 'album' | 'playlist' | 'podcast' | 'unknown' = 'unknown';

      if (type === 'track') {
        musicType = 'track';
        artist = data.artists?.map((a: any) => a.name).join(', ');
        cover = data.album?.images?.[0]?.url;
        duration = Math.floor(data.duration_ms / 1000);
      } else if (type === 'album') {
        musicType = 'album';
        artist = data.artists?.map((a: any) => a.name).join(', ');
        cover = data.images?.[0]?.url;
      } else if (type === 'playlist') {
        musicType = 'playlist';
        artist = data.owner?.display_name;
        cover = data.images?.[0]?.url;
      } else if (type === 'episode' || type === 'show') {
        musicType = 'podcast';
        cover = data.images?.[0]?.url || data.show?.images?.[0]?.url;
        duration = Math.floor(data.duration_ms / 1000);
      }

      return {
        platform: 'spotify',
        type: musicType,
        externalId: id,
        title,
        artist,
        cover,
        duration,
        url,
      };
    } catch (e: any) {
      console.error('Erro no SpotifyProvider:', e);
      throw new Error('Falha ao buscar dados do Spotify: ' + e.message);
    }
  }
}
