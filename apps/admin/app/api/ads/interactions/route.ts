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

    let likesCount = 0;
    let isLiked = false;
    let comments: any[] = [];
    let commentsCount = 0;

    // 1. Tenta buscar nas tabelas dedicadas se existirem
    try {
      const { count: lc, error: lcErr } = await db
        .from("ad_likes")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId);

      if (!lcErr) {
        likesCount = lc ?? 0;
        if (currentUserId) {
          const { data: userLike } = await db
            .from("ad_likes")
            .select("id")
            .eq("campaign_id", campaignId)
            .eq("user_id", currentUserId)
            .maybeSingle();
          isLiked = !!userLike;
        }

        const { data: rawComments, count: cc } = await db
          .from("ad_comments")
          .select("id, content, parent_id, user_id, created_at", { count: "exact" })
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: true });

        commentsCount = cc ?? (rawComments?.length ?? 0);

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

        comments = (rawComments || []).map((c) => ({
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
          likes_count: likesCount,
          comments: comments,
          comments_count: commentsCount,
        });
      }
    } catch {
      // Fallback para system_configs
    }

    // 2. Fallback resiliente: system_configs (ad_interactions_CAMPAIGN_ID)
    const configKey = `ad_interactions_${campaignId}`;
    const { data: configRow } = await db
      .from("system_configs")
      .select("value")
      .eq("key", configKey)
      .maybeSingle();

    const stored = configRow?.value || { likes: [], comments: [] };
    const likesList: string[] = Array.isArray(stored.likes) ? stored.likes : [];
    const commentsList: any[] = Array.isArray(stored.comments) ? stored.comments : [];

    likesCount = likesList.length;
    isLiked = Boolean(currentUserId && likesList.includes(currentUserId));
    commentsCount = commentsList.length;

    return NextResponse.json({
      liked: isLiked,
      likes_count: likesCount,
      comments: commentsList,
      comments_count: commentsCount,
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
      let nowLiked = false;
      let likesCount = 0;

      // Tenta tabela ad_likes
      try {
        const { data: existing, error: findErr } = await db
          .from("ad_likes")
          .select("id")
          .eq("campaign_id", campaign_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!findErr) {
          if (existing) {
            await db.from("ad_likes").delete().eq("id", existing.id);
            nowLiked = false;
          } else {
            await db.from("ad_likes").insert({
              campaign_id,
              user_id: user.id,
            });
            nowLiked = true;
          }

          const { count: lc } = await db
            .from("ad_likes")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", campaign_id);

          return NextResponse.json({
            liked: nowLiked,
            likes_count: lc ?? 0,
          });
        }
      } catch {
        // Fallback
      }

      // Fallback: system_configs
      const configKey = `ad_interactions_${campaign_id}`;
      const { data: configRow } = await db
        .from("system_configs")
        .select("value")
        .eq("key", configKey)
        .maybeSingle();

      const stored = configRow?.value || { likes: [], comments: [] };
      let likesList: string[] = Array.isArray(stored.likes) ? stored.likes : [];

      if (likesList.includes(user.id)) {
        likesList = likesList.filter((id) => id !== user.id);
        nowLiked = false;
      } else {
        likesList.push(user.id);
        nowLiked = true;
      }

      const updated = {
        ...stored,
        likes: likesList,
      };

      await db.from("system_configs").upsert(
        {
          key: configKey,
          value: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      return NextResponse.json({
        liked: nowLiked,
        likes_count: likesList.length,
      });
    }

    // ─── AÇÃO: ADICIONAR COMENTÁRIO ─────────────────────────────────────────
    if (action === "add_comment") {
      if (!content || !content.trim()) {
        return NextResponse.json({ error: "O conteúdo do comentário é obrigatório" }, { status: 400 });
      }

      // Busca perfil do autor para hidratação
      const { data: profile } = await db
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .eq("id", user.id)
        .single();

      const authorData = profile || {
        id: user.id,
        full_name: user.user_metadata?.full_name || "Você",
        avatar_url: user.user_metadata?.avatar_url || null,
        username: user.user_metadata?.username || "usuario",
      };

      // Tenta tabela ad_comments
      try {
        const { data: newComment, error: insErr } = await db
          .from("ad_comments")
          .insert({
            campaign_id,
            user_id: user.id,
            content: content.trim(),
            parent_id: parent_id || null,
          })
          .select("id, content, parent_id, user_id, created_at")
          .single();

        if (!insErr && newComment) {
          const hydrated = {
            id: newComment.id,
            content: newComment.content,
            parent_id: newComment.parent_id,
            profile_id: newComment.user_id,
            created_at: newComment.created_at,
            author: authorData,
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
      } catch {
        // Fallback
      }

      // Fallback: system_configs
      const configKey = `ad_interactions_${campaign_id}`;
      const { data: configRow } = await db
        .from("system_configs")
        .select("value")
        .eq("key", configKey)
        .maybeSingle();

      const stored = configRow?.value || { likes: [], comments: [] };
      const commentsList: any[] = Array.isArray(stored.comments) ? stored.comments : [];

      const newComment = {
        id: `ad-c-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        content: content.trim(),
        parent_id: parent_id || null,
        profile_id: user.id,
        created_at: new Date().toISOString(),
        author: authorData,
      };

      commentsList.push(newComment);

      const updated = {
        ...stored,
        comments: commentsList,
      };

      await db.from("system_configs").upsert(
        {
          key: configKey,
          value: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      return NextResponse.json({
        comment: newComment,
        comments_count: commentsList.length,
      });
    }

    // ─── AÇÃO: DELETAR COMENTÁRIO ───────────────────────────────────────────
    if (action === "delete_comment") {
      if (!comment_id) {
        return NextResponse.json({ error: "comment_id é obrigatório" }, { status: 400 });
      }

      try {
        const { error: delErr } = await db
          .from("ad_comments")
          .delete()
          .eq("id", comment_id)
          .eq("user_id", user.id);

        if (!delErr) {
          const { count: commentsCount } = await db
            .from("ad_comments")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", campaign_id);

          return NextResponse.json({
            success: true,
            comments_count: commentsCount ?? 0,
          });
        }
      } catch {
        // Fallback
      }

      // Fallback: system_configs
      const configKey = `ad_interactions_${campaign_id}`;
      const { data: configRow } = await db
        .from("system_configs")
        .select("value")
        .eq("key", configKey)
        .maybeSingle();

      const stored = configRow?.value || { likes: [], comments: [] };
      let commentsList: any[] = Array.isArray(stored.comments) ? stored.comments : [];

      commentsList = commentsList.filter((c) => c.id !== comment_id);

      const updated = {
        ...stored,
        comments: commentsList,
      };

      await db.from("system_configs").upsert(
        {
          key: configKey,
          value: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      return NextResponse.json({
        success: true,
        comments_count: commentsList.length,
      });
    }

    return NextResponse.json({ error: "Ação não suportada" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/ads/interactions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
