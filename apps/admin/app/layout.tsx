import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { ErrorInitializer } from "@/components/error-initializer";
import { SWRProvider } from "@/components/swr-provider";
import { GoogleProvider } from "@/components/google-provider";
import { PresenceTracker } from "@/components/presence-tracker";
import { GlobalShellFeatures } from "@/components/GlobalShellFeatures";

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
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('unhandledrejection', function(event) {
                var reason = event.reason || {};
                var msg = String(reason.message || reason || '');
                var stack = String(reason.stack || '');
                if (stack.indexOf('chrome-extension://') !== -1 || msg.indexOf('M_ID') !== -1 || stack.indexOf('moz-extension://') !== -1) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  return true;
                }
              }, true);
              window.addEventListener('error', function(event) {
                var filename = String(event.filename || '');
                var msg = String(event.message || '');
                var stack = String((event.error && event.error.stack) || '');
                if (filename.indexOf('chrome-extension://') !== -1 || msg.indexOf('M_ID') !== -1 || stack.indexOf('chrome-extension://') !== -1 || filename.indexOf('moz-extension://') !== -1) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  return true;
                }
              }, true);
            `
          }}
        />
      </head>

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
                <PresenceTracker />
                <GlobalShellFeatures />
                {children}
              </AuthGuard>
              <Toaster richColors position="top-center" />
            </ThemeProvider>
          </SWRProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
