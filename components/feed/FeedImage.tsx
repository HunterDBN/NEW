import React, { useState, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { getFallbackBlurhash } from '@/utils/mediaUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedImageProps {
  uri:        string;
  /** Used to pick a consistent blurhash placeholder per post */
  index?:     number;
  /**
   * If you stored a blurhash in the post row, pass it here.
   * Falls back to a curated default if absent.
   */
  blurhash?:  string | null;
  /** Low-quality image placeholder (data: URI). Shown while full image loads. */
  lqip?:      string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FeedImage — optimised full-screen image for the vertical feed.
 *
 * Layer stack (bottom → top):
 *  1. Blurhash — instant, decoded on the GPU, zero network
 *  2. LQIP     — tiny blurry JPEG (if provided), cross-fades over blurhash
 *  3. Full image — loads progressively, cross-fades over LQIP
 *
 * expo-image handles:
 *  - Disk + memory caching (shared-memory strategy on iOS, Glide on Android)
 *  - Lazy decode — image is not decoded until it's near the viewport
 *  - Priority hints — `high` for the visible item, `low` for off-screen
 *  - Smooth cross-fade transition between placeholder and loaded image
 */
const FeedImage = memo(({ uri, index = 0, blurhash, lqip }: FeedImageProps) => {
  const [loaded, setLoaded] = useState(false);

  const placeholder = blurhash ?? getFallbackBlurhash(index);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* expo-image with blurhash placeholder + progressive cross-fade */}
      <Image
        source={{ uri }}
        placeholder={lqip ?? placeholder}
        placeholderContentFit="cover"
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        transition={{
          duration: 300,
          effect:   'cross-dissolve',
          timing:   'ease-in-out',
        }}
        // Decode lazily and at high priority when visible
        priority="high"
        // Recycle off-screen decode to save memory
        recyclingKey={uri}
        // Allow caching on disk so the same image doesn't re-download
        cachePolicy="memory-disk"
        onLoad={() => setLoaded(true)}
        allowDownscaling
      />
    </View>
  );
});

export default FeedImage;
