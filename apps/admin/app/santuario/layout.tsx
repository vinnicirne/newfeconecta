import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lugar Secreto",
  description: "Trilhas de Estudo, Devocionais e Discipulado Guiado com líderes espirituais.",
};

export default function SantuarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}
