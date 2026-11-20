import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Bíblia Sagrada Online | Leia, Estude e Ouça | FéConecta",
  description:
    "Leia a Bíblia Sagrada online em várias versões. Pesquise versículos, ouça capítulos, faça anotações e compartilhe a Palavra no FéConecta.",
  keywords: [
    "Bíblia online",
    "Bíblia Sagrada",
    "ler a Bíblia online",
    "versículos bíblicos",
    "estudo bíblico",
    "Bíblia NVI",
  ],
  alternates: {
    canonical: `${SITE_URL}/biblia`,
  },
  openGraph: {
    title: "Bíblia Sagrada Online | FéConecta",
    description:
      "Leia, pesquise e ouça a Bíblia online. Estude versículos, faça anotações e compartilhe a Palavra.",
    url: `${SITE_URL}/biblia`,
    siteName: "FéConecta",
    type: "website",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Bíblia Sagrada Online no FéConecta",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Bíblia Sagrada Online | FéConecta",
    description:
      "Leia, pesquise e ouça a Bíblia online. Estude versículos e compartilhe a Palavra.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BibliaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
