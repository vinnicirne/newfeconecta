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
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
    accepted_terms: false,
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!formData.first_name.trim()) errs.first_name = "Nome é obrigatório";
    if (!formData.last_name.trim()) errs.last_name = "Sobrenome é obrigatório";
    if (!formData.username.trim()) errs.username = "Nome de usuário é obrigatório";
    else if (usernameStatus === 'taken') errs.username = "Este nome de usuário já está em uso";
    else if (usernameStatus === 'checking') errs.username = "Verificando disponibilidade...";
    if (!formData.birthdate) errs.birthdate = "Data de nascimento é obrigatória";
    if (!formData.gender) errs.gender = "Selecione o gênero";
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
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
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
      church: formData.church.trim() || null,
    };
    
    console.log("🚀 Enviando para o Auth (JSON):", JSON.stringify(registrationMetadata, null, 2));
    
    try {
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
        accepted_terms: true,
        accepted_terms_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("🚀 Fazendo Upsert do Perfil...", profileData);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) throw profileError;

      toast.success("Conta criada! Verifique seu e-mail.");
      router.push("/login?registered=true");
    } catch (err: any) {
      console.error("❌ Falha Total no Registro:", err);
      toast.error(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-whatsapp-green/20 outline-none placeholder:text-gray-600 transition-all";
  const errorFieldClass =
    "w-full bg-white/5 border border-red-500/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-red-500/20 outline-none placeholder:text-gray-600 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-whatsapp-teal/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-whatsapp-green/5 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center mb-3 shadow-xl shadow-whatsapp-teal/20">
            <Flame className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Criar Conta</h1>
          <p className="text-gray-500 text-sm mt-1">Junte-se à comunidade FéConecta</p>
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
        <div className="bg-white/[0.03] border border-white/10 rounded-[28px] p-8 backdrop-blur-sm">
          {/* Step 1: Dados Pessoais */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                Dados Pessoais
              </h3>

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

              {/* Gênero */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Gênero</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className={`${errors.gender ? errorFieldClass : fieldClass} appearance-none cursor-pointer`}
                  >
                    <option value="">Selecione...</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                    <option value="prefer_not_to_say">Prefiro não dizer</option>
                  </select>
                </div>
                {errors.gender && <p className="text-red-400 text-[11px] ml-1">{errors.gender}</p>}
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
                    placeholder="Nome da sua igreja (se houver)"
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
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo do Cadastro</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Nome:</span>
                  <span className="text-white font-medium">{formData.first_name} {formData.last_name}</span>
                  <span className="text-gray-500">Usuário:</span>
                  <span className="text-whatsapp-green font-medium">@{formData.username}</span>
                  <span className="text-gray-500">E-mail:</span>
                  <span className="text-white font-medium text-xs">{formData.email}</span>
                  <span className="text-gray-500">Igreja:</span>
                  <span className="text-white font-medium">{formData.church}</span>
                  <span className="text-gray-500">Gênero:</span>
                  <span className="text-white font-medium capitalize">{formData.gender === 'prefer_not_to_say' ? 'Não informado' : formData.gender}</span>
                </div>
              </div>

              {/* Termos */}
              <div className="space-y-3">
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
                    </Link>{" "}
                    da FéConecta.
                  </span>
                </label>
              </div>
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

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-whatsapp-green font-bold hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
