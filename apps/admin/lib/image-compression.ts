export async function compressImage(fileOrBlob: File | Blob, maxWidth = 1080, quality = 0.7): Promise<Blob> {
  if (!fileOrBlob.type.startsWith('image/')) {
    return fileOrBlob;
  }

  // Se for GIF, não recomprime em canvas para não perder a animação, apenas retorna
  if (fileOrBlob.type === 'image/gif') {
    return fileOrBlob;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileOrBlob);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Desenha a imagem interpolada
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob || fileOrBlob),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(fileOrBlob);
    };
    reader.onerror = () => resolve(fileOrBlob);
  });
}
