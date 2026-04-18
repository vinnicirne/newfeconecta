"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  ShieldAlert, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  UserX,
  Clock,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import moment from "moment";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    critical: 0,
    reviewCount: 0,
    resolvedToday: 0
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .ilike('error_message', '[DENÚNCIA]%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports(data || []);
      
      // Real Stats
      setStats({
        critical: (data || []).length,
        reviewCount: (data || []).length, // Por enquanto tratamos tudo como revisão
        resolvedToday: 0 // Mock de contagem de logs deletados seria complexo agora
      });
    } catch (err: any) {
      toast.error("Erro ao carregar denúncias: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeepPost = async (reportId: string) => {
    const toastId = toast.loading("Mantendo publicação...");
    try {
      const { error } = await supabase
        .from('system_errors')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success("Denúncia ignorada e limpa do log.", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao manter post: " + err.message, { id: toastId });
    }
  };

  const handleRemovePost = async (postId: string, reportId: string) => {
    if (!confirm("Confirmar a remoção permanente deste conteúdo?")) return;
    
    const toastId = toast.loading("Removendo post...");
    try {
      const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (postError) throw postError;

      // Limpa TODAS as denúncias desse post
      await supabase
        .from('system_errors')
        .delete()
        .eq('metadata->>post_id', postId);

      setReports(prev => prev.filter(r => r.metadata?.post_id !== postId));
      toast.success("Conteúdo removido e denúncias liquidadas.", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message, { id: toastId });
    }
  };

  const handleBanUser = async (username: string, reportId: string) => {
    toast.info(`Para banir @${username}, acesse a Gestão de Usuários.`);
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Moderação de Conteúdo" 
        description="Analise denúncias reais enviadas pelos fiéis em tempo real."
      >
        <button onClick={fetchReports} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
          <RefreshCw className={cn("w-4 h-4 text-gray-400", loading && "animate-spin")} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 dark:bg-red-500/10 p-5 rounded-[32px] border border-red-100 dark:border-red-500/20 whatsapp-shadow">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h4 className="font-bold text-red-700 dark:text-red-400 uppercase text-[10px] tracking-widest">Ações Críticas</h4>
          </div>
          <p className="text-3xl font-black text-red-700 dark:text-red-400">{stats.critical}</p>
          <p className="text-[10px] font-bold text-red-600/70 dark:text-red-400/50 uppercase">Denúncias Ativas no Sistema</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-500/10 p-5 rounded-[32px] border border-orange-100 dark:border-orange-500/20 whatsapp-shadow">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h4 className="font-bold text-orange-700 dark:text-orange-400 uppercase text-[10px] tracking-widest">Fila de Revisão</h4>
          </div>
          <p className="text-3xl font-black text-orange-700 dark:text-orange-400">{stats.reviewCount}</p>
          <p className="text-[10px] font-bold text-orange-600/70 dark:text-orange-400/50 uppercase">Aguardando Avaliação Humana</p>
        </div>
        <div className="bg-whatsapp-green/5 p-5 rounded-[32px] border border-whatsapp-green/10 whatsapp-shadow">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-whatsapp-green" />
            <h4 className="font-bold text-whatsapp-dark dark:text-whatsapp-green uppercase text-[10px] tracking-widest">Segurança da Rede</h4>
          </div>
          <p className="text-3xl font-black text-whatsapp-dark dark:text-whatsapp-green">Ativa</p>
          <p className="text-[10px] font-bold text-whatsapp-teal/70 dark:text-whatsapp-green/50 uppercase tracking-tighter">Filtros Antispam Operantes</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-4 animate-spin" />
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Escaneando logs de segurança...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-gray-100 dark:border-white/5">
          <CheckCircle className="w-12 h-12 text-whatsapp-green/20 mx-auto mb-4" />
          <h3 className="font-black dark:text-white uppercase text-sm tracking-widest">Nenhuma Denúncia Pendente</h3>
          <p className="text-gray-400 text-xs mt-2">A comunidade está servindo em paz.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border border-white/5 whatsapp-shadow flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[9px] font-black rounded-lg uppercase tracking-wider">
                    Denúncia #{report.id.substring(0, 8)}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-auto font-bold uppercase tracking-tight">
                    {moment(report.created_at).fromNow()}
                  </span>
                </div>
                <h4 className="font-black dark:text-white mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Conteúdo Inapropriado
                </h4>
                <div className="bg-gray-50 dark:bg-whatsapp-dark p-5 rounded-3xl border border-black/5 dark:border-white/5 relative group">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {report.metadata?.snippet || "Conteúdo não disponível para preview."}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-whatsapp-teal/10 flex items-center justify-center text-[10px] font-black text-whatsapp-teal border border-whatsapp-teal/20">
                        {report.metadata?.author?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-[10px] font-bold dark:text-gray-300">Post de: <span className="text-whatsapp-teal dark:text-whatsapp-green">@{report.metadata?.author || 'desconhecido'}</span></span>
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase">ID: {report.metadata?.post_id?.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex md:flex-col gap-2 justify-center min-w-[200px]">
                <button 
                  onClick={() => handleKeepPost(report.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-whatsapp-green/20 text-whatsapp-green rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-whatsapp-green/30 transition-all border border-whatsapp-green/10"
                >
                  <CheckCircle className="w-4 h-4" /> Manter Post
                </button>
                <button 
                  onClick={() => handleRemovePost(report.metadata?.post_id, report.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 border border-transparent"
                >
                  <Trash2 className="w-4 h-4" /> Remover Conteúdo
                </button>
                <button 
                   onClick={() => handleBanUser(report.metadata?.author, report.id)}
                   className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all border border-gray-200 dark:border-white/5"
                >
                  <UserX className="w-4 h-4" /> Banir Autor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
