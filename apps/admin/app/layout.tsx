import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import BottomNav from "@/components/feed/BottomNav";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { ErrorInitializer } from "@/components/error-initializer";
import { SWRProvider } from "@/components/swr-provider";
import { OnboardingModal } from "@/components/OnboardingModal";
import { MarketingOverlay } from "@/components/MarketingOverlay";
import { GoogleProvider } from "@/components/google-provider";
import MiniPlayer from "@/modules/femusic/presentation/components/MiniPlayer";
import dynamic from "next/dynamic";
import FullscreenPlayer from "@/modules/femusic/presentation/components/FullscreenPlayer";

const GlobalYouTubePlayer = dynamic(
  () => import("@/modules/femusic/presentation/components/GlobalYouTubePlayer"),
  { ssr: false }
);

export const metadata: Metadata = {
  metadataBase: new URL("https://newfeconecta.vercel.app"),
  title: "FéConecta | Um lugar de adoração",
  description: "Clamor e conexão com o Reino em um só lugar. A rede social Cristã.",
  keywords: ["FéConecta", "Rede Social Cristã", "Gospel", "Cristão", "Igreja", "Comunidade Cristã"],
  authors: [{ name: "FéConecta", url: "https://newfeconecta.vercel.app" }],
  publisher: "FéConecta",
  robots: "index, follow",
  alternates: {
    canonical: "https://newfeconecta.vercel.app",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FéConecta",
  },
  openGraph: {
    title: "FéConecta | Um lugar de adoração",
    description: "Clamor e conexão com o Reino em um só lugar. A rede social Cristã.",
    url: "https://newfeconecta.vercel.app",
    siteName: "FéConecta",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Logotipo FéConecta",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FéConecta | Um lugar de adoração",
    description: "Clamor e conexão com o Reino em um só lugar. A rede social Cristã.",
    images: ["/icons/icon-512.png"],
  },
};

export const viewport = {
  themeColor: "#3fff8b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      <body className="antialiased font-sans bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300" style={{ fontFamily: "'Poppins', sans-serif" }} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "name": "FéConecta",
                  "url": "https://newfeconecta.vercel.app",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://newfeconecta.vercel.app/explore?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "SoftwareApplication",
                  "name": "FéConecta",
                  "applicationCategory": "SocialNetworkingApplication",
                  "operatingSystem": "Web, iOS, Android",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "BRL"
                  }
                }
              ]
            })
          }}
        />
        <ErrorInitializer />
        <GoogleProvider>
          <SWRProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <AuthGuard>
                <MarketingOverlay />
                {children}
                <GlobalYouTubePlayer />
                <BottomNav />
                <MiniPlayer />
                <OnboardingModal />
                <FullscreenPlayer />
              </AuthGuard>
              <Toaster richColors position="top-center" />
            </ThemeProvider>
          </SWRProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
