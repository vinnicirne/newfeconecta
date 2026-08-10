import { MusicTrack } from './entities/MusicTrack';

export interface ContinueSession {
  id: string;                    // id da sessão (ex: "madrugada" ou "custom")
  title: string;                 // "Madrugada com Deus" ou título da playlist
  emoji: string;
  tracks: MusicTrack[];          // fila completa
  currentTrackId: string;        // qual música estava tocando
  progress: number;              // progresso em ms
  updatedAt: number;             // timestamp
}

const STORAGE_KEY = 'fc_continue_listening_session';

/** Padrões de IDs fictícios que foram usados historicamente — devem ser descartados */
const FAKE_ID_PATTERNS = [
  '_Q2g8M3',
  '_q9g_W7c8',
  'Z_Q2g8M3',
  'z_Q2g8M3',
];

const isFakeId = (id: string) =>
  FAKE_ID_PATTERNS.some(pattern => id.includes(pattern));

/**
 * Remove automaticamente sessões salvas que contenham IDs fictícios de vídeo.
 * Deve ser chamado no startup do módulo de música.
 */
export function cleanupStaleSessions() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as ContinueSession;
    const hasFakeIds = data.tracks?.some(t =>
      isFakeId(t.id) || isFakeId(t.providerTrackId || '')
    );
    if (hasFakeIds) {
      console.warn('[FéMusic] Sessão com IDs inválidos detectada — limpando localStorage.');
      localStorage.removeItem(STORAGE_KEY);
      // Também limpa cache de áudio de IDs fictícios
      Object.keys(localStorage)
        .filter(k => k.startsWith('fc_audio_cache_') && isFakeId(k.replace('fc_audio_cache_', '')))
        .forEach(k => localStorage.removeItem(k));
    }
  } catch (_) {}
}

export function saveContinueSession(session: ContinueSession) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Erro ao salvar Continuar ouvindo:', err);
  }
}

export function getContinueSession(): ContinueSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as ContinueSession;

    // Expira depois de 7 dias
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.updatedAt > sevenDays) {
      clearContinueSession();
      return null;
    }

    // Descarta se tiver IDs fictícios
    if (data.tracks?.some(t => isFakeId(t.id) || isFakeId(t.providerTrackId || ''))) {
      clearContinueSession();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function clearContinueSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Atualiza o progresso e a música atual da sessão salva
 */
export function updateContinueProgress(
  currentTrackId: string,
  progress: number
) {
  const current = getContinueSession();
  if (!current) return;

  saveContinueSession({
    ...current,
    currentTrackId,
    progress: Math.max(0, Math.floor(progress)),
    updatedAt: Date.now(),
  });
}
