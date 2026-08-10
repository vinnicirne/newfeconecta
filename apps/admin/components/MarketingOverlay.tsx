"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Megaphone, X, ArrowRight, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function MarketingOverlay() {
  const [banners, setBanners] = useState<any[]>([]);
  const [popups, setPopups] = useState<any[]>([]);
  const [closedPopups, setClosedPopups] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Load closed popups from local storage
    const stored = localStorage.getItem('closed_marketing_popups');
    if (stored) {
      setClosedPopups(JSON.parse(stored));
    }
    
    fetchCampaigns();
    
    // Set up realtime listener
    const channel = supabase.channel('public:marketing_campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_campaigns' }, () => {
        fetchCampaigns();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error("Error fetching campaigns:", error);
      return;
    }

    const currentApp = pathname.startsWith('/fenamoro') ? 'fenamoro' : 'feconecta';

    // Filter by active status and target app
    const activeCampaigns = (data || []).filter(c => c.target_app === 'ambos' || c.target_app === currentApp);

    setBanners(activeCampaigns.filter(c => c.type === 'banner'));
    
    // For popups, only keep the ones that haven't been closed by the user
    // We get the stored closed ones from local state (which synced from localStorage on mount)
    const localClosed = JSON.parse(localStorage.getItem('closed_marketing_popups') || '[]');
    setPopups(activeCampaigns.filter(c => c.type === 'popup' && !localClosed.includes(c.id)));
  };

  const handleClosePopup = (id: string) => {
    const newClosed = [...closedPopups, id];
    setClosedPopups(newClosed);
    localStorage.setItem('closed_marketing_popups', JSON.stringify(newClosed));
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const activePopup = popups.length > 0 ? popups[0] : null;

  return (
    <>
      {/* GLOBAL BANNERS (Top fixed) */}
      {banners.map((banner, idx) => (
        <div 
          key={banner.id} 
          className="bg-whatsapp-teal text-white w-full px-4 py-3 relative z-50 shadow-md flex items-center justify-center gap-3 overflow-hidden group"
        >
          {/* subtle moving gradient background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-white/10 to-emerald-600/0 translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
          
          <Megaphone className="w-4 h-4 shrink-0 animate-bounce" />
          <p className="text-sm font-semibold text-center z-10 max-w-4xl line-clamp-1">{banner.content}</p>
          
          {banner.link_url && (
            <a 
              href={banner.link_url} 
              target={banner.link_url.startsWith('http') ? '_blank' : '_self'}
              className="z-10 shrink-0 ml-2 bg-white/20 hover:bg-white text-white hover:text-whatsapp-teal transition-colors px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            >
              {banner.button_text || 'Acessar'} <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      ))}

      {/* POPUP MODAL */}
      <AnimatePresence>
        {activePopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => handleClosePopup(activePopup.id)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-whatsapp-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            >
              <button 
                onClick={() => handleClosePopup(activePopup.id)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {activePopup.image_url ? (
                <div className="w-full h-48 sm:h-56 bg-gray-100 dark:bg-black/20">
                  <img src={activePopup.image_url} alt="Campanha" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center p-6 text-center">
                   <Megaphone className="w-12 h-12 text-white/20 absolute -right-2 -bottom-2 rotate-[-15deg]" />
                   <h3 className="text-xl font-black text-white relative z-10">{activePopup.title}</h3>
                </div>
              )}

              <div className="p-6 flex flex-col items-center text-center">
                {activePopup.image_url && (
                  <h3 className="text-xl font-black dark:text-white mb-2">{activePopup.title}</h3>
                )}
                
                <p className="text-gray-500 dark:text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
                  {activePopup.content}
                </p>

                {activePopup.link_url && (
                  <a 
                    href={activePopup.link_url}
                    target={activePopup.link_url.startsWith('http') ? '_blank' : '_self'}
                    onClick={() => handleClosePopup(activePopup.id)}
                    className="w-full mt-6 bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white rounded-xl py-3.5 font-bold text-sm shadow-xl shadow-whatsapp-teal/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {activePopup.button_text || 'Saiba Mais'} 
                    {activePopup.link_url.startsWith('http') ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </a>
                )}
                
                <button 
                  onClick={() => handleClosePopup(activePopup.id)}
                  className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-wider"
                >
                  Não quero ver isso agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
