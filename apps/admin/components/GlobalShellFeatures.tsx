"use client";

import React from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import BottomNav from "@/components/feed/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { MarketingOverlay } from "@/components/MarketingOverlay";
import MiniPlayer from "@/modules/femusic/presentation/components/MiniPlayer";
import FullscreenPlayer from "@/modules/femusic/presentation/components/FullscreenPlayer";

const GlobalYouTubePlayer = dynamic(
  () => import("@/modules/femusic/presentation/components/GlobalYouTubePlayer"),
  { ssr: false }
);

export function GlobalShellFeatures() {
  const pathname = usePathname();

  // Em páginas administrativas ou de configuração, não carregar players e overlays de feed
  const isAdminRoute = 
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/documentacao") ||
    pathname.startsWith("/monetizacao") ||
    pathname.startsWith("/valores") ||
    pathname.startsWith("/recursos-pro") ||
    pathname.startsWith("/monitoramento") ||
    pathname.startsWith("/paginas") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/doc");

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <MarketingOverlay />
      <GlobalYouTubePlayer />
      <BottomNav />
      <MiniPlayer />
      <OnboardingModal />
      <FullscreenPlayer />
    </>
  );
}
