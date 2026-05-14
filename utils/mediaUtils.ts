import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompressedImage {
  uri:      string;
  base64:   string;
  mimeType: string;
  fileName: string;
  width:    number;
  height:   number;
  /** Approximate file size in bytes */
  sizeBytes: number;
}

export interface VideoPickResult {
  uri:      string;
  mimeType: string;
  fileName: string;
  /** Base64-encoded JPEG thumbnail extracted from the first frame */
  thumbnailBase64: string | null;
  thumbnailUri:    string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum long-edge for feed images — matches common CDN breakpoints */
const MAX_DIMENSION   = 1080;
/** JPEG quality for feed uploads (0-1). 0.82 is a good quality/size balance */
const UPLOAD_QUALITY  = 0.82;
/** Thumbnail max-edge for video preview images */
const THUMB_DIMENSION = 540;
/** Low-quality placeholder quality — blurry intentionally */
const LQIP_QUALITY    = 0.05;
const LQIP_DIMENSION  = 20;

// ─── Image compression ────────────────────────────────────────────────────────

/**
 * Compress and resize an image before upload.
 * - Downsizes to MAX_DIMENSION on the long edge (preserving aspect ratio)
 * - Re-encodes as JPEG at UPLOAD_QUALITY
 * - Returns base64 so it can be passed directly to the storage service
 */
export async function compressImage(uri: string): Promise<CompressedImage> {
  // Step 1: Get original dimensions to calculate resize
  const original = await ImageManipulator.manipulateAsync(uri, [], {
    base64: false,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const { width: origW, height: origH } = original;
  const longEdge = Math.max(origW, origH);

  // Only resize if the image exceeds the max dimension
  const actions: ImageManipulator.Action[] = [];
  if (longEdge > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longEdge;
    actions.push({
      resize: {
        width:  Math.round(origW * scale),
        height: Math.round(origH * scale),
      },
    });
  }

  // Step 2: Compress
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: UPLOAD_QUALITY,
    format:   ImageManipulator.SaveFormat.JPEG,
    base64:   true,
  });

  if (!result.base64) throw new Error('Image compression failed: no base64 output.');

  // Estimate size: base64 length × 0.75 ≈ byte count
  const sizeBytes = Math.round(result.base64.length * 0.75);

  return {
    uri:       result.uri,
    base64:    result.base64,
    mimeType:  'image/jpeg',
    fileName:  `image_${Date.now()}.jpg`,
    width:     result.width,
    height:    result.height,
    sizeBytes,
  };
}

/**
 * Generate a low-quality image placeholder (LQIP) — a tiny blurry version
 * of the image that loads instantly and acts as a placeholder while the
 * full image downloads. Returns a base64 data URI.
 */
export async function generateLQIP(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: LQIP_DIMENSION } }],
    { compress: LQIP_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return `data:image/jpeg;base64,${result.base64}`;
}

// ─── Thumbnail generation ─────────────────────────────────────────────────────

/**
 * Generate a JPEG thumbnail from a video URI.
 *
 * Expo AV can extract a first-frame thumbnail via VideoThumbnails — we use
 * ImageManipulator to compress it to THUMB_DIMENSION.
 *
 * Returns null if thumbnail extraction fails (e.g. codec not supported).
 */
export async function generateVideoThumbnail(videoUri: string): Promise<{
  uri:    string;
  base64: string;
} | null> {
  try {
    // expo-video-thumbnails is the correct package for this; since it may
    // not be installed, we dynamically require it to avoid hard crashes.
    // If unavailable, we fall back to a static placeholder.
    const VideoThumbnails = await import('expo-video-thumbnails').catch(() => null);
    if (!VideoThumbnails) return null;

    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 0, // first frame
    });

    const result = await ImageManipulator.manipulateAsync(
      thumbUri,
      [{ resize: { width: THUMB_DIMENSION } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    return { uri: result.uri, base64: result.base64 ?? '' };
  } catch {
    return null;
  }
}

// ─── Picker + compress pipeline ───────────────────────────────────────────────

/**
 * Pick an image from the library and immediately compress it.
 * Returns null if the user cancels.
 */
export async function pickAndCompressImage(): Promise<CompressedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Media library permission not granted.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:    ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality:       1, // always pick at full quality; we compress ourselves
  });

  if (result.canceled || !result.assets?.length) return null;

  return compressImage(result.assets[0].uri);
}

/**
 * Pick a video from the library and generate a thumbnail for preview.
 * Returns null if the user cancels.
 */
export async function pickVideo(): Promise<VideoPickResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Media library permission not granted.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    quality:    1,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset     = result.assets[0];
  const extension = asset.mimeType?.split('/')[1] ?? 'mp4';
  const fileName  = asset.fileName ?? `video_${Date.now()}.${extension}`;

  const thumb = await generateVideoThumbnail(asset.uri);

  return {
    uri:             asset.uri,
    mimeType:        asset.mimeType ?? `video/${extension}`,
    fileName,
    thumbnailBase64: thumb?.base64 ?? null,
    thumbnailUri:    thumb?.uri    ?? null,
  };
}

// ─── Blurhash helpers ─────────────────────────────────────────────────────────

/**
 * expo-image supports blurhash natively as a placeholder prop.
 * These are a handful of tasteful defaults for when a real hash isn't stored.
 * Rotate through them by post index so the feed doesn't look uniform.
 */
const FALLBACK_BLURHASHES = [
  'L6PZfSi_.AyE_3t7t7R**0o#DgR4',   // warm grey
  'LGF5?xYk^6#M@-5c,1Ex@@or[j6o',   // cool blue
  'L8A0:+of4.WB~qj[j[fQ0Kj[Rjj[',   // soft green
  'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',   // rose/pink
  'L9A,bSt700j[j[fQ0Kj[Rjj[?bj[',   // neutral lavender
];

export function getFallbackBlurhash(index: number): string {
  return FALLBACK_BLURHASHES[index % FALLBACK_BLURHASHES.length];
}
