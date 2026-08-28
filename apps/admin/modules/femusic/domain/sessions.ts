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

// Sessões prontas com catálogo semente de louvores reais + busca dinâmica no YouTube
export const READY_SESSIONS: ReadySession[] = [
  {
    id: 'adoracao-30',
    title: 'Adoração 30 min',
    description: 'Um tempo de intimidade e entrega ao Senhor',
    emoji: '🙏',
    color: 'from-purple-600 to-indigo-700',
    durationLabel: '30 min',
    queries: [
      'Gabriela Rocha Lugar Secreto',
      'Morada louvor ao vivo oficial',
      'Fernandinho adoração',
      'Casa Worship A Casa É Sua',
      'Diante do Trono adoração ao vivo',
    ],
    curatedTracks: [
      {
        id: 'y3x9B92p10w',
        title: 'Lugar Secreto',
        artist: 'Gabriela Rocha',
        duration: 320,
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
        provider: 'youtube',
        providerTrackId: 'y3x9B92p10w',
      },
      {
        id: 'v4m3X89fL10',
        title: 'A Casa É Sua',
        artist: 'Casa Worship',
        duration: 480,
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        provider: 'youtube',
        providerTrackId: 'v4m3X89fL10',
      },
      {
        id: 'p7k9N21w8L0',
        title: 'Para Que Entre o Rei',
        artist: 'Morada',
        duration: 410,
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        provider: 'youtube',
        providerTrackId: 'p7k9N21w8L0',
      }
    ],
  },
  {
    id: 'guerra-espiritual',
    title: 'Guerra Espiritual',
    description: 'Músicas de autoridade, vitória e louvor congregacional',
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
    curatedTracks: [
      {
        id: 'g8H2k91LmP0',
        title: 'O Hino',
        artist: 'Fernandinho',
        duration: 360,
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
        provider: 'youtube',
        providerTrackId: 'g8H2k91LmP0',
      },
      {
        id: 'w4M9N10fL77',
        title: 'Advogado Fiel',
        artist: 'Bruna Karla',
        duration: 290,
        cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600',
        provider: 'youtube',
        providerTrackId: 'w4M9N10fL77',
      }
    ],
  },
  {
    id: 'madrugada',
    title: 'Madrugada com Deus',
    description: 'Para orar, meditar e buscar a Deus no silêncio',
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
    curatedTracks: [
      {
        id: 't9K2m10w8Lp',
        title: 'Pode Morar Aqui',
        artist: 'Theo Rubia',
        duration: 520,
        cover: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600',
        provider: 'youtube',
        providerTrackId: 't9K2m10w8Lp',
      },
      {
        id: 'n4X8p11fL22',
        title: 'Em Teus Braços',
        artist: 'Laura Souguellis',
        duration: 430,
        cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
        provider: 'youtube',
        providerTrackId: 'n4X8p11fL22',
      }
    ],
  },
  {
    id: 'gratidao',
    title: 'Gratidão',
    description: 'Louvores e cânticos de celebração e agradecimento',
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
    curatedTracks: [
      {
        id: 'i8L3k11w9Mp',
        title: 'Bondade de Deus',
        artist: 'Isadora Pompeo',
        duration: 310,
        cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
        provider: 'youtube',
        providerTrackId: 'i8L3k11w9Mp',
      },
      {
        id: 'a9K1m00w8Ff',
        title: 'Raridade',
        artist: 'Anderson Freire',
        duration: 285,
        cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
        provider: 'youtube',
        providerTrackId: 'a9K1m00w8Ff',
      }
    ],
  },
];
