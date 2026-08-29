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
// IDs YouTube verificados via API em 29/08/2026
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
        id: 'YnrN0o0lubM',
        title: 'Lugar Secreto',
        artist: 'Gabriela Rocha',
        duration: 320,
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
        provider: 'youtube',
        providerTrackId: 'YnrN0o0lubM',
      },
      {
        id: '5QHF5OQeFOs',
        title: 'A Casa É Sua',
        artist: 'Casa Worship',
        duration: 480,
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        provider: 'youtube',
        providerTrackId: '5QHF5OQeFOs',
      },
      {
        id: '_DUSt0KGMsI',
        title: 'Para Que Entre o Rei',
        artist: 'Morada',
        duration: 410,
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        provider: 'youtube',
        providerTrackId: '_DUSt0KGMsI',
      },
      {
        id: 'bfJXu0Cm6Og',
        title: 'Santo Espírito',
        artist: 'Diante do Trono',
        duration: 360,
        cover: 'https://images.unsplash.com/photo-1445375011782-2384686778a0?w=600',
        provider: 'youtube',
        providerTrackId: 'bfJXu0Cm6Og',
      },
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
        id: 'hD_pasYr5qA',
        title: 'O Hino',
        artist: 'Fernandinho',
        duration: 360,
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
        provider: 'youtube',
        providerTrackId: 'hD_pasYr5qA',
      },
      {
        id: 'wyhJ157GF24',
        title: 'Advogado Fiel',
        artist: 'Bruna Karla',
        duration: 290,
        cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600',
        provider: 'youtube',
        providerTrackId: 'wyhJ157GF24',
      },
      {
        id: 'rer4YETV6q8',
        title: 'Aquieta Minh\'alma',
        artist: 'Ministério Zoe',
        duration: 320,
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        provider: 'youtube',
        providerTrackId: 'rer4YETV6q8',
      },
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
        id: 'n0fDvJAyrQ8',
        title: 'Pode Morar Aqui',
        artist: 'Theo Rubia',
        duration: 520,
        cover: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600',
        provider: 'youtube',
        providerTrackId: 'n0fDvJAyrQ8',
      },
      {
        id: 'IxpWNuxGmzc',
        title: 'Em Teus Braços',
        artist: 'Laura Souguellis',
        duration: 430,
        cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
        provider: 'youtube',
        providerTrackId: 'IxpWNuxGmzc',
      },
      {
        id: 'mscE0wOMDBA',
        title: 'Gratidão',
        artist: 'Midian Lima',
        duration: 380,
        cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
        provider: 'youtube',
        providerTrackId: 'mscE0wOMDBA',
      },
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
        id: 'pAQeih7K5ZY',
        title: 'Bondade de Deus',
        artist: 'Isadora Pompeo',
        duration: 310,
        cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
        provider: 'youtube',
        providerTrackId: 'pAQeih7K5ZY',
      },
      {
        id: 'Tqdi6BZUWr4',
        title: 'Raridade',
        artist: 'Anderson Freire',
        duration: 285,
        cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
        provider: 'youtube',
        providerTrackId: 'Tqdi6BZUWr4',
      },
      {
        id: 'dc6oADkbQSw',
        title: 'Ressuscita-me',
        artist: 'Aline Barros',
        duration: 260,
        cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
        provider: 'youtube',
        providerTrackId: 'dc6oADkbQSw',
      },
    ],
  },
];
