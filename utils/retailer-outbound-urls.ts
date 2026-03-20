/**
 * Build outbound URLs for Malaysia grocery shortcuts (Google Maps, Grab).
 */

export function buildGoogleMapsSearchNearUrl(
  searchQuery: string,
  latitude: number,
  longitude: number,
  zoom = 14
): string {
  const q = encodeURIComponent(searchQuery.trim());
  return `https://www.google.com/maps/search/${q}/@${latitude},${longitude},${zoom}z`;
}

/** Opens Google Maps searching for 99 Speedmart near the user coordinates. */
export function build99SpeedmartMapsUrl(latitude: number, longitude: number): string {
  return buildGoogleMapsSearchNearUrl("99 Speedmart", latitude, longitude);
}
