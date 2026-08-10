import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre Nós - FéConecta",
  description: "Conheça a história e a missão da FéConecta, a primeira rede social focada exclusivamente na edificação do Reino de Deus.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
