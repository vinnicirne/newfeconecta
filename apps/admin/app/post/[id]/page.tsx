import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PostPageClient from "./PostPageClient";
import { SITE_URL } from "@/lib/seo";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: postId } = await params;
  
  try {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError) {
      console.error("Supabase Error:", postError);
      return {
        title: "Publicação | FéConecta",
        robots: { index: false, follow: true },
      };
    }

    if (!post) return {
      title: "Publicação não encontrada | FéConecta",
      robots: { index: false, follow: true },
    };

    const authorId = post.author_id || post.user_id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, username')
      .eq('id', authorId)
      .maybeSingle();
    
    const authorName = profile?.full_name || "FéConecta";
    const authorUsername = profile?.username || "feconecta";
    
    const title = `Publicação de ${authorName} (@${authorUsername})`;
    const plainText = post.content ? post.content.replace(/<[^>]*>?/gm, '').trim() : '';
    const description = plainText.length > 0 
      ? (plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText)
      : "Veja esta publicação no FéConecta, a rede social da fé. 🙏";
    
    const isVideoOrAudio = post.post_type === "video" || post.media_type === "video" || post.post_type === "audio" || post.media_type === "audio" || !!post.media_url?.match(/\.(mp4|webm|mov|mkv|mp3|wav|m4a|ogg|aac|flac|opus|weba)/i) || post.media_url?.includes('/posts/videos/') || post.media_url?.includes('/posts/audio/');
    
    let imageUrl = post.thumbnail_url || post.metadata?.media_urls?.[0];
    if (!imageUrl && post.media_url && !isVideoOrAudio) {
      imageUrl = post.media_url;
    }
    if (!imageUrl) {
      imageUrl = profile?.avatar_url || "https://images.unsplash.com/photo-1544427928-142ce021f90a?q=80&w=1000&auto=format&fit=crop";
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: 'FéConecta',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: "Conteúdo FéConecta" }],
        url: `${SITE_URL}/post/${postId}`,
        type: 'article',
      },
      alternates: { canonical: `${SITE_URL}/post/${postId}` },
      robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (err) {
    console.error("Metadata error:", err);
    return { title: "FéConecta | Publicação" };
  }
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !post) notFound();

  const authorId = post.author_id || post.user_id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, username, is_verified, verification_label')
    .eq('id', authorId)
    .maybeSingle();

  const initialPost = {
    ...post,
    author_name: profile?.full_name || 'FéConecta',
    author_username: profile?.username || 'feconecta',
    author_id: authorId,
    author_avatar: profile?.avatar_url,
    created_date: post.created_at,
    display_date: post.created_at,
    likes: post.likes || [],
    likes_count: post.likes_count || (post.likes ? post.likes.length : 0),
    is_verified: profile?.is_verified,
    verification_label: profile?.verification_label,
  };

  return <PostPageClient postId={id} initialPost={initialPost} />;
}
