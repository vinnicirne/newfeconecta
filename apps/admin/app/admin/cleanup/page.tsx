"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { supabase } from '@/lib/supabase';
import { Trash2, ShieldAlert, RefreshCw, HardDrive, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CleanupPage() {
  const [scanning, setScanning] = useState(false);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, size: 0 });

  const scanOrphans = async () => {
    setScanning(true);
    setOrphans([]);
    try {
      // 1. Buscar todas as mídias referenciadas no banco (Defensivo)
      const { data: posts } = await supabase.from('posts').select('*').limit(1000);
      const { data: profiles } = await supabase.from('profiles').select('*').limit(1000);
      
      const usedUrls = new Set();
      posts?.forEach(p => {
        if (p.media_url) usedUrls.add(p.media_url);
        if (p.thumbnail_url) usedUrls.add(p.thumbnail_url);
      });
      profiles?.forEach(p => {
        if (p.avatar_url) usedUrls.add(p.avatar_url);
        if (p.banner_url) usedUrls.add(p.banner_url);
      });

      // 2. Listar arquivos no Storage (Exemplo bucket 'posts')
      const { data: files, error } = await supabase.storage.from('posts').list('', { limit: 1000 });
      if (error) throw error;

      const orphanList: any[] = [];
      let totalSize = 0;

      files?.forEach(file => {
        // Verifica se o nome do arquivo está em alguma URL usada
        const isUsed = Array.from(usedUrls).some((url: any) => url.includes(file.name));
        if (!isUsed && file.name !== '.emptyFolderPlaceholder') {
          orphanList.push(file);
          totalSize += file.metadata?.size || 0;
        }
      });

      setOrphans(orphanList);
      setStats({ total: orphanList.length, size: totalSize });
      toast.success(`Scan concluído! Encontrados ${orphanList.length} arquivos órfãos.`);
    } catch (err: any) {
      toast.error("Erro no scan: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  const deleteFile = async (name: string) => {
    try {
      const { error } = await supabase.storage.from('posts').remove([name]);
      if (error) throw error;
      setOrphans(prev => prev.filter(f => f.name !== name));
      toast.success("Arquivo removido do Storage");
    } catch (err: any) {
      toast.error("Falha ao deletar: " + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <PageHeader 
        title="Faxina Nuclear" 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
             <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Arquivos Órfãos</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
             <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Espaço Desperdiçado</p>
            <p className="text-2xl font-black">{formatSize(stats.size)}</p>
          </div>
        </div>

        <button 
          onClick={scanOrphans}
          disabled={scanning}
          className="bg-whatsapp-teal text-white rounded-[32px] p-6 flex items-center justify-center gap-3 font-black hover:bg-whatsapp-tealLight transition-all active:scale-95 disabled:opacity-50"
        >
          {scanning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
          {scanning ? "Escanendo..." : "Iniciar Scan"}
        </button>
      </div>

      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-black flex items-center gap-2">
             <Trash2 className="w-5 h-5 text-red-500" /> Lista de Descarte
          </h3>
          {orphans.length > 0 && (
            <p className="text-xs text-gray-500 font-bold">Mostrando arquivos do bucket 'posts'</p>
          )}
        </div>

        <div className="divide-y divide-white/5">
          {orphans.length > 0 ? (
            orphans.map((file) => (
              <div key={file.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center text-[10px] text-gray-500 font-mono">
                      {file.name.split('.').pop()?.toUpperCase()}
                   </div>
                   <div>
                      <p className="text-sm font-bold truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] text-gray-500">{formatSize(file.metadata?.size || 0)} • {new Date(file.created_at).toLocaleDateString()}</p>
                   </div>
                </div>
                <button 
                  onClick={() => deleteFile(file.name)}
                  className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
               <CheckCircle2 className="w-12 h-12 text-whatsapp-green mx-auto mb-4 opacity-20" />
               <p className="text-sm text-gray-500 font-bold">Nenhum lixo encontrado por enquanto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
