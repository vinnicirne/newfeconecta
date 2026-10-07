export function getPostMediaInfo(post: any) {
  const mediaUrl = post.media_url === "null" || !post.media_url ? null : post.media_url;
  const postType = post.post_type === "null" ? "text" : post.post_type;

  const isVideoBucket = mediaUrl?.includes('/posts/videos/');
  const isAudioBucket = mediaUrl?.includes('/posts/audio/');
  
  const isAudio = postType === "audio" || post.media_type === "audio" || !!mediaUrl?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i) || isAudioBucket;
  const isVideo = !isAudio && (postType === "video" || post.media_type === "video" || !!mediaUrl?.match(/\.(mp4|webm|mov|mkv)/i) || isVideoBucket) && postType !== "external_media" && !mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i);
  
  const isShortText = post.content && post.content.length < 90 && !post.content.includes("\n") && !mediaUrl;
  const urlMatch = post.content?.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
  const hasExternal = !!urlMatch;
  const isMediaPost = !!(mediaUrl || isVideo || isAudio || hasExternal);
  const isVerseRepost = post.type === "repost_verse" || !!post.content?.startsWith("📖 Recomendo a Palavra");
  const isDevotional = !!post.content?.startsWith("📖 Devocional");
  const isDFCH = !!(post.is_testimony) || isVerseRepost;
  
  return { 
    mediaUrl,
    postType,
    isAudio: !!isAudio, 
    isVideo: !!isVideo, 
    isShortText: !!isShortText, 
    isMediaPost: !!isMediaPost, 
    isVerseRepost: !!isVerseRepost, 
    isDFCH: !!isDFCH, 
    isDevotional: !!isDevotional 
  };
}

export function isLegacyMediaCheck(mediaUrl: string | null, postType: string) {
  if (!mediaUrl || postType === "external_media") return false;
  if (mediaUrl.includes("supabase.co/storage") || mediaUrl.includes("supabase.in/storage")) return false;
  const fileName = mediaUrl.split("/").pop() || "";
  return !fileName.includes(".");
}
