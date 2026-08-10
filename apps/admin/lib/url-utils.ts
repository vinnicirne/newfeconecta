/**
 * Utilitários para formatação e tratamento de URLs na plataforma.
 */

export const formatExternalUrl = (url: string | null | undefined, type?: string) => {
  if (!url) return "#";
  let formatted = url.trim();

  // Especial para WhatsApp (remove formatação e cria o link do wa.me)
  if (type === 'whatsapp' && !formatted.includes('http')) {
    const cleanNumber = formatted.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  }

  // Se for apenas o handle do usuário (não tem pontos ou barras), monta a URL da rede
  if (!formatted.includes('.') && !formatted.includes('/')) {
    if (type === 'instagram') return `https://instagram.com/${formatted}`;
    if (type === 'youtube') return `https://youtube.com/@${formatted}`;
    if (type === 'linkedin') return `https://linkedin.com/in/${formatted}`;
  }

  // Adiciona o protocolo HTTPS se não tiver
  if (!formatted.startsWith("http") && formatted.length > 0) {
    return `https://${formatted}`;
  }
  
  return formatted;
};
