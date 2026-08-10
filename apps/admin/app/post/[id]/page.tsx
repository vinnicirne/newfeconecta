import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import nextDynamic from "next/dynamic";

const PostPageClient = nextDynamic(() => import("./PostPageClient"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0c] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-whatsapp-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

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
      return { title: `Erro ${postError.code} | FéConecta` };
    }

    if (!post) return { title: "Publicação não encontrada | FéConecta" };

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
    
    let imageUrl = post.thumbnail_url;
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
        url: `https://newfeconecta.vercel.app/post/${postId}`,
        type: 'article',
      },
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
  return <PostPageClient postId={id} />;
}
