import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import BottomNav from "@/components/feed/BottomNav";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FéConecta Admin | Um lugar de adoração",
  description: "Painel administrativo centralizado para gestão da rede social FéConecta.",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --font-outfit: 'Outfit', sans-serif; }
          body { font-family: var(--font-outfit); }
        `}} />
      </head>
      <body className="antialiased font-sans" style={{ fontFamily: 'var(--font-outfit)' }} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <BottomNav />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
