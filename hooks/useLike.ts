import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toggleLike } from '@/services/api';

interface UseLikeOptions {
  postId:       string;
  initialLiked: boolean;
  initialCount: number;
}

interface UseLikeReturn {
  liked:    boolean;
  count:    number;
  toggling: boolean;
  toggle:   () => Promise<void>;
}

export function useLike({ postId, initialLiked, initialCount }: UseLikeOptions): UseLikeReturn {
  const [liked,    setLiked]    = useState(initialLiked);
  const [count,    setCount]    = useState(initialCount);
  const [toggling, setToggling] = useState(false);

  const likedRef = useRef(liked);
  const countRef = useRef(count);
  likedRef.current = liked;
  countRef.current = count;

  const toggle = useCallback(async () => {
    if (toggling) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wasLiked  = likedRef.current;
    const prevCount = countRef.current;

    // Optimistic update
    setLiked(!wasLiked);
    setCount(wasLiked ? prevCount - 1 : prevCount + 1);
    setToggling(true);

    const { error } = await toggleLike(postId, user.id, wasLiked);

    if (error) {
      setLiked(wasLiked);
      setCount(prevCount);
    }
    setToggling(false);
  }, [postId, toggling]);

  return { liked, count, toggling, toggle };
}

// Standalone fetch helper (kept for screens that need it outside useLike)
export { fetchLikeState } from '@/services/api';
