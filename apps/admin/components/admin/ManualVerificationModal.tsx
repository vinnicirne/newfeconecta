"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ShieldCheck, Search, SearchSlash, UserCircle2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { VerificationBadge } from "@/components/verification-badge";

const VERIFICATION_ROLES = [
  "Bispo", "Apóstolo", "Pastor", "Missionário", "Evangelista", 
  "Diácono", "Presbítero", "Líder", "Levita", "Igreja", "Membro"
];

export function ManualVerificationModal({ isOpen, onClose, onVerified, initialUser }: any) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(initialUser || null);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialUser && isOpen) {
      setSelectedUser(initialUser);
      setSelectedRole(initialUser.verification_label || "");
    }
  }, [initialUser, isOpen]);

  // Sincronizar role quando um usuário é selecionado via busca
  useEffect(() => {
    if (selectedUser && !initialUser) {
      setSelectedRole(selectedUser.verification_label || "");
    }
  }, [selectedUser]);

  useEffect(() => {
    if (search.length >= 3) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [search]);

  const handleSearch = async () => {
    const cleanSearch = search.trim().startsWith('@') 
      ? search.trim().substring(1) 
      : search.trim();

    if (!cleanSearch) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_verified, verification_label')
        .or(`full_name.ilike.%${cleanSearch}%,username.ilike.%${cleanSearch}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar usuários");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Selecione um usuário e um cargo.");
      return;
    }

    setLoading(true);
    try {
      // 1. Atualizar o perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          verification_label: selectedRole 
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // 2. Sincronizar com o Dashboard Admin (Liquidar todas as pendências)
      await supabase
        .from('verification_requests')
        .update({ 
           status: 'approved',
           requested_role: selectedRole
        })
        .eq('user_id', selectedUser.id)
        .eq('status', 'pending');

      // 3. Garantir que exista ao menos UM registro de aprovação
      const { data: hasRecord } = await supabase
        .from('verification_requests')
        .select('id')
        .eq('user_id', selectedUser.id)
        .eq('status', 'approved')
        .limit(1);

      if (!hasRecord || hasRecord.length === 0) {
        await supabase.from('verification_requests').insert({
          user_id: selectedUser.id,
          requested_role: selectedRole,
          status: 'approved',
          document_url: 'manual_verification'
        });
      }

      toast.success(`Usuário @${selectedUser.username} verificado manualmente como ${selectedRole}!`);
      onVerified?.();
      onClose();
      // Reset
      setSelectedUser(null);
      setSelectedRole("");
      setSearch("");
    } catch (err: any) {
      toast.error("Erro ao verificar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVerification = async () => {
    if (!selectedUser) return;

    toast("Remover Verificação?", {
      description: `Deseja realmente retirar o selo de @${selectedUser.username}?`,
      action: {
        label: "Confirmar",
        onClick: async () => {
          setLoading(true);
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ 
                is_verified: false, 
                verification_label: null 
              })
              .eq('id', selectedUser.id);

            if (error) throw error;

            // Liquidar pedidos aprovados ao desativar selo
            await supabase
              .from('verification_requests')
              .update({ status: 'rejected' })
              .eq('user_id', selectedUser.id);
            
            toast.success("Selo removido com sucesso!");
            onVerified?.();
            onClose();
            // Reset
            setSelectedUser(null);
            setSelectedRole("");
            setSearch("");
          } catch (err: any) {
            toast.error("Erro ao remover selo: " + err.message);
          } finally {
            setLoading(false);
          }
        }
      }
    });
  };

  const getPrice = (role: string) => {
    if (typeof window === 'undefined') return "0,00";
    const savedPrices = localStorage.getItem('feconecta_prices');
    if (savedPrices) {
      const prices = JSON.parse(savedPrices);
      return prices[role] || "6,99";
    }
    // Fallback minimalista se não houver configs
    const l = role.toLowerCase();
    if (l.includes("bispo") || l.includes("postolo") || l.includes("pastor") || l.includes("missionário") || l.includes("missionario")) return "9,99";
    if (l.includes("igreja")) return "14,99";
    if (l.includes("evangelista") || l.includes("diácono") || l.includes("diacono") || l.includes("presbitero") || l.includes("líder") || l.includes("lider")) return "6,99";
    if (l.includes("levita") || l.includes("membro")) return "3,99";
    return "6,99";
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#0f0f0f] rounded-[32px] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">Verificação Direta</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ações Administrativas Internas</p>
                  </div>
               </div>
               <DialogPrimitive.Close className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 dark:text-gray-400" />
               </DialogPrimitive.Close>
            </div>

            <div className="space-y-6">
               {/* Search User */}
               {!selectedUser ? (
                 <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500">Buscar Usuário</label>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500" />
                       <input 
                         type="text" 
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         placeholder="Nome ou @username..."
                         className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none dark:text-white"
                       />
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                       {isSearching && <p className="text-center py-4 text-xs text-gray-400 animate-pulse">Buscando no rebanho...</p>}
                       {searchResults.map(user => (
                         <button 
                           key={user.id}
                           onClick={() => setSelectedUser(user)}
                           className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left group"
                         >
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
                                  {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : <UserCircle2 className="w-full h-full p-2 text-gray-400" />}
                               </div>
                               <div>
                                  <p className="text-sm font-bold dark:text-white">{user.full_name}</p>
                                  <p className="text-[10px] text-gray-500">@{user.username}</p>
                               </div>
                            </div>
                            {user.is_verified && <CheckCircle2 className="w-4 h-4 text-whatsapp-green" />}
                         </button>
                       ))}
                       {search.length >= 3 && searchResults.length === 0 && !isSearching && (
                         <div className="text-center py-8">
                            <SearchSlash className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Nenhum fiel encontrado com este nome.</p>
                         </div>
                       )}
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div className="flex items-center justify-between bg-orange-500/5 p-4 rounded-3xl border border-orange-500/20 relative overflow-hidden">
                       <div className="flex items-center gap-3 relative z-10">
                          <img src={selectedUser.avatar_url || "https://github.com/shadcn.png"} className="w-12 h-12 rounded-2xl border-2 border-orange-500/20" alt="" />
                          <div>
                             <p className="text-sm font-bold dark:text-white">{selectedUser.full_name}</p>
                             <p className="text-[10px] text-orange-500 font-black uppercase tracking-tighter">@{selectedUser.username}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => setSelectedUser(null)}
                         className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors relative z-10"
                       >
                         Alterar
                       </button>
                       <ShieldCheck className="absolute -right-4 -bottom-4 w-20 h-20 text-orange-500/10 rotate-12" />
                    </div>

                    <div className="space-y-3">
                       <label className="text-xs font-black uppercase tracking-widest text-gray-500">Atribuir Selo Pastoral</label>
                       <div className="grid grid-cols-2 gap-2">
                          {VERIFICATION_ROLES.map(role => (
                            <button
                              key={role}
                              onClick={() => setSelectedRole(role)}
                              className={cn(
                                "px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2",
                                selectedRole === role 
                                  ? "bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-500/20" 
                                  : "bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/5 hover:border-orange-500/30"
                              )}
                            >
                              <div className="flex flex-col items-start leading-tight">
                                <span className="text-xs font-bold">{role}</span>
                                <span className={cn(
                                  "text-[9px] font-black opacity-70",
                                  selectedRole === role ? "text-white" : "text-gray-400"
                                )}>R$ {getPrice(role)}</span>
                              </div>
                              <VerificationBadge role={role} size="xs" />
                            </button>
                          ))}
                       </div>
                    </div>

                     <div className="flex gap-3">
                        {selectedUser?.is_verified && (
                          <button 
                            onClick={handleRemoveVerification}
                            disabled={loading}
                            className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[20px] font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            Remover Selo
                          </button>
                        )}
                        <button 
                          disabled={!selectedRole || loading}
                          onClick={handleSubmit}
                          className={cn(
                            "py-4 bg-whatsapp-teal text-white rounded-[20px] font-bold text-sm uppercase tracking-widest shadow-2xl shadow-whatsapp-teal/20 active:scale-95 transition-all text-center",
                            selectedUser?.is_verified ? "flex-[1.5]" : "w-full"
                          )}
                        >
                          {loading ? "Processando..." : selectedUser?.is_verified ? "Atualizar Selo" : "Confirmar Verificação"}
                        </button>
                     </div>
                 </div>
               )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
