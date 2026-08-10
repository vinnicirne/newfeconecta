import { Metadata } from 'next';
import RootClient from './RootClient';

export const metadata: Metadata = {
  title: 'FéConecta | A Rede Social Cristã',
  description: 'A primeira rede social onde a sua fé é o centro do algoritmo. Conecte-se, estude a Palavra e propague o Reino.',
  openGraph: {
    title: 'FéConecta',
    description: 'A rede social que edifica. Junte-se a milhares de cristãos.',
    url: 'https://feconecta.com.br',
    siteName: 'FéConecta',
    images: [
      {
        url: 'https://feconecta.com.br/og-image.png',
        width: 1200,
        height: 630,
      }
    ],
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function Page() {
  return <RootClient />;
}
