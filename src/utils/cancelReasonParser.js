/**
 * Centralized, robust parser for cancellation reasons and embedded metadata
 * Handles:
 * - [AUDIT_RECORD]{...}
 * - [RETURNED_ITEMS][...]
 * - [PROOF_PHOTOS]["..."]
 * - [PROOF_PHOTO]data:image/... or URL
 * - [REFUND_ID:rfnd_...]
 * Tolerant of any preceding whitespace, newlines, or lack of space.
 */

export function parseCancelDetails(reasonStr) {
  if (!reasonStr) {
    return {
      reason: 'Cancelled by resident',
      photo: null,
      photos: [],
      auditRecord: null,
      returnedItems: [],
      isAudited: false,
      refundId: null
    };
  }

  const raw = String(reasonStr);
  let auditRecord = null;
  let returnedItems = [];
  let photos = [];
  let photo = null;
  let refundId = null;

  // 1. Extract Quality Audit record [AUDIT_RECORD]
  const auditMatch = raw.match(/\[AUDIT_RECORD\]\s*(\{[\s\S]*?\})(?=\s*\[|$)/i);
  if (auditMatch && auditMatch[1]) {
    try {
      auditRecord = JSON.parse(auditMatch[1]);
    } catch {
      auditRecord = null;
    }
  }

  // 2. Extract Doorstep returned items [RETURNED_ITEMS]
  const retMatch = raw.match(/\[RETURNED_ITEMS\]\s*(\[[\s\S]*?\])(?=\s*\[|$)/i);
  if (retMatch && retMatch[1]) {
    try {
      const parsed = JSON.parse(retMatch[1]);
      if (Array.isArray(parsed)) returnedItems = parsed;
    } catch {
      returnedItems = [];
    }
  }

  // 3. Extract Multi-photo proof [PROOF_PHOTOS]
  const photosMatch = raw.match(/\[PROOF_PHOTOS\]\s*(\[[\s\S]*?\])(?=\s*\[|$)/i);
  if (photosMatch && photosMatch[1]) {
    try {
      const parsed = JSON.parse(photosMatch[1]);
      if (Array.isArray(parsed)) photos = parsed.filter(Boolean);
    } catch {
      photos = [];
    }
  }

  // 4. Extract Single-photo proof [PROOF_PHOTO]
  const photoMatch = raw.match(/\[PROOF_PHOTO\]\s*([^\s\[]+)(?=\s*\[|$)/i);
  if (photoMatch && photoMatch[1]) {
    photo = photoMatch[1].trim();
    if (photos.length === 0) photos = [photo];
  }
  if (!photo && photos.length > 0) {
    photo = photos[0];
  }

  // 5. Extract Refund ID [REFUND_ID:...]
  const refundMatch = raw.match(/\[REFUND_ID:([^\]]+)\]/i);
  if (refundMatch && refundMatch[1]) {
    refundId = refundMatch[1].trim();
  }

  // 6. Clean human-readable reason
  // Strip away everything from the first recognized metadata tag
  let cleanReason = raw
    .split(/\s*\[(AUDIT_RECORD|RETURNED_ITEMS|PROOF_PHOTOS|PROOF_PHOTO|REFUND_ID)/i)[0]
    .trim();

  // Safeguard: remove any leftover bracketed tags or base64 fragments
  cleanReason = cleanReason
    .replace(/\[(AUDIT_RECORD|RETURNED_ITEMS|PROOF_PHOTOS|PROOF_PHOTO|REFUND_ID)[^\]]*\]/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();

  return {
    reason: cleanReason || 'Cancelled by resident',
    photo,
    photos: Array.isArray(photos) ? photos : (photo ? [photo] : []),
    auditRecord,
    isAudited: Boolean(auditRecord),
    returnedItems: Array.isArray(returnedItems) ? returnedItems : [],
    refundId
  };
}
