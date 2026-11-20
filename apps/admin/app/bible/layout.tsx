import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Bíblia Sagrada | FéConecta",
  description: "Leia, estude e ouça a Bíblia Sagrada online. Ferramentas de estudo com IA, planos de leitura e anotações.",
  keywords: ["Bíblia Online", "Ler Bíblia", "Bíblia Sagrada", "Estudo Bíblico", "FéConecta Bíblia", "Versículos"],
  openGraph: {
    title: "Bíblia Sagrada | FéConecta",
    description: "Leia, estude e ouça a Bíblia Sagrada online.",
    url: `${SITE_URL}/biblia`,
    images: [
      {
        url: "/icons/icon-512.png", // Sugestão no futuro: criar uma imagem de OG específica para a bíblia
        width: 512,
        height: 512,
        alt: "Bíblia Sagrada FéConecta",
      },
    ],
  },
  alternates: {
    canonical: `${SITE_URL}/biblia`,
  },
};

export default function BibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
