"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ShieldCheck, Upload, CreditCard, Check, AlertCircle, Globe, Copy, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const VERIFICATION_ROLES = [
  "Bispo", "Apóstolo", "Pastor", "Missionário", "Evangelista", 
  "Diácono", "Presbítero", "Líder", "Levita", "Igreja", "Membro"
];

export function VerificationModal({ isOpen, onClose, user, onRequested }: any) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [ministerialFile, setMinisterialFile] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);

  const isLeadershipRole = (role: string) => {
    const l = role.toLowerCase();
    return l.includes("bispo") || l.includes("postolo") || l.includes("pastor") || l.includes("missionário") || l.includes("missionario");
  };

  const isChurchRole = (role: string) => {
    return role.toLowerCase() === "igreja";
  };

  const PLAN_PRICES: Record<string, string> = {
    "Bispo": "9,99",
    "Apóstolo": "9,99",
    "Pastor": "9,99",
    "Missionário": "9,99",
    "Igreja": "14,99",
    "Evangelista": "6,99",
    "Diácono": "6,99",
    "Presbítero": "6,99",
    "Líder": "6,99",
    "Levita": "3,99",
    "Membro": "3,99"
  };

  const getRolePrice = (role: string) => {
    return PLAN_PRICES[role] || "6,99";
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      const checkRequest = async () => {
        const { data } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setExistingRequest(data);
          if (data.payment_status === 'paid' && !data.document_url) {
            setStep(3);
            setSelectedRole(data.requested_role);
          }
        } else {
          setStep(1);
        }
      };
      checkRequest();
    }
  }, [isOpen, user?.id]);

  const handleRefund = async () => {
    if (!existingRequest) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ status: 'refunded', payment_status: 'refunded' })
        .eq('id', existingRequest.id);
      if (error) throw error;
      toast.success("Reembolso processado com sucesso!");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao processar reembolso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!idFile) { toast.error("Por favor, anexe seu RG ou CNH."); return; }
    if (isLeadershipRole(selectedRole) && !ministerialFile) { toast.error("Por favor, anexe sua credencial ministerial."); return; }
    if (isChurchRole(selectedRole) && !ministerialFile) { toast.error("Por favor, anexe o documento da Igreja."); return; }
    if (!paymentProof) { toast.error("Por favor, anexe o comprovante do PIX."); return; }

    setLoading(true);
    try {
      // 1. Upload ID
      const idFileName = `id_${user.id}_${Date.now()}.${idFile.name.split('.').pop()}`;
      const { data: idData, error: idError } = await supabase.storage.from('verifications').upload(idFileName, idFile);
      if (idError) throw idError;
      const { data: { publicUrl: idUrl } } = supabase.storage.from('verifications').getPublicUrl(idData.path);

      // 2. Upload Credencial
      let ministerialUrl = null;
      if (ministerialFile) {
        const minFileName = `min_${user.id}_${Date.now()}.${ministerialFile.name.split('.').pop()}`;
        const { data: minData, error: minError } = await supabase.storage.from('verifications').upload(minFileName, ministerialFile);
        if (minError) throw minError;
        const { data: { publicUrl } } = supabase.storage.from('verifications').getPublicUrl(minData.path);
        ministerialUrl = publicUrl;
      }

      // 3. Upload PIX
      const pixFileName = `pix_${user.id}_${Date.now()}.${paymentProof.name.split('.').pop()}`;
      const { data: pixData, error: pixError } = await supabase.storage.from('verifications').upload(pixFileName, paymentProof);
      if (pixError) throw pixError;
      const { data: { publicUrl: pixUrl } } = supabase.storage.from('verifications').getPublicUrl(pixData.path);

      // 4. Update Database
      if (existingRequest) {
        await supabase.from('verification_requests').update({
          document_url: ministerialUrl || idUrl,
          secondary_document_url: idUrl,
          payment_receipt_url: pixUrl,
          status: 'pending'
        }).eq('id', existingRequest.id);
      } else {
        await supabase.from('verification_requests').insert({
          user_id: user.id,
          requested_role: selectedRole,
          document_url: ministerialUrl || idUrl,
          secondary_document_url: ministerialUrl ? idUrl : null,
          payment_receipt_url: pixUrl,
          status: 'pending',
          payment_status: 'paid'
        });
      }

      toast.success("Documentos enviados com sucesso!");
      onRequested?.();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#0f0f0f] rounded-[32px] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-whatsapp-teal" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">Verificação Premium</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Selo de Autenticidade FéConecta</p>
                  </div>
               </div>
               <DialogPrimitive.Close className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 dark:text-gray-400" />
               </DialogPrimitive.Close>
            </div>

            {existingRequest && step === 1 && existingRequest.status !== 'refunded' && (
              <div className="mb-6 bg-white dark:bg-black p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 uppercase font-black">Status: </span>
                    <span className={cn(
                      "font-bold uppercase tracking-widest px-2 py-0.5 rounded text-[9px]",
                      existingRequest.status === 'pending' ? "bg-orange-500/10 text-orange-500" :
                      existingRequest.status === 'approved' ? "bg-whatsapp-green/10 text-whatsapp-green" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {existingRequest.status === 'pending' ? 'Em Análise' : 
                       existingRequest.status === 'approved' ? 'Aprovado' : 
                       existingRequest.status === 'rejected' ? 'Solicitação Recusada' : 'Cancelado'}
                    </span>
                  </div>
                  {existingRequest.status === 'approved' && new Date().getTime() - new Date(existingRequest.created_at).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                    <button onClick={handleRefund} className="text-red-500 font-bold uppercase hover:underline text-[9px]">Solicitar Reembolso</button>
                  )}
                  {existingRequest.status === 'rejected' && (
                    <p className="text-[9px] text-gray-500 font-medium">Tente novamente abaixo</p>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Selecione seu Cargo</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto no-scrollbar pr-1">
                       {VERIFICATION_ROLES.map(role => (
                         <button
                           key={role}
                           onClick={() => setSelectedRole(role)}
                           className={cn(
                             "px-4 py-3 rounded-xl text-sm font-bold border transition-all truncate",
                             selectedRole === role 
                               ? "bg-whatsapp-teal text-white border-whatsapp-teal" 
                               : "bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/5"
                           )}
                         >
                           {role}
                         </button>
                       ))}
                    </div>
                 </div>
                 <button 
                   disabled={!selectedRole || (existingRequest && (existingRequest.status === 'pending' || existingRequest.status === 'approved'))}
                   onClick={() => setStep(2)}
                   className="w-full py-4 bg-whatsapp-teal text-white rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-50"
                 >
                   Continuar para Pagamento (R$ {getRolePrice(selectedRole)})
                 </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-center">
                 <div className="w-16 h-16 rounded-3xl bg-whatsapp-green/10 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-whatsapp-green" />
                 </div>
                 <h3 className="font-bold dark:text-white text-lg">Pagamento via PIX</h3>
                 <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                    <div className="bg-white dark:bg-white/5 px-4 py-3 rounded-xl flex items-center justify-between border border-gray-100 dark:border-white/10">
                       <span className="font-mono text-sm dark:text-whatsapp-green font-bold">42393094000156</span>
                       <button onClick={() => { navigator.clipboard.writeText("42393094000156"); toast.success("Copiado!"); }} className="p-2 hover:bg-whatsapp-green/10 rounded-lg transition-all text-gray-400">
                          <Copy className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-sm font-bold dark:text-white">Valor: R$ {getRolePrice(selectedRole)}</p>
                 </div>

                 <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-start gap-3 text-left">
                    <Smartphone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mb-1">Dica de Verificação</p>
                       <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Após fazer o pagamento, envie o print do comprovante para a verificação de identidade.</p>
                    </div>
                 </div>
                 <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Comprovante do PIX</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <p className="text-[9px] text-gray-400 font-bold uppercase px-4 text-center">{paymentProof ? paymentProof.name : "Anexar Comprovante"}</p>
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setPaymentProof(e.target.files[0])} />
                    </label>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-bold text-sm uppercase tracking-widest">Voltar</button>
                    <button disabled={!paymentProof} onClick={() => setStep(3)} className="flex-[2] py-4 bg-whatsapp-teal text-white rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-50">Continuar</button>
                 </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                 <div className="flex items-center gap-4 bg-whatsapp-green/10 p-4 rounded-2xl border border-whatsapp-green/20">
                    <Check className="w-5 h-5 text-whatsapp-green" />
                    <div>
                      <h4 className="font-bold text-whatsapp-green text-sm">Comprovante Recebido!</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-black uppercase">Última etapa: Documentação</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">RG ou CNH</label>
                       <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <p className="text-[9px] text-gray-400 font-bold uppercase px-4 text-center">{idFile ? idFile.name : "Anexar ID"}</p>
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setIdFile(e.target.files[0])} />
                       </label>
                    </div>
                    {(isLeadershipRole(selectedRole) || isChurchRole(selectedRole)) && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal">
                          {isChurchRole(selectedRole) ? "CNPJ / Estatuto" : "Credencial Ministerial"}
                        </label>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-whatsapp-teal/20 dark:border-whatsapp-teal/10 rounded-2xl cursor-pointer hover:bg-whatsapp-teal/5">
                            {isChurchRole(selectedRole) ? <Globe className="w-5 h-5 text-red-500 mb-1" /> : <ShieldCheck className="w-5 h-5 text-whatsapp-teal mb-1" />}
                            <p className="text-[9px] font-bold uppercase px-4 text-center dark:text-gray-400">
                              {ministerialFile ? ministerialFile.name : "Anexar Documento"}
                            </p>
                            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setMinisterialFile(e.target.files[0])} />
                        </label>
                      </div>
                    )}
                 </div>
                 <button disabled={loading} onClick={handleSubmit} className="w-full py-4 bg-whatsapp-teal text-white rounded-2xl font-bold text-sm uppercase tracking-widest active:scale-95 disabled:opacity-50">
                    {loading ? "Processando..." : "Finalizar Verificação"}
                 </button>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-white/5 p-4 flex items-center gap-3 border-t border-gray-100 dark:border-white/5">
             <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
             <p className="text-[10px] text-gray-400 font-medium leading-tight">Suas informações são protegidas e criptografadas.</p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
