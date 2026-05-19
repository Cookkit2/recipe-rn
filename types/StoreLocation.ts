export interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  totalPriceCents: number;
  distance: number;
}

export interface MapLayerProps {
  stores: StoreLocation[];
  userLocation: { latitude: number; longitude: number };
  onMarkerPress: (storeId: string) => void;
}
