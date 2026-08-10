import { MusicTrack } from './entities/MusicTrack';

export interface ReadySession {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  durationLabel: string;
  queries: string[];
  curatedTracks: MusicTrack[];
}

// Sessões prontas — tracks vêm 100% da busca dinâmica no YouTube
// (curatedTracks vazio: evita IDs fictícios que causam "vídeo indisponível")
export const READY_SESSIONS: ReadySession[] = [
  {
    id: 'adoracao-30',
    title: 'Adoração 30 min',
    description: 'Um tempo de intimidade e entrega',
    emoji: '🙏',
    color: 'from-purple-600 to-indigo-700',
    durationLabel: '30 min',
    queries: [
      'Gabriela Rocha Lugar Secreto',
      'Morada louvor ao vivo',
      'Fernandinho adoração',
      'hillsong worship em português',
      'diante do trono adoração ao vivo',
    ],
    curatedTracks: [],
  },
  {
    id: 'guerra-espiritual',
    title: 'Guerra Espiritual',
    description: 'Músicas de autoridade e vitória',
    emoji: '⚔️',
    color: 'from-red-700 to-orange-600',
    durationLabel: '40 min',
    queries: [
      'Fernandinho O Hino',
      'guerra espiritual gospel louvor',
      'Ministério Zoe louvor',
      'louvor de vitória autoridade',
      'Bruna Karla Advogado Fiel',
    ],
    curatedTracks: [],
  },
  {
    id: 'madrugada',
    title: 'Madrugada com Deus',
    description: 'Para orar e buscar no silêncio',
    emoji: '🌙',
    color: 'from-slate-700 to-blue-900',
    durationLabel: '1h',
    queries: [
      'Theo Rubia Pode Morar Aqui',
      'Nivea Soares louvor',
      'louvor madrugada gospel calmo',
      'Casa Worship ao vivo',
      'Laura Souguellis adoração',
    ],
    curatedTracks: [],
  },
  {
    id: 'gratidao',
    title: 'Gratidão',
    description: 'Músicas para agradecer',
    emoji: '✨',
    color: 'from-amber-500 to-yellow-600',
    durationLabel: '25 min',
    queries: [
      'Isadora Pompeo Bondade de Deus',
      'Midian Lima louvor gratidão',
      'Anderson Freire Raridade',
      'Aline Barros Ressuscita-me',
      'louvor gospel obrigado senhor',
    ],
    curatedTracks: [],
  },
];
