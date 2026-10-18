/**
 * Safe Image URL Resolver
 * Handles:
 * 1. Fully-qualified URLs (http://, https://, data:)
 * 2. Raw Unsplash Photo IDs (e.g., photo-1536511135899-7c87c2bf2ff5)
 * 3. Relative uploaded media (/uploads/..., uploads/...)
 * 4. Missing/null/invalid values with a reliable fallback
 */

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';

export function resolveImageUrl(img) {
  if (!img || typeof img !== 'string') {
    return FALLBACK_IMAGE;
  }

  const trimmed = img.trim();
  if (!trimmed) {
    return FALLBACK_IMAGE;
  }

  // Already a full HTTP or Data URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Raw Unsplash Photo ID (stored without domain)
  if (trimmed.startsWith('photo-')) {
    return `https://images.unsplash.com/${trimmed}?w=600&auto=format&fit=crop&q=80`;
  }

  // Uploaded media on API server
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  // Default fallback if unknown format
  return FALLBACK_IMAGE;
}

export function handleImageError(e, fallback = FALLBACK_IMAGE) {
  if (e?.currentTarget && e.currentTarget.src !== fallback) {
    e.currentTarget.src = fallback;
  }
}
