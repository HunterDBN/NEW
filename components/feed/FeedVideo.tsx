import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { getFallbackBlurhash } from '@/utils/mediaUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoState = 'thumbnail' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error';

interface FeedVideoProps {
  uri:          string;
  isVisible:    boolean;
  index?:       number;
  /** Pre-generated thumbnail URI (shown before video loads) */
  thumbnailUri?:  string | null;
  blurhash?:      string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FeedVideo — optimised full-screen video for the vertical feed.
 *
 * Progressive loading stages:
 *  1. Blurhash / thumbnail — shown immediately, zero buffer cost
 *  2. Video component mounts only when the item becomes visible — avoids
 *     pre-loading N videos simultaneously as the list renders
 *  3. `shouldPlay` is driven by `isVisible` + tap state — off-screen videos
 *     are paused without unmounting (preserving buffer)
 *
 * Performance notes:
 *  - The <Video> is not mounted until first visibility — avoids wasting
 *    decoder slots on off-screen items during fast scrolling.
 *  - Once mounted it stays mounted (unmounting a video mid-buffer wastes work).
 *  - Thumbnail is shown as an overlay until `isPlaying` — smoother than a
 *    black flash before the first frame renders.
 */
const FeedVideo = memo(({ uri, isVisible, index = 0, thumbnailUri, blurhash }: FeedVideoProps) => {
  const videoRef   = useRef<Video>(null);
  const mountedRef = useRef(true);
  const pendingRef = useRef<Promise<void> | null>(null);

  const [videoState, setVideoState] = useState<VideoState>('thumbnail');
  const [muted,      setMuted]      = useState(false);
  const [tapPaused,  setTapPaused]  = useState(false);
  // Delay mounting the Video component until first visibility
  const [videoMounted, setVideoMounted] = useState(false);

  const placeholder = thumbnailUri ?? blurhash ?? getFallbackBlurhash(index);
  const showThumbnail = videoState === 'thumbnail' || videoState === 'loading';

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      videoRef.current?.pauseAsync().catch(() => {});
    };
  }, []);

  // ── Mount video on first visibility, then control play/pause ──────────────
  useEffect(() => {
    if (isVisible && !videoMounted) {
      setVideoMounted(true);
    }

    if (!videoMounted) return;

    const apply = async () => {
      if (pendingRef.current) {
        try { await pendingRef.current; } catch {}
      }
      if (!mountedRef.current) return;

      const ref = videoRef.current;
      if (!ref) return;

      if (isVisible && !tapPaused) {
        setVideoState(s => s === 'thumbnail' ? 'loading' : s);
        pendingRef.current = ref.playAsync().catch(() => {});
      } else {
        pendingRef.current = ref.pauseAsync().catch(() => {});
      }

      await pendingRef.current;
      pendingRef.current = null;
    };

    apply();
  }, [isVisible, tapPaused, videoMounted]);

  // ── Playback status ────────────────────────────────────────────────────────
  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (!mountedRef.current) return;
    if (!status.isLoaded) {
      if (status.error) setVideoState('error');
      return;
    }
    if (status.isBuffering)   setVideoState('buffering');
    else if (status.isPlaying) setVideoState('playing');
    else                       setVideoState('paused');
  }, []);

  // ── Interactions ───────────────────────────────────────────────────────────
  const handleTap  = useCallback(() => setTapPaused(p => !p), []);
  const handleMute = useCallback(() => setMuted(p => !p), []);

  const showBuffering = videoState === 'loading' || videoState === 'buffering';
  const showPauseIcon = tapPaused && !showThumbnail;

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      onPress={handleTap}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={tapPaused ? 'Resume video' : 'Pause video'}
    >
      {/* Thumbnail / blurhash — always rendered; fades out when video plays */}
      {showThumbnail && (
        <Image
          source={typeof placeholder === 'string' && placeholder.startsWith('data:')
            ? { uri: placeholder }
            : placeholder
          }
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          transition={{ duration: 200, effect: 'cross-dissolve' }}
          cachePolicy="memory-disk"
          priority="high"
        />
      )}

      {/* Video — only mounted after first visibility */}
      {videoMounted && (
        <Video
          ref={videoRef}
          source={{ uri }}
          style={[StyleSheet.absoluteFill, showThumbnail && styles.hidden]}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={false}   // controlled entirely by useEffect
          isMuted={muted}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          progressUpdateIntervalMillis={500}
        />
      )}

      {/* Buffering spinner */}
      {showBuffering && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="rgba(255,255,255,0.85)" size="large" />
        </View>
      )}

      {/* Tap-to-pause icon */}
      {showPauseIcon && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.pauseCircle}>
            <Text style={styles.pauseIcon}>⏸</Text>
          </View>
        </View>
      )}

      {/* Mute button */}
      <TouchableOpacity
        style={styles.muteBtn}
        onPress={handleMute}
        hitSlop={12}
        activeOpacity={0.75}
        accessibilityLabel={muted ? 'Unmute' : 'Mute'}
      >
        <Text style={styles.muteIcon}>{muted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>

      {/* Error state */}
      {videoState === 'error' && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.errorText}>⚠ Unable to play video</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default FeedVideo;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hidden:  { opacity: 0 }, // keeps Video mounted but invisible until ready
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pauseCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  pauseIcon:  { fontSize: 26 },
  muteBtn: {
    position:        'absolute',
    top:             52,
    left:            14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width:  36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  muteIcon:  { fontSize: 16 },
  errorText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
});
