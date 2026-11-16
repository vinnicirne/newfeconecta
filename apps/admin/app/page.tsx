import { Metadata } from 'next';
import RootClient from './RootClient';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'FéConecta | Rede Social Cristã, Bíblia e Conteúdos Gospel',
  description: 'Encontre mensagens cristãs, vídeos, música gospel, estudos bíblicos e uma comunidade para compartilhar a fé. Entre gratuitamente na FéConecta.',
  openGraph: {
    title: 'FéConecta',
    description: 'A rede social que edifica. Junte-se a milhares de cristãos.',
    url: SITE_URL,
    siteName: 'FéConecta',
    images: [
      {
        url: `${SITE_URL}/icons/icon-512.png`,
        width: 512,
        height: 512,
        alt: 'FéConecta, a rede social cristã',
      }
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  alternates: { canonical: SITE_URL },
};

export default function Page() {
  return <RootClient />;
}
