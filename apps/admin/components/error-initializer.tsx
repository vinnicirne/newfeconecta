"use client";

import { useEffect } from "react";
import { ErrorMonitor } from "@/lib/error-monitor";

export function ErrorInitializer() {
  useEffect(() => {
    ErrorMonitor.initGlobalListeners();
  }, []);

  return null;
}
