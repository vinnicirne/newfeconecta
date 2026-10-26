export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Comprime e redimensiona imagens no cliente antes do upload.
 * - Suporta OffscreenCanvas e createImageBitmap para zero lag no main thread
 * - Preserva transparência (alpha) em PNGs/WebP
 * - Preferência por WebP com fallback para JPEG
 * - Compara tamanho e garante que nunca infla arquivos já otimizados
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxWidth = 1080,
  maxHeight = 1920,
  quality = 0.82
): Promise<Blob> {
  // Early return: se não for imagem ou for GIF animado
  if (!fileOrBlob.type.startsWith('image/') || fileOrBlob.type === 'image/gif') {
    return fileOrBlob;
  }

  // Preserva canal alpha se o original for PNG ou WebP
  const hasAlpha = fileOrBlob.type === 'image/png' || fileOrBlob.type === 'image/webp';

  try {
    // 🚀 Caminho de Alta Performance: createImageBitmap (decodificação assíncrona fora da thread principal)
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(fileOrBlob);
        const origW = bitmap.width;
        const origH = bitmap.height;

        const ratio = Math.min(maxWidth / origW, maxHeight / origH, 1);
        const targetW = Math.max(1, Math.round(origW * ratio));
        const targetH = Math.max(1, Math.round(origH * ratio));

        // Suporte a OffscreenCanvas (zero layout thrashing, sem tocar no DOM)
        if (typeof OffscreenCanvas !== 'undefined') {
          const offscreen = new OffscreenCanvas(targetW, targetH);
          const ctx = offscreen.getContext('2d', { alpha: hasAlpha });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap, 0, 0, targetW, targetH);
            bitmap.close();

            let blob = await offscreen.convertToBlob({ type: 'image/webp', quality });
            if (!blob || blob.size === 0) {
              blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality });
            }

            // Se o arquivo resultante não diminuiu e a resolução não mudou, preserva o original
            if (!blob || (blob.size >= fileOrBlob.size && ratio === 1)) {
              return fileOrBlob;
            }
            return blob;
          }
        }
        bitmap.close();
      } catch {
        // Fallback silencioso para o pipeline padrão via HTMLCanvasElement
      }
    }

    // 🛡️ Pipeline Padrão Resiliente via HTMLCanvasElement
    return await new Promise<Blob>((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(fileOrBlob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        const ratio = Math.min(maxWidth / origW, maxHeight / origH, 1);
        const targetW = Math.max(1, Math.round(origW * ratio));
        const targetH = Math.max(1, Math.round(origH * ratio));

        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d', { alpha: hasAlpha });
        if (!ctx) {
          resolve(fileOrBlob);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const tryCompress = (type: string, q: number) =>
          new Promise<Blob | null>((res) => {
            canvas.toBlob((b) => res(b), type, q);
          });

        (async () => {
          // 1. Tenta WebP moderno
          let blob = await tryCompress('image/webp', quality);

          // 2. Fallback para JPEG se WebP falhar
          if (!blob || blob.size === 0) {
            blob = await tryCompress('image/jpeg', quality);
          }

          // 3. Se ficou maior que o original sem redução de dimensão, preserva o original
          if (!blob || (blob.size >= fileOrBlob.size && ratio === 1)) {
            resolve(fileOrBlob);
          } else {
            resolve(blob);
          }
        })();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(fileOrBlob);
      };

      img.src = url;
    });
  } catch {
    return fileOrBlob;
  }
}
