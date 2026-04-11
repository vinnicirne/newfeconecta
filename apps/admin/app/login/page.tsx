"use client";

import React, { useState } from "react";
import { Flame, Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-whatsapp-teal/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-whatsapp-green/5 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center mb-4 shadow-xl shadow-whatsapp-teal/20">
            <Flame className="w-9 h-9 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">FéConecta</h1>
          <p className="text-gray-500 text-sm mt-1">Um lugar de adoração</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleLogin} className="bg-white/[0.03] border border-white/10 rounded-[28px] p-8 space-y-6 backdrop-blur-sm">
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold text-white">Entrar na sua conta</h2>
            <p className="text-gray-500 text-sm mt-1">Acesse a plataforma FéConecta</p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-whatsapp-green/20 outline-none placeholder:text-gray-600 transition-all"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white focus:ring-2 focus:ring-whatsapp-green/20 outline-none placeholder:text-gray-600 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-whatsapp-teal to-whatsapp-tealLight text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-whatsapp-teal/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Entrar <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-whatsapp-green font-bold hover:underline inline-flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
