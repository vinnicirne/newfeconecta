import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

// Impedindo que o código do LiveKit (client-only) quebre a renderização de metadados no servidor
const WarRoomPageClient = dynamic(() => import("@/features/room/WarRoomPageClient"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#3fff8b] border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const roomId = params.id;
  
  const { data: room } = await supabase
    .from('rooms')
    .select('*, profiles:creator_id(full_name, avatar_url)')
    .eq('id', roomId)
    .single();

  const title = room?.name || "Sala de Guerra | FéConecta";
  const profile = Array.isArray(room?.profiles) ? room?.profiles[0] : room?.profiles;
  const creatorName = (profile as any)?.full_name;
  const description = `Participe deste momento de clamor e intercessão com ${creatorName || 'nossa comunidade'}. 🙏`;
  
  const avatarUrl = (profile as any)?.avatar_url;
  const imageUrl = avatarUrl || "https://images.unsplash.com/photo-1544427928-142ce021f90a?q=80&w=1000&auto=format&fit=crop";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 800, height: 800, alt: "Capa da Sala de Guerra" }],
      url: `https://newfeconecta.vercel.app/room/${roomId}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RoomPage({ params }: Props) {
  return <WarRoomPageClient roomId={params.id} />;
}
