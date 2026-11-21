export const MAX_CAROUSEL_IMAGES = 10;
export const MAX_CAROUSEL_IMAGE_SIZE = 20 * 1024 * 1024;

export function validateCarouselImages(files: File[]): void {
  if (files.length < 2 || files.length > MAX_CAROUSEL_IMAGES) {
    throw new Error(`Selecione de 2 a ${MAX_CAROUSEL_IMAGES} imagens para criar um carrossel.`);
  }
  if (files.some((file) => !file.type.startsWith('image/'))) {
    throw new Error('O carrossel aceita somente imagens. Selecione vídeos separadamente.');
  }
  if (files.some((file) => file.size > MAX_CAROUSEL_IMAGE_SIZE)) {
    throw new Error('Cada imagem do carrossel precisa ter até 20 MB.');
  }
}

export async function uploadCarouselImages(
  files: File[],
  upload: (file: File, index: number) => Promise<string | null>,
): Promise<string[]> {
  validateCarouselImages(files);
  const urls: string[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const url = await upload(files[index], index);
    if (!url) throw new Error(`Não foi possível enviar a imagem ${index + 1} do carrossel.`);
    urls.push(url);
  }
  return urls;
}
