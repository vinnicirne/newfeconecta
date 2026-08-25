"use client";

import React from "react";

interface TrustedSiteBadgeProps {
  className?: string;
  isCollapsed?: boolean;
}

export function TrustedSiteBadge({ className = "", isCollapsed = false }: TrustedSiteBadgeProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <a
        href="https://www.trustedsite.com/verify?host=newfeconecta.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        title="Site Verificado e Seguro por TrustedSite"
        className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-200 border ${
          isCollapsed
            ? "justify-center w-10 h-10 p-1 bg-white/5 border-white/10"
            : "w-full justify-center bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-black/5 dark:border-white/10 shadow-sm"
        }`}
      >
        <img
          src="https://cdn.ywxi.net/meter/newfeconecta.vercel.app/101.svg"
          alt="TrustedSite Certified Secure"
          className={isCollapsed ? "h-6 w-auto" : "h-7 w-auto object-contain"}
          onError={(e) => {
            // Fallback elegante caso a CDN do TrustedSite ainda esteja propagando
            const target = e.currentTarget;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent && !parent.querySelector(".fallback-badge")) {
              const fallback = document.createElement("div");
              fallback.className = "fallback-badge flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400";
              fallback.innerHTML = `
                <svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>TrustedSite Secure</span>
              `;
              parent.appendChild(fallback);
            }
          }}
        />
      </a>
    </div>
  );
}
