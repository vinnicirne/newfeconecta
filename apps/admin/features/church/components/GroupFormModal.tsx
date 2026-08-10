import { useState, useEffect } from "react";
import { X, Flame, Users, Calendar, Clock, UserSquare2, Camera } from "lucide-react";
import { ImageCropperModal } from "@/components/profile/ImageCropperModal";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { ChurchGroup } from "../services/group.service";

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ChurchGroup, 'id' | 'church_id' | 'created_at'>) => Promise<void>;
  initialData?: Partial<ChurchGroup>;
  type: 'cell' | 'ministry';
  churchMembers: any[]; // To pick a leader
}

export function GroupFormModal({ isOpen, onClose, onSubmit, initialData, type, churchMembers }: GroupFormModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [leaderId, setLeaderId] = useState(initialData?.leader_id || "");
  const [meetingDay, setMeetingDay] = useState(initialData?.meeting_day || "");
  const [meetingTime, setMeetingTime] = useState(initialData?.meeting_time || "");
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url || "");
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'invisible'>(initialData?.privacy || 'public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [cropperFile, setCropperFile] = useState<string | null>(null);
  const { uploadMedia, isUploading } = useMediaUpload();

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setLeaderId(initialData?.leader_id || "");
      setMeetingDay(initialData?.meeting_day || "");
      setMeetingTime(initialData?.meeting_time || "");
      setLogoUrl(initialData?.logo_url || "");
      setPrivacy(initialData?.privacy || 'public');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setCropperFile(url);
    }
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    if (cropperFile && cropperFile.startsWith('blob:')) {
      URL.revokeObjectURL(cropperFile);
    }
    setCropperFile(null);
    
    try {
      const file = new File([blob], `logo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadMedia(file, { bucket: 'avatars', folder: 'church_groups' });
      if (url) {
        setLogoUrl(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        type,
        leader_id: leaderId || churchMembers[0]?.user_id || "", // Fallback
        meeting_day: meetingDay,
        meeting_time: meetingTime,
        logo_url: logoUrl,
        privacy,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCell = type === 'cell';

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
        <div className="w-full max-w-md bg-white dark:bg-[#111B21] rounded-[32px] overflow-hidden border border-black/10 dark:border-[#25D366]/20 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-widest text-xs text-gray-900 dark:text-white flex items-center gap-2">
            {isCell ? <Flame className="text-orange-400" size={16} /> : <Users className="text-[#25D366]" size={16} />}
            {initialData ? `Editar ${isCell ? 'Célula' : 'Ministério'}` : `Nova ${isCell ? 'Célula' : 'Ministério'}`}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className={`w-24 h-24 rounded-2xl bg-black/5 dark:bg-white/5 border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden ${isUploading ? 'opacity-50' : ''}`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nome</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`Ex: ${isCell ? 'Célula Kadosh' : 'Ministério de Louvor'}`}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#25D366] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <UserSquare2 size={14} /> Líder
            </label>
            <select
              value={leaderId}
              onChange={e => setLeaderId(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366] transition-colors appearance-none"
              required
            >
              <option value="" disabled>Selecione um líder...</option>
              {churchMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name || member.profiles?.username || 'Usuário'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Visibilidade</label>
            <select
              value={privacy}
              onChange={e => setPrivacy(e.target.value as any)}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366] transition-colors appearance-none"
            >
              <option value="public">Público (Todos podem ver e entrar)</option>
              <option value="private">Privado (Requer aprovação para entrar)</option>
              <option value="invisible">Invisível (Oculto, acesso por convite/admin)</option>
            </select>
          </div>

          {isCell && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar size={14} /> Dia
                </label>
                <select
                  value={meetingDay}
                  onChange={e => setMeetingDay(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366] transition-colors appearance-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                  <option value="Domingo">Domingo</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock size={14} /> Horário
                </label>
                <input 
                  type="time" 
                  value={meetingTime}
                  onChange={e => setMeetingTime(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting || isUploading || !name.trim() || !leaderId}
              className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black font-black uppercase tracking-widest py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>

      {cropperFile && (
        <ImageCropperModal
          isOpen={true}
          image={cropperFile}
          onCropComplete={handleCropComplete}
          onClose={() => setCropperFile(null)}
          aspect={1}
          isCircular={false}
          title={`Cortar Logo d${isCell ? 'a Célula' : 'o Ministério'}`}
        />
      )}
    </>
  );
}
