import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajuda e FAQ - FéConecta",
  description: "Tire suas dúvidas e obtenha suporte inteligente alimentado por Inteligência Artificial na FéConecta.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
