import { useEffect, useRef } from 'react';
import { YouTubeService } from '../infrastructure/services/YouTubeService';
import { YouTubeProvider } from '../infrastructure/providers/YouTubeProvider';
import { READY_SESSIONS } from '../domain/sessions';
import { MusicTrack } from '../domain/entities/MusicTrack';

export function useWarmCache() {
  const hasWarmed = useRef(false);

  useEffect(() => {
    // Só executa uma vez por abertura do app
    if (hasWarmed.current || typeof window === 'undefined') return;
    hasWarmed.current = true;

    const warm = async () => {
      try {
        console.log('[WarmCache] Iniciando aquecimento de cache silencioso em background...');

        // 1. Busca as músicas das Sessões Prontas (poucas de cada)
        const sessionPromises = READY_SESSIONS.map((session) =>
          Promise.all(
            session.queries.slice(0, 2).map((q) => YouTubeService.search(q, 3))
          )
        );

        const sessionResults = await Promise.all(sessionPromises);
        const sessionTracks = sessionResults.flat(2);

        // 2. Busca a lista "Em alta"
        let trendingTracks: MusicTrack[] = [];
        try {
          trendingTracks = await YouTubeService.getTrending(12);
        } catch (err) {
          console.warn('[WarmCache] Erro ao buscar trending para aquecimento:', err);
        }

        // Junta tudo e remove duplicados
        const allTracks = [...sessionTracks, ...trendingTracks];
        const uniqueTracks = Array.from(
          new Map(allTracks.map((t) => [t.id, t])).values()
        );

        // Pega só as 3 primeiras para pré-carregamento suave
        const toWarm = uniqueTracks.slice(0, 3);

        console.log(`[WarmCache] Aquecendo ${toWarm.length} faixas selecionadas...`);

        // Cria uma instância do provider ou pega a referência global se já existir
        const provider = new YouTubeProvider();

        // 3. Pré-carrega uma por uma, com verificação de erro para não insistir se offline
        for (const track of toWarm) {
          try {
            await provider.preloadTrack(track);
          } catch {
            // Se falhou o primeiro, para o aquecimento para não congestionar a rede
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log('[WarmCache] Aquecimento de cache concluído com sucesso!');
      } catch (error) {
        console.error('[WarmCache] Erro geral no aquecimento de cache:', error);
      }
    };

    // Começa após 4 segundos (deixa a Home renderizar primeiro para não concorrer com UI)
    const timer = setTimeout(warm, 4000);

    return () => clearTimeout(timer);
  }, []);
}
