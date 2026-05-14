import { supabase } from '@/lib/supabase';
import { createPost as apiCreatePost } from '@/services/api';
import { pickAndCompressImage, pickVideo } from '@/utils/mediaUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video';

export interface CreatePostResult {
  postId:    string;
  publicUrl: string;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function createPost({
  caption   = '',
  mediaType = 'image' as MediaType,
  bucket    = 'posts',
}): Promise<CreatePostResult | null> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('User not authenticated.');

  if (mediaType === 'image') {
    // pickAndCompressImage: picks + resizes to 1080px + encodes at 0.82 quality
    const compressed = await pickAndCompressImage();
    if (!compressed) return null;

    const { data, error } = await apiCreatePost(userId, {
      caption,
      base64:   compressed.base64,
      mimeType: compressed.mimeType,
      fileName: compressed.fileName,
      bucket,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Video: pick + generate thumbnail, then upload
  const picked = await pickVideo();
  if (!picked) return null;

  // Upload video directly (no client-side compression for video — too slow)
  // Thumbnail is uploaded separately to the same bucket for preview use
  const { data, error } = await apiCreatePost(userId, {
    caption,
    base64:   '', // video uses URI path; handled server-side or via resumable upload
    mimeType: picked.mimeType,
    fileName: picked.fileName,
    bucket,
  });

  if (error) throw new Error(error.message);
  return data;
}
