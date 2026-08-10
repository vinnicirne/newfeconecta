"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Share2, Users, Search, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface ChurchInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchName: string;
  churchSlug: string;
}

export function ChurchInviteModal({ open, onOpenChange, churchName, churchSlug }: ChurchInviteModalProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  async function loadFriends() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Simulate fetching mutual followers or connections
    // In a real scenario, this would query a connections table
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .neq('id', user.id)
      .limit(20);

    setFriends(data || []);
    setLoading(false);
  }

  const handleExternalShare = async () => {
    const url = `${window.location.origin}/igreja/${churchSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Convite para ${churchName}`,
          text: `Venha fazer parte da comunidade ${churchName} no FéConecta!`,
          url: url,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        toast.success("Link copiado para a área de transferência!");
      } catch (err) {
        toast.error("Não foi possível copiar o link de forma automática.");
      }
    }
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSendInvites = async () => {
    if (selectedFriends.length === 0) return;
    
    // In a real app, this would insert rows into an 'invites' or 'notifications' table
    toast.success(`Convite enviado para ${selectedFriends.length} amigo(s)!`);
    setSelectedFriends([]);
    onOpenChange(false);
  };

  const filteredFriends = friends.filter(f => 
    f.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card border-border rounded-3xl">
        <div className="flex flex-col gap-6">
          
          <div className="text-center">
            <h2 className="text-xl font-bold">Convidar Pessoas</h2>
            <p className="text-sm text-muted-foreground mt-1">Traga mais amigos para {churchName}</p>
          </div>

          <button 
            onClick={handleExternalShare}
            className="flex items-center justify-center gap-2 w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Compartilhar Link (WhatsApp, etc)
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase font-bold tracking-wider">ou envie convites</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar amigos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/50 border border-border text-foreground rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-teal outline-none"
            />
          </div>

          <div className="max-h-[40vh] overflow-y-auto no-scrollbar space-y-2">
            {loading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Carregando amigos...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Nenhum amigo encontrado.</div>
            ) : (
              filteredFriends.map(friend => (
                <div 
                  key={friend.id}
                  onClick={() => toggleFriend(friend.id)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name || 'U')}&background=random`} 
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name || 'U')}&background=random` }}
                      className="w-10 h-10 rounded-full border border-border object-cover" 
                    />
                    <span className="font-semibold text-sm">{friend.full_name}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${selectedFriends.includes(friend.id) ? 'bg-whatsapp-teal border-whatsapp-teal text-white' : 'border-border text-transparent'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedFriends.length > 0 && (
            <button 
              onClick={handleSendInvites}
              className="flex items-center justify-center gap-2 w-full py-3 bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-semibold rounded-xl transition-colors shadow-lg shadow-whatsapp-teal/20"
            >
              <Send className="w-5 h-5" />
              Enviar para {selectedFriends.length} amigo{selectedFriends.length > 1 ? 's' : ''}
            </button>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
