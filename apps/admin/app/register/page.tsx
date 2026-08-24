"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  AtSign,
  Calendar,
  Church,
  ShieldCheck,
  ChevronLeft,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Smartphone
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { z } from "zod";
import { Metadata } from "next";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=dados pessoais, 2=conta, 3=termos
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    birthdate: "",
    church: "",
    password: "",
    confirm_password: "",
    gender: "",
    phone: "",
    country: "Brasil",
    state: "",
    city: "",
    accepted_terms: false,
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoogleLogin = async () => {
    if (!formData.accepted_terms) {
      toast.error("Você precisa aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }
    
    setLoading(true);
    try {
      // Pedir notificação antes
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Check if running in Capacitor native app
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
      const redirectUrl = isNative 
        ? 'feconecta://login-callback' 
        : `${window.location.origin}`;

      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar com Google.");
      setLoading(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Limpa o erro quando o campo é alterado
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Verificação de username em tempo real (Debounce)
  useEffect(() => {
    const checkUsername = async () => {
      const username = formData.username.trim();
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
  }, [formData.username]);

  // Verificação de email em tempo real
  useEffect(() => {
    const checkEmail = async () => {
      const email = formData.email.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailStatus('idle');
        return;
      }

      setEmailStatus('checking');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error('Erro ao checar email:', error);
          setEmailStatus('idle');
        } else if (data) {
          setEmailStatus('taken');
        } else {
          setEmailStatus('available');
        }
      } catch (err) {
        console.error('Erro na verificação de email:', err);
        setEmailStatus('idle');
      }
    };

    const timer = setTimeout(checkEmail, 800);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.accepted_terms) errs.accepted_terms = "Você precisa aceitar os Termos de Uso e Política de Privacidade";
    if (!formData.first_name.trim()) errs.first_name = "Nome é obrigatório";
    if (!formData.last_name.trim()) errs.last_name = "Sobrenome é obrigatório";
    if (!formData.username.trim()) errs.username = "Nome de usuário é obrigatório";
    else if (usernameStatus === 'taken') errs.username = "Este nome de usuário já está em uso";
    else if (usernameStatus === 'checking') errs.username = "Verificando disponibilidade...";
    if (!formData.birthdate) errs.birthdate = "Data de nascimento é obrigatória";
    if (!formData.gender) errs.gender = "Selecione o gênero";
    if (!formData.country.trim()) errs.country = "País é obrigatório";
    if (!formData.state.trim()) errs.state = "Estado é obrigatório";
    if (!formData.city.trim()) errs.city = "Cidade é obrigatória";
    if (!formData.phone.trim()) errs.phone = "Telefone / WhatsApp é obrigatório";
    else if (formData.phone.length < 14) errs.phone = "Telefone inválido";
    // Igreja removida da validação obrigatória
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!formData.email.trim()) errs.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "E-mail inválido";
    if (!formData.password) errs.password = "Senha é obrigatória";
    else if (formData.password.length < 6) errs.password = "Mínimo de 6 caracteres";
    if (formData.password !== formData.confirm_password) errs.confirm_password = "As senhas não coincidem";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      } else {
        toast.error("Preencha todos os campos e aceite os Termos de Uso.");
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      } else {
        toast.error("Verifique os campos em vermelho.");
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRegister = async () => {
    if (!formData.accepted_terms) {
      toast.error("Você precisa aceitar os Termos de Uso e Política de Privacidade.");
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const registrationMetadata = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
      username: formData.username.toLowerCase().trim(),
      birthdate: formData.birthdate,   // Nosso padrão
      birth_date: formData.birthdate,  // Alias para gatilhos antigos
      gender: formData.gender,
      country: formData.country.trim(),
      state: formData.state.trim(),
      city: formData.city.trim(),
      church: formData.church.trim() || null,
      phone: formData.phone.trim() || null,
    };
    
    console.log("🚀 Enviando para o Auth (JSON):", JSON.stringify(registrationMetadata, null, 2));
    
    try {
      // Validação de Segurança Zod (Proteção contra Payload Injection)
      const RegistrationSchema = z.object({
        first_name: z.string().min(2).max(50),
        last_name: z.string().min(2).max(50),
        username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
        email: z.string().email().max(255),
        gender: z.string().max(20),
        country: z.string().max(50),
        state: z.string().max(50),
        city: z.string().max(100),
        church: z.string().max(100).nullable().optional(),
        phone: z.string().max(20).nullable().optional(),
      });

      RegistrationSchema.parse({
         first_name: registrationMetadata.first_name,
         last_name: registrationMetadata.last_name,
         username: registrationMetadata.username,
         email: formData.email,
         gender: registrationMetadata.gender,
         country: registrationMetadata.country,
         state: registrationMetadata.state,
         city: registrationMetadata.city,
         church: registrationMetadata.church,
         phone: registrationMetadata.phone
      });

      if (emailStatus === 'taken') {
        toast.error("Este e-mail já está cadastrado.");
        setStep(2);
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: registrationMetadata
        }
      });

      if (authError) {
        console.error("❌ Erro Detalhado do Supabase Auth:", {
          message: authError.message,
          status: authError.status,
          name: authError.name
        });
        throw authError;
      }

      if (!authData.user) throw new Error("Falha ao criar usuário (User null).");

      const profileData = {
        id: authData.user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        username: formData.username.toLowerCase().trim(),
        email: formData.email.toLowerCase().trim(),
        birthdate: formData.birthdate,
        church: formData.church.trim() || null,
        gender: formData.gender,
        country: formData.country.trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        phone: formData.phone.trim() || null,
        accepted_terms: true,
        accepted_terms_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("🚀 Fazendo Upsert do Perfil...", profileData);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Disparar o e-mail de boas-vindas assíncronamente (sem bloquear o fluxo)
      fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          name: formData.first_name.trim(),
          user_id: authData.user.id,
          template_key: 'welcome'
        })
      }).catch(err => console.error("Erro ao disparar welcome email:", err));

      // Pedir notificação antes de redirecionar
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      toast.success("Conta criada! Verifique seu e-mail.");
      router.push("/login?registered=true");
    } catch (err: any) {
      console.error("❌ Erro de Validação/Cadastro:", err);
      if (err.name === 'ZodError') {
        toast.error(`Dados inválidos: ${err.errors[0].message}`);
      } else {
        toast.error(err.message || "Erro ao criar conta.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-whatsapp-green/20 outline-none placeholder:text-gray-600 transition-all";
  const errorFieldClass =
    "w-full bg-white/5 border border-red-500/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-red-500/20 outline-none placeholder:text-gray-600 transition-all";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0a0a0a] w-full relative overflow-y-auto px-4">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-whatsapp-teal/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-whatsapp-green/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Spacer para centralizar quando tiver espaço, ou dar margem no topo quando não tiver */}
      <div className="flex-[0.5] min-h-[64px]" />

      <div className="relative w-full max-w-md mx-auto flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center mb-2 shadow-xl shadow-whatsapp-teal/20">
            <Flame className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Criar Conta</h1>
          <p className="text-gray-500 text-xs mt-1">Junte-se à comunidade FéConecta</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${s === step
                  ? "w-10 bg-whatsapp-green"
                  : s < step
                    ? "w-6 bg-whatsapp-teal"
                    : "w-6 bg-white/10"
                }`}
            />
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[24px] p-6 backdrop-blur-sm">
          {/* Step 1: Dados Pessoais */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                Dados Pessoais
              </h3>

              {/* Termos de Uso no topo */}
              <div className="space-y-1.5 mb-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.accepted_terms}
                      onChange={(e) => updateField("accepted_terms", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-white/20 peer-checked:bg-whatsapp-green peer-checked:border-whatsapp-green flex items-center justify-center transition-all group-hover:border-white/40">
                      {formData.accepted_terms && <ShieldCheck className="w-3.5 h-3.5 text-black" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-300 leading-relaxed">
                    Li e aceito os{" "}
                    <Link href="/terms" target="_blank" className="text-whatsapp-green font-bold hover:underline">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link href="/privacy" target="_blank" className="text-whatsapp-green font-bold hover:underline">
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
                {errors.accepted_terms && <p className="text-red-400 text-[11px] ml-1">{errors.accepted_terms}</p>}
              </div>

              {/* Google Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white text-black py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com o Google
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ou crie manualmente</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Nome</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className={errors.first_name ? errorFieldClass : fieldClass}
                    placeholder="Seu nome"
                  />
                </div>
                {errors.first_name && <p className="text-red-400 text-[11px] ml-1">{errors.first_name}</p>}
              </div>

              {/* Sobrenome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Sobrenome</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    className={errors.last_name ? errorFieldClass : fieldClass}
                    placeholder="Seu sobrenome"
                  />
                </div>
                {errors.last_name && <p className="text-red-400 text-[11px] ml-1">{errors.last_name}</p>}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Nome de Usuário</label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      updateField("username", e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                    }
                    className={cn(
                      errors.username ? errorFieldClass : fieldClass,
                      "pr-10",
                      usernameStatus === "available" && "border-green-500/50 focus:border-green-500/50"
                    )}
                    placeholder="nome_usuario"
                  />
                  {/* Ícones de Feedback */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center bg-transparent z-20 pointer-events-none">
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
                {errors.username && <p className="text-red-400 text-[11px] ml-1">{errors.username}</p>}
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Data de Nascimento</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => updateField("birthdate", e.target.value)}
                    className={`${errors.birthdate ? errorFieldClass : fieldClass} [color-scheme:dark]`}
                  />
                </div>
                {errors.birthdate && <p className="text-red-400 text-[11px] ml-1">{errors.birthdate}</p>}
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Telefone / WhatsApp</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.slice(0, 11);
                      if (val.length > 2) val = `(${val.slice(0,2)}) ${val.slice(2)}`;
                      if (val.length > 9) val = `${val.slice(0,9)}-${val.slice(9)}`;
                      updateField("phone", val);
                    }}
                    className={errors.phone ? errorFieldClass : fieldClass}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                {errors.phone && <p className="text-red-400 text-[11px] ml-1">{errors.phone}</p>}
              </div>

              {/* Gênero */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Gênero</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className={`${errors.gender ? errorFieldClass : fieldClass} appearance-none cursor-pointer [color-scheme:dark]`}
                  >
                    <option value="" className="bg-[#1a1a1a] text-white">Selecione...</option>
                    <option value="masculino" className="bg-[#1a1a1a] text-white">Masculino</option>
                    <option value="feminino" className="bg-[#1a1a1a] text-white">Feminino</option>
                  </select>
                </div>
                {errors.gender && <p className="text-red-400 text-[11px] ml-1">{errors.gender}</p>}
              </div>

              {/* Localização */}
              <div className="pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-whatsapp-teal mb-4">Localização</h4>
                <div className="grid grid-cols-1 gap-4">
                  {/* País */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 ml-1">País</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => updateField("country", e.target.value)}
                        className={errors.country ? errorFieldClass : fieldClass}
                        placeholder="Ex: Brasil"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Estado */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 ml-1">Estado</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => updateField("state", e.target.value)}
                          className={errors.state ? errorFieldClass : fieldClass.replace('pl-11', 'pl-4')}
                          placeholder="Ex: SP"
                        />
                      </div>
                      {errors.state && <p className="text-red-400 text-[11px] ml-1">{errors.state}</p>}
                    </div>

                    {/* Cidade */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 ml-1">Cidade</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          className={errors.city ? errorFieldClass : fieldClass.replace('pl-11', 'pl-4')}
                          placeholder="Sua cidade"
                        />
                      </div>
                      {errors.city && <p className="text-red-400 text-[11px] ml-1">{errors.city}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Igreja */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Igreja (Opcional)</label>
                <div className="relative">
                  <Church className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.church}
                    onChange={(e) => updateField("church", e.target.value)}
                    className={fieldClass}
                    placeholder="Nome da sua igreja"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dados de Conta */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                Dados da Conta
              </h3>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={errors.email ? errorFieldClass : fieldClass}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-[11px] ml-1">{errors.email}</p>}
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className={errors.password ? errorFieldClass : fieldClass}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-[11px] ml-1">{errors.password}</p>}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={formData.confirm_password}
                    onChange={(e) => updateField("confirm_password", e.target.value)}
                    className={errors.confirm_password ? errorFieldClass : fieldClass}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-red-400 text-[11px] ml-1">{errors.confirm_password}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Termos */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                Termos e Condições
              </h3>

              {/* Resumo dos dados */}
              <div className="space-y-4 mt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Resumo do Cadastro</p>
                
                <div className="space-y-4 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">Nome completo</span>
                    <span className="text-white font-medium">{formData.first_name} {formData.last_name}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">Usuário</span>
                    <span className="text-whatsapp-green font-medium">@{formData.username}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">E-mail</span>
                    <span className="text-white font-medium">{formData.email}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">Igreja</span>
                    <span className="text-white font-medium">{formData.church || 'N/A'}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">Telefone</span>
                    <span className="text-white font-medium">{formData.phone || 'N/A'}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">Gênero</span>
                    <span className="text-white font-medium capitalize">{formData.gender === 'prefer_not_to_say' ? 'Não informado' : formData.gender}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-xs">Local</span>
                    <span className="text-whatsapp-teal font-medium">{formData.city}, {formData.state} - {formData.country}</span>
                  </div>
                </div>
              </div>

              {/* Termos removidos daqui e movidos para o Passo 1 */}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-white/5 border border-white/10 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-whatsapp-teal to-whatsapp-tealLight text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-whatsapp-teal/20"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading || !formData.accepted_terms}
                className="flex-1 bg-gradient-to-r from-whatsapp-green to-whatsapp-tealLight text-whatsapp-dark py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg shadow-whatsapp-green/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Criar Conta
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Register Link */}
        <div className="mt-4 text-center">
          <p className="text-gray-500 text-xs">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-whatsapp-green font-bold hover:underline inline-flex items-center gap-1">
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      {/* Spacer para o rodapé */}
      <div className="flex-1 min-h-[64px]" />
    </div>
  );
}
