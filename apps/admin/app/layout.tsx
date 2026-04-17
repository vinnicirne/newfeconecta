import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import BottomNav from "@/components/feed/BottomNav";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { ErrorInitializer } from "@/components/error-initializer";

export const metadata: Metadata = {
  title: "FéConecta | Um lugar de adoração",
  description: "Clamor e conexão com o Reino em um só lugar.",
  manifest: "/manifest.json",
  themeColor: "#0e0e0e",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

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
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --font-outfit: 'Outfit', sans-serif; }
          body { font-family: var(--font-outfit); }
        `}} />
      </head>
      <body className="antialiased font-sans" style={{ fontFamily: 'var(--font-outfit)' }} suppressHydrationWarning>
        <ErrorInitializer />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthGuard>
            {children}
            <BottomNav />
          </AuthGuard>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
