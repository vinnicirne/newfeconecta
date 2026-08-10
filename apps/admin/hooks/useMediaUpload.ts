import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-compression';

type BucketType = 'posts' | 'stories' | 'avatars' | 'verifications' | 'chat_media';

interface UploadOptions {
  bucket: BucketType;
  folder?: string;
  maxVideoSizeMB?: number; // Padrão: 50MB
  maxImageSizeMB?: number; // Padrão: 20MB (pre-compression)
  compressImages?: boolean; // Padrão: true
  onProgress?: (progress: number) => void;
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (file: File | Blob, options: UploadOptions): Promise<string | null> => {
    setIsUploading(true);
    setProgress(0);
    options.onProgress?.(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      let fileToUpload: File | Blob = file;
      
      // Determine base extension and enforce limits
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isVideo) {
        const maxSize = (options.maxVideoSizeMB || 50) * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`Vídeo excede o limite de ${options.maxVideoSizeMB || 50}MB`);
        }
      } 
      else if (isImage) {
        const maxImgSize = (options.maxImageSizeMB || 20) * 1024 * 1024;
        if (file.size > maxImgSize) {
          throw new Error(`Imagem muito grande. Limite de ${options.maxImageSizeMB || 20}MB pré-compressão.`);
        }
        
        // Regras de Imagem (Ignora GIFs para manter animação)
        if (options.compressImages !== false && file.type !== 'image/gif') {
          // Type casting to File since compressImage usually expects File, but Blob might work depending on implementation.
          // If compressImage expects File, we can wrap it:
          const fileObj = file instanceof File ? file : new File([file], 'image.jpg', { type: file.type });
          fileToUpload = await compressImage(fileObj);
        }
      }

      // Derivar extensão final baseado no MIME type do blob resultante
      let fileExt = 'bin';
      if (fileToUpload.type === 'image/webp') fileExt = 'webp';
      else if (fileToUpload.type === 'image/jpeg') fileExt = 'jpg';
      else if (fileToUpload.type === 'image/png') fileExt = 'png';
      else if (fileToUpload.type === 'image/gif') fileExt = 'gif';
      else if (fileToUpload.type === 'video/mp4') fileExt = 'mp4';
      else if (fileToUpload.type === 'video/webm') fileExt = 'webm';
      else if (fileToUpload.type === 'audio/webm') fileExt = 'webm';
      else if (fileToUpload.type === 'audio/mp4') fileExt = 'm4a';
      else if (file instanceof File) fileExt = file.name.split('.').pop() || 'bin';

      // Gera um UUID único para o arquivo, associado ao usuário
      const uuid = Math.random().toString(36).substring(2, 10);
      const fileName = `${options.folder ? options.folder + '/' : ''}${user.id}_${Date.now()}_${uuid}.${fileExt}`;
      
      const simulateProgress = 50;
      setProgress(simulateProgress);
      options.onProgress?.(simulateProgress);

      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileToUpload.type // explicitamente passando o content type
        });

      if (error) {
        throw new Error(error.message + (error as any).statusCode ? ` (Code: ${(error as any).statusCode})` : '');
      }
      
      const { data: { publicUrl } } = supabase.storage.from(options.bucket).getPublicUrl(data.path);
      
      setProgress(100);
      options.onProgress?.(100);
      
      // Retornar objeto ou string. O hook original retornava `string | null`
      // Para manter a assinatura, continuamos retornando a URL.
      // Futuramente, podemos retornar { url, path } alterando o tipo de retorno.
      return publicUrl;
      
    } catch (err: any) {
      console.error('[useMediaUpload] Erro detalhado:', err);
      toast.error(err.message || 'Falha ao processar a mídia');
      setProgress(0);
      options.onProgress?.(0);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadMedia, isUploading, progress };
}
