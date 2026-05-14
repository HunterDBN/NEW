import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchIsFollowing, followUser, unfollowUser } from '@/services/api';

interface UseFollowOptions {
  targetUserId: string;
}

interface UseFollowReturn {
  isFollowing:  boolean;
  toggling:     boolean;
  loading:      boolean;
  toggle:       () => Promise<void>;
  isOwnProfile: boolean;
}

export function useFollow({ targetUserId }: UseFollowOptions): UseFollowReturn {
  const [isFollowing,  setIsFollowing]  = useState(false);
  const [toggling,     setToggling]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const currentUserIdRef = useRef<string | null>(null);
  const isFollowingRef   = useRef(isFollowing);
  isFollowingRef.current = isFollowing;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      const myId = user?.id ?? null;
      currentUserIdRef.current = myId;

      if (!myId || myId === targetUserId) {
        setIsOwnProfile(myId === targetUserId);
        setLoading(false);
        return;
      }

      const { data } = await fetchIsFollowing(myId, targetUserId);
      if (!cancelled) {
        setIsFollowing(!!data);
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [targetUserId]);

  const toggle = useCallback(async () => {
    const myId = currentUserIdRef.current;
    if (!myId || toggling) return;

    const wasFollowing = isFollowingRef.current;
    setIsFollowing(!wasFollowing);
    setToggling(true);

    const { error } = wasFollowing
      ? await unfollowUser(myId, targetUserId)
      : await followUser(myId, targetUserId);

    if (error) setIsFollowing(wasFollowing); // rollback
    setToggling(false);
  }, [targetUserId, toggling]);

  return { isFollowing, toggling, loading, toggle, isOwnProfile };
}
