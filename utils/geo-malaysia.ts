/**
 * Approximate axis-aligned bounding box for Malaysia (peninsular + Borneo states).
 * Used only as a coarse gate for shop features; not a legal border.
 */
export const MALAYSIA_BBOX = {
  minLat: 0.75,
  maxLat: 7.75,
  minLng: 99.5,
  maxLng: 119.5,
} as const;

/** Rough Singapore island box so Johor (north of ~1.45°N) stays eligible. */
const SINGAPORE_EXCLUSION = {
  minLat: 1.12,
  maxLat: 1.48,
  minLng: 103.55,
  maxLng: 104.2,
} as const;

function isLikelySingapore(latitude: number, longitude: number): boolean {
  return (
    latitude >= SINGAPORE_EXCLUSION.minLat &&
    latitude <= SINGAPORE_EXCLUSION.maxLat &&
    longitude >= SINGAPORE_EXCLUSION.minLng &&
    longitude <= SINGAPORE_EXCLUSION.maxLng
  );
}

export function isLatLngInMalaysia(latitude: number, longitude: number): boolean {
  const inBbox =
    latitude >= MALAYSIA_BBOX.minLat &&
    latitude <= MALAYSIA_BBOX.maxLat &&
    longitude >= MALAYSIA_BBOX.minLng &&
    longitude <= MALAYSIA_BBOX.maxLng;
  if (!inBbox) {
    return false;
  }
  if (isLikelySingapore(latitude, longitude)) {
    return false;
  }
  return true;
}
