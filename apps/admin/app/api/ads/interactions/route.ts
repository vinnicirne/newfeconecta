import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

/**
 * GET /api/ads/interactions?campaign_id=...
 * Retorna contagem de curtidas, status de curtida do usuário e lista de comentários hidratados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id é obrigatório" }, { status: 400 });
    }

    const db = getAdminClient();
    let currentUserId: string | null = null;
    try {
      const user = await requireAuth(request);
      currentUserId = user.id;
    } catch {
      // Usuário não autenticado
    }

    // 1. Contagem de Likes e status do usuário atual
    const { count: likesCount } = await db
      .from("ad_likes")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    let isLiked = false;
    if (currentUserId) {
      const { data: userLike } = await db
        .from("ad_likes")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      isLiked = !!userLike;
    }

    // 2. Comentários
    const { data: rawComments, count: commentsCount } = await db
      .from("ad_comments")
      .select("id, content, parent_id, user_id, created_at", { count: "exact" })
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    const userIds = Array.from(new Set((rawComments || []).map((c) => c.user_id).filter(Boolean)));
    let profilesMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", userIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
    }

    const comments = (rawComments || []).map((c) => ({
      id: c.id,
      content: c.content,
      parent_id: c.parent_id,
      profile_id: c.user_id,
      created_at: c.created_at,
      author: profilesMap[c.user_id] || {
        full_name: "Usuário FéConecta",
        avatar_url: null,
        username: "usuario",
      },
    }));

    return NextResponse.json({
      liked: isLiked,
      likes_count: likesCount ?? 0,
      comments: comments,
      comments_count: commentsCount ?? 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[GET /api/ads/interactions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/ads/interactions
 * Permite curtir/descurtir e comentar anúncios persistindo no banco de dados.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const { action, campaign_id, content, parent_id, comment_id } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id é obrigatório" }, { status: 400 });
    }

    const db = getAdminClient();

    // ─── AÇÃO: CURTIR / DESCURTIR (TOGGLE LIKE) ─────────────────────────────
    if (action === "toggle_like") {
      const { data: existing } = await db
        .from("ad_likes")
        .select("id")
        .eq("campaign_id", campaign_id)
        .eq("user_id", user.id)
        .maybeSingle();

      let nowLiked = false;
      if (existing) {
        // Descurtir
        await db.from("ad_likes").delete().eq("id", existing.id);
        nowLiked = false;
      } else {
        // Curtir
        await db.from("ad_likes").insert({
          campaign_id,
          user_id: user.id,
        });
        nowLiked = true;
      }

      const { count: likesCount } = await db
        .from("ad_likes")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id);

      return NextResponse.json({
        liked: nowLiked,
        likes_count: likesCount ?? 0,
      });
    }

    // ─── AÇÃO: ADICIONAR COMENTÁRIO ─────────────────────────────────────────
    if (action === "add_comment") {
      if (!content || !content.trim()) {
        return NextResponse.json({ error: "O conteúdo do comentário é obrigatório" }, { status: 400 });
      }

      const { data: newComment, error } = await db
        .from("ad_comments")
        .insert({
          campaign_id,
          user_id: user.id,
          content: content.trim(),
          parent_id: parent_id || null,
        })
        .select("id, content, parent_id, user_id, created_at")
        .single();

      if (error || !newComment) {
        throw new Error(error?.message || "Erro ao salvar comentário");
      }

      const { data: profile } = await db
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .eq("id", user.id)
        .single();

      const hydrated = {
        id: newComment.id,
        content: newComment.content,
        parent_id: newComment.parent_id,
        profile_id: newComment.user_id,
        created_at: newComment.created_at,
        author: profile || {
          full_name: user.user_metadata?.full_name || "Você",
          avatar_url: user.user_metadata?.avatar_url || null,
          username: user.user_metadata?.username || "usuario",
        },
      };

      const { count: commentsCount } = await db
        .from("ad_comments")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id);

      return NextResponse.json({
        comment: hydrated,
        comments_count: commentsCount ?? 1,
      });
    }

    // ─── AÇÃO: DELETAR COMENTÁRIO ───────────────────────────────────────────
    if (action === "delete_comment") {
      if (!comment_id) {
        return NextResponse.json({ error: "comment_id é obrigatório" }, { status: 400 });
      }

      await db
        .from("ad_comments")
        .delete()
        .eq("id", comment_id)
        .eq("user_id", user.id);

      const { count: commentsCount } = await db
        .from("ad_comments")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id);

      return NextResponse.json({
        success: true,
        comments_count: commentsCount ?? 0,
      });
    }

    return NextResponse.json({ error: "Ação não suportada" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/ads/interactions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
