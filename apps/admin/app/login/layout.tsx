import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar - FéConecta",
  description: "Faça login na sua conta da FéConecta, a rede social Cristã.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
