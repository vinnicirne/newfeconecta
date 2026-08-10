"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Home, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MinhaCasaPage() {
  const router = useRouter();
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  async function loadUserRoles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }

    const { data } = await supabase
      .from('church_members')
      .select('role, church:churches(*)')
      .eq('user_id', user.id)
      .eq('approved', true);
    
    setUserRoles(data || []);
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando Minha Casa...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-24 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
          <Home className="text-[#25D366]" /> Minha Casa
        </h1>
        <p className="text-gray-400 mb-10">As igrejas que você faz parte.</p>

        {userRoles.length === 0 ? (
          <div className="text-center py-20 bg-[#111B21] rounded-3xl border border-white/5">
            <Home className="w-12 h-12 text-[#25D366]/40 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">Você ainda não faz parte de nenhuma igreja.</p>
            <Link href="/igreja" className="bg-[#25D366] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#00A884] transition-all">
              Encontrar uma Igreja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userRoles.map((roleObj, i) => (
              <div key={i} className="bg-[#111B21] rounded-3xl overflow-hidden border border-white/5 shadow-xl group">
                <div className="relative h-40 bg-zinc-800">
                  {roleObj.church.banner_url ? (
                    <img src={roleObj.church.banner_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] to-[#25D366] opacity-30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111B21] via-transparent to-transparent" />
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-2">
                    {['admin', 'pastor'].includes(roleObj.role) ? <><Shield size={14} className="text-[#25D366]" /> Liderança</> : 'Membro'}
                  </div>
                </div>
                
                <div className="p-6 relative">
                  <h3 className="font-bold text-xl mb-4">{roleObj.church.name}</h3>
                  
                  <div className="flex gap-2">
                    <Link href={`/igreja/${roleObj.church.slug}/casa`} className="flex-1 text-center py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-all border border-white/5">
                      Entrar na Casa
                    </Link>
                    {['admin', 'pastor'].includes(roleObj.role) && (
                      <Link href={`/igreja/${roleObj.church.slug}/admin`} className="px-4 py-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-2xl font-bold text-sm transition-all border border-[#25D366]/20 flex items-center justify-center">
                        <Shield size={18} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
