"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  Calendar,
  ShieldCheck,
  Users,
  Globe,
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  AtSign
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    username: "",
    birthdate: "",
    gender: "",
    phone: "",
    country: "Brasil",
    state: "",
    city: "",
    accepted_terms: false,
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/login");
          return;
        }
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          setCurrentUser(data);
          
          // Se já tem todos os campos, pode ir pra home
          if (data.city && data.phone && data.birthdate && data.accepted_terms) {
             router.replace("/");
             return;
          }

          setFormData(prev => ({
            ...prev,
            username: data.username || "",
            birthdate: data.birthdate || "",
            gender: data.gender || "",
            phone: data.phone || "",
            country: data.country || "Brasil",
            state: data.state || "",
            city: data.city || "",
            accepted_terms: data.accepted_terms || false,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar perfil:", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchProfile();
  }, [router]);

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  useEffect(() => {
    const checkUsername = async () => {
      const username = formData.username.trim();
      if (username === currentUser?.username) {
         setUsernameStatus('idle');
         return;
      }
      if (username.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Erro ao checar username:', error);
        setUsernameStatus('idle');
      } else if (data) {
        setUsernameStatus('taken');
      } else {
        setUsernameStatus('available');
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username, currentUser?.username]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.accepted_terms) errs.accepted_terms = "Você precisa aceitar os Termos de Uso";
    if (!formData.username.trim()) errs.username = "Nome de usuário é obrigatório";
    else if (usernameStatus === 'taken') errs.username = "Este nome de usuário já está em uso";
    else if (usernameStatus === 'checking') errs.username = "Verificando disponibilidade...";
    if (!formData.birthdate) errs.birthdate = "Data de nascimento é obrigatória";
    if (!formData.gender) errs.gender = "Selecione o gênero";
    if (!formData.country.trim()) errs.country = "País é obrigatório";
    if (!formData.state.trim()) errs.state = "Estado é obrigatório";
    if (!formData.city.trim()) errs.city = "Cidade é obrigatória";
    if (!formData.phone.trim()) errs.phone = "Telefone é obrigatório";
    else if (formData.phone.length < 14) errs.phone = "Telefone inválido";
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setLoading(true);
    
    try {
      const ProfileSchema = z.object({
        username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
        gender: z.string().max(20),
        country: z.string().max(50),
        state: z.string().max(50),
        city: z.string().max(100),
        phone: z.string().max(20)
      });

      const updateData = {
        username: formData.username.toLowerCase().trim(),
        birthdate: formData.birthdate,
        gender: formData.gender,
        country: formData.country.trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        phone: formData.phone.trim(),
        accepted_terms: true,
        accepted_terms_at: currentUser?.accepted_terms_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      ProfileSchema.parse({
         username: updateData.username,
         gender: updateData.gender,
         country: updateData.country,
         state: updateData.state,
         city: updateData.city,
         phone: updateData.phone
      });

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq('id', currentUser.id);

      if (error) throw error;

      const firstName = updateData.username.split('_')[0] || currentUser.first_name || 'Usuário';
      fetch('/api/emails/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, name: firstName })
      }).catch(err => console.error("Erro ao disparar welcome email:", err));

      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      const updatedProfile = { ...currentUser, ...updateData };
      localStorage.setItem('fc_profile_cache', JSON.stringify(updatedProfile));
      window.dispatchEvent(new CustomEvent('profile-hydrated', { detail: updatedProfile }));

      toast.success("Perfil atualizado com sucesso!");
      router.push("/");
    } catch (err: any) {
      console.error("❌ Erro de Validação/Atualização:", err);
      if (err.name === 'ZodError') {
        toast.error(`Dados inválidos: ${err.errors[0].message}`);
      } else {
        toast.error(err.message || "Erro ao atualizar perfil.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
         <Loader2 className="w-8 h-8 text-whatsapp-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background w-full relative px-4 py-12">
      <div className="relative w-full max-w-md mx-auto flex flex-col shrink-0">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center mb-4 shadow-xl shadow-whatsapp-teal/20">
            <Flame className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Completar Perfil</h1>
          <p className="text-muted-foreground text-sm mt-2 text-center">Falta pouco para você acessar a comunidade FéConecta.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-[24px] p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Informações Pendentes
            </h3>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground ml-1">Nome de Usuário</label>
              <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                        updateField("username", e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                    }
                    className={cn(
                        "pl-10 pr-10",
                        errors.username && "border-red-500 focus-visible:ring-red-500",
                        usernameStatus === "available" && "border-green-500 focus-visible:ring-green-500"
                    )}
                    placeholder="nome_usuario"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-transparent z-20 pointer-events-none">
                  {usernameStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-whatsapp-teal animate-spin" />
                  )}
                  {usernameStatus === "available" && formData.username.length >= 3 && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 animate-in zoom-in duration-300" />
                  )}
                  {usernameStatus === "taken" && (
                      <XCircle className="w-4 h-4 text-red-500 animate-in zoom-in duration-300" />
                  )}
                  </div>
              </div>
              {errors.username && <p className="text-red-500 text-[11px] ml-1">{errors.username}</p>}
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground ml-1">Data de Nascimento</label>
              <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => updateField("birthdate", e.target.value)}
                    className={cn("pl-10", errors.birthdate && "border-red-500 focus-visible:ring-red-500")}
                  />
              </div>
              {errors.birthdate && <p className="text-red-500 text-[11px] ml-1">{errors.birthdate}</p>}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground ml-1">Telefone / WhatsApp</label>
              <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.slice(0, 11);
                        if (val.length > 2) val = `(${val.slice(0,2)}) ${val.slice(2)}`;
                        if (val.length > 9) val = `${val.slice(0,9)}-${val.slice(9)}`;
                        updateField("phone", val);
                    }}
                    className={cn("pl-10", errors.phone && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="(11) 99999-9999"
                  />
              </div>
              {errors.phone && <p className="text-red-500 text-[11px] ml-1">{errors.phone}</p>}
            </div>

            {/* Gênero */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground ml-1">Gênero</label>
              <div className="relative flex h-10 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-whatsapp-green/20 dark:border-white/10 dark:bg-whatsapp-dark dark:text-white">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className="w-full bg-transparent pl-8 outline-none appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
              </div>
              {errors.gender && <p className="text-red-500 text-[11px] ml-1">{errors.gender}</p>}
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-whatsapp-teal mb-4">Localização</h4>
              <div className="grid grid-cols-1 gap-4">
                  {/* País */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground ml-1">País</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                        <Input
                          type="text"
                          value={formData.country}
                          onChange={(e) => updateField("country", e.target.value)}
                          className={cn("pl-10", errors.country && "border-red-500")}
                          placeholder="Ex: Brasil"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Estado */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground ml-1">Estado</label>
                        <Input
                            type="text"
                            value={formData.state}
                            onChange={(e) => updateField("state", e.target.value)}
                            className={cn(errors.state && "border-red-500")}
                            placeholder="Ex: SP"
                        />
                        {errors.state && <p className="text-red-500 text-[11px] ml-1">{errors.state}</p>}
                    </div>

                    {/* Cidade */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground ml-1">Cidade</label>
                        <Input
                            type="text"
                            value={formData.city}
                            onChange={(e) => updateField("city", e.target.value)}
                            className={cn(errors.city && "border-red-500")}
                            placeholder="Sua cidade"
                        />
                        {errors.city && <p className="text-red-500 text-[11px] ml-1">{errors.city}</p>}
                    </div>
                  </div>
              </div>
            </div>

            {/* Termos de Uso */}
            <div className="pt-4 pb-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 flex-shrink-0">
                    <input
                        type="checkbox"
                        checked={formData.accepted_terms}
                        onChange={(e) => updateField("accepted_terms", e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-muted-foreground/30 peer-checked:bg-whatsapp-green peer-checked:border-whatsapp-green flex items-center justify-center transition-all group-hover:border-whatsapp-green/50">
                        {formData.accepted_terms && <ShieldCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">
                  Li e aceito os{" "}
                  <Link href="/terms" target="_blank" className="text-whatsapp-teal font-semibold hover:underline">
                      Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacy" target="_blank" className="text-whatsapp-teal font-semibold hover:underline">
                      Política de Privacidade
                  </Link>
                  </span>
              </label>
              {errors.accepted_terms && <p className="text-red-500 text-[11px] ml-1 mt-1">{errors.accepted_terms}</p>}
            </div>
            
            <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !formData.accepted_terms}
                className="w-full h-12 bg-gradient-to-r from-whatsapp-green to-whatsapp-tealLight hover:from-whatsapp-teal hover:to-whatsapp-teal text-white font-bold rounded-xl"
            >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                <>
                    <ShieldCheck className="w-5 h-5 mr-2" /> Concluir Cadastro
                </>
                )}
            </Button>
        </div>
      </div>
    </div>
  );
}
