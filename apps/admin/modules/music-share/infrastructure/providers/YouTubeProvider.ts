import { ExtractedMetadata, IMetadataProvider } from '../../domain/repositories/IMetadataProvider';

export class YouTubeProvider implements IMetadataProvider {
  canHandle(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  async extractMetadata(url: string): Promise<ExtractedMetadata> {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) throw new Error('Chave do YouTube não configurada');

      // Extrair ID do vídeo
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v') || '';
      }

      if (!videoId) throw new Error('ID do vídeo não encontrado');

      const apiResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`);
      const data = await apiResponse.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Vídeo não encontrado');
      }

      const item = data.items[0];
      const snippet = item.snippet;
      const contentDetails = item.contentDetails;

      // YouTube duration format is ISO 8601 (PT#M#S)
      // Basic conversion for MVP
      let durationStr = contentDetails.duration;
      let durationSecs = 0;
      const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const h = parseInt(match[1] || '0');
        const m = parseInt(match[2] || '0');
        const s = parseInt(match[3] || '0');
        durationSecs = (h * 3600) + (m * 60) + s;
      }

      return {
        platform: 'youtube',
        type: 'track', // Podemos tratar como track ou podcast
        externalId: videoId,
        title: snippet.title,
        artist: snippet.channelTitle,
        cover: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        duration: durationSecs,
        url,
      };
    } catch (e: any) {
      console.error('Erro no YouTubeProvider:', e);
      throw new Error('Falha ao buscar dados do YouTube: ' + e.message);
    }
  }
}
