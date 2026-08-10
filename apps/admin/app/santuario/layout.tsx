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
      {/* Importando a Fonte Lora apenas para o contexto do Santuário */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      `}} />
      {children}
    </div>
  );
}
