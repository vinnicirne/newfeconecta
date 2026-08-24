/**
 * Módulo Central de Gestão e Normalização do Cache de Perfil (FéConecta)
 * Garante que o perfil do usuário nunca se perca durante navegação,
 * revalidação ou mutações em qualquer parte do sistema.
 */

export interface CachedProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string | null;
  role?: string;
  city?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  accepted_terms?: boolean;
  is_verified?: boolean;
  verification_label?: string | null;
  [key: string]: any;
}

export const PROFILE_CACHE_KEY = 'fc_profile_cache';

/**
 * Lê e normaliza com resiliência total o perfil armazenado no localStorage.
 * Suporta tanto o formato plano { id, full_name, ... } quanto o formato encapsulado { data: { ... }, timestamp: ... }.
 */
export function getStoredProfile(): CachedProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed) return null;

    // Se estiver encapsulado em `data` (legado de algumas mutações SWR)
    let profile: any = parsed.data && typeof parsed.data === 'object' && parsed.data.id ? parsed.data : parsed;

    if (!profile || typeof profile !== 'object' || !profile.id) {
      return null;
    }

    return profile as CachedProfile;
  } catch (err) {
    console.warn('[ProfileCache] Erro ao ler cache de perfil:', err);
    return null;
  }
}

/**
 * Salva o perfil normalizado no localStorage e notifica a aplicação em tempo real.
 */
export function setStoredProfile(profile: any): CachedProfile | null {
  if (typeof window === 'undefined' || !profile) return null;
  try {
    // Normaliza se veio encapsulado
    const normalized: CachedProfile = profile.data && typeof profile.data === 'object' && profile.data.id
      ? profile.data
      : profile;

    if (!normalized.id) return null;

    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(normalized));

    // Notifica todos os componentes ativos na mesma aba
    window.dispatchEvent(new CustomEvent('profile-hydrated', { detail: normalized }));

    return normalized;
  } catch (err) {
    console.error('[ProfileCache] Erro ao salvar cache de perfil:', err);
    return null;
  }
}

/**
 * Limpa o perfil do armazenamento local.
 */
export function clearStoredProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch (err) {
    console.warn('[ProfileCache] Erro ao limpar cache:', err);
  }
}
