import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar Conta - FéConecta",
  description: "Crie sua conta na FéConecta, a maior rede social Cristã.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
