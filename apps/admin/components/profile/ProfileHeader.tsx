import React from "react";
import Link from "next/link";
import {
  Camera,
  ChevronDown,
  Plus,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  Check,
  Share2,
  Instagram,
  MessageCircle,
  Linkedin,
  Youtube,
  Globe,
  Settings2,
  ArrowLeft,
  MessageSquare,
  Flame
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "@/components/verification-badge";
import { formatExternalUrl } from "@/lib/url-utils";

interface ProfileHeaderProps {
  user: any;
  userStoriesLength: number;
  isSelf: boolean;
  onLogout?: () => void;
  onSetView?: (view: string) => void;
  onFetchConnections: (type: 'followers' | 'following', profileId: string) => void;
  onOpenCropper?: (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => void;
  onOpenStoryViewer: () => void;
  onOpenStoryCreator: () => void;
  onOpenHighlightModal?: () => void;
  onOpenEditModal?: () => void;
  onOpenVerificationModal?: () => void;
  onOpenShareModal?: () => void;
  onMessageClick?: () => void;
}

export function ProfileHeader({
  user,
  userStoriesLength,
  isSelf,
  onLogout,
  onSetView,
  onFetchConnections,
  onOpenCropper,
  onOpenStoryViewer,
  onOpenStoryCreator,
  onOpenHighlightModal,
  onOpenEditModal,
  onOpenVerificationModal,
  onOpenShareModal,
  onMessageClick
}: ProfileHeaderProps) {
  return (
    <>
      {/* Banner Section */}
      <div className="relative h-48 w-full bg-gray-900 overflow-hidden group">
        {user?.banner_url ? (
          <img src={user.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal/20 via-black to-whatsapp-green/20" />
        )}
        {isSelf && onOpenCropper && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <label className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 transition-all active:scale-95">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" className="hidden" onChange={(e) => onOpenCropper(e, 'banner')} accept="image/*" />
            </label>
          </div>
        )}
      </div>

      {/* Top Header (Overlay style) */}
      <div className="flex items-center justify-between px-4 pt-10 pb-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-white/10 rounded-lg transition-all text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity text-white">
            <h1 className="text-xl font-bold tracking-tight">{user?.username || '...'}</h1>
            {isSelf && <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
        
        {isSelf && (
          <div className="flex items-center gap-5 text-white">
            <button
              onClick={onOpenHighlightModal}
              className="p-1 hover:bg-white/10 rounded-lg transition-all"
              title="Criar novo Destaque"
            >
              <Plus className="w-6 h-6" />
            </button>

            <button
              onClick={() => {
                if(onSetView) onSetView('settings');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className="p-1 hover:bg-white/10 rounded-lg transition-all"
              title="Configurações"
            >
              <Settings className="w-6 h-6" />
            </button>

            <button
              onClick={onLogout}
              className="p-1 hover:bg-white/10 rounded-lg text-red-500 transition-all"
              title="Sair da conta"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Profile Header Stats */}
      <div className="px-5 -mt-12 relative z-10 pb-2">
        <div className="flex items-center justify-between gap-4 mb-6 pt-12">
          {/* Avatar with Story Ring style */}
          <div className="relative group">
            <div
              onClick={() => {
                if (userStoriesLength > 0) onOpenStoryViewer();
                else if (isSelf) onOpenStoryCreator();
              }}
              className={cn(
                "w-[100px] h-[100px] rounded-[32px] p-[3px] cursor-pointer transition-all active:scale-95",
                userStoriesLength > 0 ? "bg-gradient-to-tr from-whatsapp-teal to-whatsapp-green shadow-[0_0_15px_rgba(37,211,102,0.4)]" : "bg-white dark:bg-black"
              )}
            >
              <div className="w-full h-full rounded-[28px] border-4 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-xl">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                    <User className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            {isSelf && onOpenCropper && (
              <label
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-2 right-0 w-7 h-7 bg-whatsapp-green rounded-xl border-4 border-black flex items-center justify-center scale-95 hover:scale-105 transition-transform cursor-pointer"
              >
                <Plus className="w-5 h-5 text-whatsapp-dark font-black" />
                <input type="file" className="hidden" onChange={(e) => onOpenCropper(e, 'avatar')} accept="image/*" />
              </label>
            )}
          </div>

          <div className="flex-1 flex justify-around text-center pt-8">
            <div className="flex flex-col cursor-default">
              <span className="font-bold text-lg leading-none text-black dark:text-white">{user?.posts_count || 0}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Publicações</span>
            </div>
            {user?.show_counters !== false && (
              <>
                <button
                  onClick={() => onFetchConnections('followers', user.id)}
                  className="flex flex-col hover:opacity-70 active:scale-95 transition-all"
                >
                  <span className="font-bold text-lg leading-none text-black dark:text-white">{user?.followers_count?.toLocaleString() || 0}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Seguidores</span>
                </button>
                <button
                  onClick={() => onFetchConnections('following', user.id)}
                  className="flex flex-col hover:opacity-70 active:scale-95 transition-all"
                >
                  <span className="font-bold text-lg leading-none text-black dark:text-white">{user?.following_count?.toLocaleString() || 0}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Seguindo</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info & Bio */}
        <div className="space-y-0.5 mb-6 text-gray-800 dark:text-gray-100">
          <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
            {user?.full_name}
            {user?.is_verified && (
              <VerificationBadge
                role={user.verification_label || 'Verificado'}
                size="md"
              />
            )}
          </h2>
          <div className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-100/90 leading-relaxed font-medium">
            {(() => {
              const content = user?.bio;
              if (!content) return null;
              const parts = content.split(/(#[\wáàâãéèêíïóôõöúç]+|@[\wáàâãéèêíïóôõöúç]+|\n)/g);
              return parts.map((part: string, i: number) => {
                const trimmed = part.trim();
                if (part === '\n') return <br key={i} />;
                if (trimmed.startsWith('#')) {
                  const tag = trimmed.substring(1);
                  return <Link key={i} href={`/explore/${tag}`} className="text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer font-medium">{part}</Link>;
                }
                if (trimmed.startsWith('@')) {
                  return <a key={i} href={`/profile/${trimmed.substring(1)}`} className="text-whatsapp-teal dark:text-whatsapp-green hover:underline font-bold">{part}</a>;
                }
                return part;
              });
            })()}
          </div>
          {user?.church && <p className="text-xs text-whatsapp-teal dark:text-whatsapp-green font-bold uppercase tracking-wider mt-1">{user.church}</p>}
          {user?.website_url && (
            <a href={user.website_url.startsWith('http') ? user.website_url : `https://${user.website_url}`} className="text-sm text-blue-400 font-medium hover:underline block pt-1" target="_blank" rel="noopener noreferrer">
              {user.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          {isSelf ? (
            <>
              <button
                onClick={onOpenEditModal}
                className="flex-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 py-2 rounded-xl text-sm font-bold transition-all border border-black/5 dark:border-white/5 active:scale-95 uppercase tracking-wide text-gray-900 dark:text-white"
              >
                Editar Perfil
              </button>
              <Link
                href="/santuario"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_0_rgb(245,158,11,0.39)] active:scale-95 uppercase tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
              >
                <Flame className="w-4 h-4 fill-current drop-shadow-md" />
                Lugar Secreto
              </Link>
            </>
          ) : (
            <button
              onClick={onMessageClick}
              className="flex-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center gap-2 rounded-xl transition-all border border-black/5 dark:border-white/5 active:scale-95 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white"
              title="Mensagens"
            >
              <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              Chat
            </button>
          )}

          {isSelf && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="w-10 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center rounded-xl transition-all border border-black/5 dark:border-white/5 active:scale-95 text-gray-900 dark:text-white focus:outline-none">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-[60] min-w-[200px] bg-white dark:bg-whatsapp-darkLighter rounded-2xl p-2 shadow-2xl border border-gray-100 dark:border-white/5 animate-in fade-in zoom-in duration-200"
                  sideOffset={8}
                  align="end"
                >
                  <DropdownMenu.Item
                    onClick={onOpenVerificationModal}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all outline-none cursor-pointer group"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      user?.is_verified ? "bg-whatsapp-green/10 text-whatsapp-green" : "bg-whatsapp-teal/10 text-whatsapp-teal"
                    )}>
                      {user?.is_verified ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase tracking-wide text-[10px] text-gray-400">Status Ministerial</span>
                      {user?.is_verified ? "Perfil Verificado" : "Solicitar Verificação"}
                    </div>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="h-[1px] bg-gray-100 dark:bg-white/5 my-1" />

                  <DropdownMenu.Item
                    onClick={onOpenShareModal}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all outline-none cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400">
                      <Share2 className="w-4 h-4" />
                    </div>
                    Compartilhar Perfil
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>

        {/* Social Links Row */}
        {(([
          { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500', key: 'instagram_url', type: 'instagram' },
          { label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500', key: 'whatsapp_url', type: 'whatsapp' },
          { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500', key: 'linkedin_url', type: 'linkedin' },
          { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500', key: 'youtube_url', type: 'youtube' },
          { label: 'Site', icon: Globe, color: 'hover:text-blue-400', key: 'website_url', type: 'website' },
        ].filter(l => user?.[l.key]).length > 0) || isSelf) && (
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {[
                { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500', key: 'instagram_url', type: 'instagram' },
                { label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500', key: 'whatsapp_url', type: 'whatsapp' },
                { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500', key: 'linkedin_url', type: 'linkedin' },
                { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500', key: 'youtube_url', type: 'youtube' },
                { label: 'Site', icon: Globe, color: 'hover:text-blue-400', key: 'website_url', type: 'website' },
              ].filter(link => user?.[link.key]).map((link) => (
                <button
                  key={link.label}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = formatExternalUrl(user?.[link.key], link.type);
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className={cn(
                    "w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center transition-all active:scale-90 group shrink-0",
                    link.color
                  )}
                  title={link.label}
                >
                  <link.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-inherit transition-colors" />
                </button>
              ))}
              
              {isSelf && (
                <button
                  onClick={onOpenVerificationModal}
                  className="px-4 h-11 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95 shrink-0"
                >
                  {user?.is_verified ? (
                    <>
                      <Check className="w-4 h-4 text-whatsapp-green" />
                      Status Ministerial
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-whatsapp-teal" />
                      Verificar Perfil
                    </>
                  )}
                </button>
              )}
            </div>
          )}
      </div>
    </>
  );
}
