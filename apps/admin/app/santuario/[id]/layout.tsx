import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: journey } = await supabase
    .from('sanctuary_journeys')
    .select('title, description, cover_url')
    .eq('id', params.id)
    .single();

  if (!journey) {
    return {
      title: 'Jornada não encontrada | FéConecta',
    };
  }

  const title = `Jornada: ${journey.title}`;
  const description = journey.description || 'Uma jornada devocional no Lugar Secreto FéConecta.';
  const images = journey.cover_url ? [journey.cover_url] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: 'article',
      siteName: 'FéConecta',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    }
  };
}

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
