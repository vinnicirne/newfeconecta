import { supabase } from "@/lib/supabase";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!post) {
      return {
        title: "Publicação não encontrada | FéConecta",
        description: "Esta publicação pode ter sido removida."
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', post.user_id || post.author_id)
      .single();

    const authorName = profile?.full_name || profile?.username || 'Usuário';
    const title = `Publicação de ${authorName} | FéConecta`;
    const description = post.content?.substring(0, 160) || "Veja esta publicação inspiradora no FéConecta.";
    
    // Prioriza imagem do post, depois thumbnail, depois avatar do autor
    const image = post.media_url || post.thumbnail_url || profile?.avatar_url;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : [],
        type: 'article',
        siteName: 'FéConecta',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : [],
      }
    };
  } catch (error) {
    return {
      title: "FéConecta",
      description: "Conectando corações e propósitos."
    };
  }
}

export default async function PostPage({ params }: { params: { id: string } }) {
  // Busca o tipo do post para decidir para onde redirecionar
  const { data: post } = await supabase
    .from('posts')
    .select('post_type')
    .eq('id', params.id)
    .single();

  if (post?.post_type === 'video' || post?.post_type === 'external_media') {
    redirect(`/tribo?id=${params.id}`);
  }

  // Redireciona para o feed principal com o ID do post para que a UI possa focar nele
  redirect(`/?post=${params.id}`);
}
