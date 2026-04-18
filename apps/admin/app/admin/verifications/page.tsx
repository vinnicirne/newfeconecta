"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ShieldCheck, Check, X, Eye, RefreshCw, Clock, AlertCircle, ExternalLink, Plus, ShieldOff, Settings2, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import { toast } from "sonner";
import { VerificationBadge } from "@/components/verification-badge";
import { DigitalCredentialModal } from "@/components/admin/DigitalCredentialModal";
import { ManualVerificationModal } from "@/components/admin/ManualVerificationModal";

export default function VerificationsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedVerifyUser, setSelectedVerifyUser] = useState<any | null>(null);
  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [credentialUser, setCredentialUser] = useState<any | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    activeVerified: 0,
    totalProcessed: 0
  });

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: pendingCount } = await supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: activeCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true);
      const { count: totalLogs } = await supabase.from('verification_requests').select('*', { count: 'exact', head: true });
      
      setStats({
        pending: pendingCount || 0,
        activeVerified: activeCount || 0,
        totalProcessed: totalLogs || 0
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*, profiles(full_name, username, avatar_url, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (request: any, status: 'approved' | 'rejected') => {
    try {
      // 1. Atualizar status da solicitação
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({ status })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // 2. Se aprovado, atualizar perfil do usuário
      if (status === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            is_verified: true, 
            verification_label: request.requested_role 
          })
          .eq('id', request.user_id);

        if (profileError) throw profileError;
        toast.success(`Usuário @${request.profiles?.username || 'desconhecido'} verificado como ${request.requested_role || 'Membro'}!`);
      } else {
        toast.error(`Solicitação de @${request.profiles?.username || 'desconhecido'} recusada.`);
      }

      fetchRequests();
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao processar: " + err.message);
    }
  };

  const handleRevokeVerification = async (request: any) => {
    toast("Revogar Verificação?", {
      description: `Remover selo de @${request.profiles?.username}?`,
      action: {
        label: "Confirmar",
        onClick: async () => {
          try {
            // 1. Resetar perfil
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ is_verified: false, verification_label: null })
              .eq('id', request.user_id);

            if (profileError) throw profileError;

            // 2. Marcar solicitação como rejeitada ou cancelada
            await supabase
              .from('verification_requests')
              .update({ status: 'rejected' })
              .eq('id', request.id);

            toast.success("Selo removido com sucesso!");
            fetchRequests();
            fetchStats();
          } catch (err: any) {
            toast.error("Erro ao remover selo: " + err.message);
          }
        }
      }
    });
  };

  const handleDeleteRequest = async (request: any) => {
    toast("Excluir Solicitação?", {
      description: `Isso permitirá que @${request.profiles?.username} envie uma nova solicitação do zero.`,
      action: {
        label: "Confirmar",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from('verification_requests')
              .delete()
              .eq('id', request.id);

            if (error) throw error;
            toast.success("Solicitação excluída! Usuário liberado para tentar novamente.");
            fetchRequests();
            fetchStats();
          } catch (err: any) {
            toast.error("Erro ao excluir: " + err.message);
          }
        }
      }
    });
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Solicitações de Verificação" 
        description="Analise documentos e aprove selos de autenticidade para líderes e instituições."
      >
        <button 
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Verificar Manualmente
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Pendentes Hoje", value: stats.pending, icon: Clock, color: "text-orange-500" },
          { label: "Verificados Ativos", value: stats.activeVerified, icon: ShieldCheck, color: "text-whatsapp-green" },
          { label: "Logs de Auditoria", value: stats.totalProcessed, icon: RefreshCw, color: "text-blue-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <stat.icon className={cn("w-5 h-5 mb-3", stat.color)} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl font-bold dark:text-white mt-2">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo Solicitado</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold text-[10px] uppercase">Carregando solicitações...</td></tr>
            ) : requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={req.profiles?.avatar_url || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-bold dark:text-white">{req.profiles?.full_name}</p>
                      <p className="text-[10px] text-whatsapp-teal font-bold uppercase tracking-tighter">@{req.profiles?.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <VerificationBadge 
                      role={req.requested_role} 
                      size="sm" 
                      showLabel={true}
                      onClick={() => {
                        setCredentialUser({
                          ...req.profiles,
                          verification_label: req.requested_role,
                          created_at: req.created_at
                        });
                        setIsCredentialOpen(true);
                      }}
                    />
                </td>
                 <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {req.document_url && (
                        <a 
                          href={req.document_url} 
                          target="_blank" 
                          className="flex items-center gap-1.5 text-[10px] text-blue-500 hover:underline font-bold uppercase tracking-tight"
                        >
                          <Eye className="w-3 h-3" /> Ver Documento
                        </a>
                      )}
                      {req.secondary_document_url && (
                        <a 
                          href={req.secondary_document_url} 
                          target="_blank" 
                          className="flex items-center gap-1.5 text-[10px] text-orange-500 hover:underline font-bold uppercase tracking-tight"
                        >
                          <Eye className="w-3 h-3" /> Ver ID (RG/CNH)
                        </a>
                      )}
                      {req.payment_receipt_url && (
                        <a 
                          href={req.payment_receipt_url} 
                          target="_blank" 
                          className="flex items-center gap-1.5 text-[10px] text-whatsapp-green hover:underline font-bold uppercase tracking-tight"
                        >
                          <Eye className="w-3 h-3" /> Ver PIX (Pago)
                        </a>
                      )}
                      {!req.document_url && !req.secondary_document_url && !req.payment_receipt_url && (
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Sem anexo</span>
                      )}
                    </div>
                 </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {moment(req.created_at).fromNow()}
                </td>
                <td className="px-6 py-4 text-right">
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleAction(req, 'rejected')}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-500 transition-all border border-transparent hover:border-red-500/20"
                        title="Recusar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAction(req, 'approved')}
                        className="p-2 bg-whatsapp-teal text-white rounded-lg hover:bg-whatsapp-tealLight transition-all shadow-lg shadow-whatsapp-teal/20"
                        title="Aprovar Verificação"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        req.status === 'approved' ? "text-whatsapp-green" : "text-red-400"
                      )}>
                        {req.status === 'approved' ? "Aprovado" : "Recusado"}
                      </span>
                      {req.status === 'approved' && (
                        <>
                          <button
                            onClick={() => handleRevokeVerification(req)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                            title="Remover Selo (Revogar)"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVerifyUser({
                                id: req.user_id,
                                username: req.profiles.username,
                                full_name: req.profiles.full_name,
                                avatar_url: req.profiles.avatar_url,
                                verification_label: req.requested_role,
                                is_verified: true
                              });
                              setIsManualModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-orange-500 transition-all border border-transparent hover:border-orange-500/20"
                            title="Fazer Upgrade / Alterar Cargo"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {req.status === 'rejected' && (
                        <>
                          <button 
                            onClick={() => handleAction(req, 'approved')}
                            className="p-1.5 hover:bg-whatsapp-teal/10 rounded-lg text-gray-400 hover:text-whatsapp-teal transition-all border border-transparent hover:border-whatsapp-teal/20"
                            title="Reativar / Aprovar Agora"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedVerifyUser({
                                id: req.user_id,
                                username: req.profiles?.username,
                                full_name: req.profiles?.full_name,
                                avatar_url: req.profiles?.avatar_url,
                                verification_label: req.requested_role,
                                is_verified: false
                              });
                              setIsManualModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg text-gray-400 hover:text-orange-500 transition-all border border-transparent hover:border-orange-500/20"
                            title="Editar e Reativar"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteRequest(req)}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-all border border-transparent hover:border-blue-500/20"
                            title="Excluir Registro de Auditoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ManualVerificationModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setSelectedVerifyUser(null);
        }}
        onVerified={fetchRequests}
        initialUser={selectedVerifyUser}
      />

      <DigitalCredentialModal 
        isOpen={isCredentialOpen}
        onClose={() => setIsCredentialOpen(false)}
        user={credentialUser}
      />
    </div>
  );
}
