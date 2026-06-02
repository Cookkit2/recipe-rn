import { haversineDistance } from "../distance-calculation";

describe("haversineDistance", () => {
  it("should return 0 when the two points are exactly the same", () => {
    const lat = 40.7128;
    const lon = -74.006;

    expect(haversineDistance(lat, lon, lat, lon)).toBe(0);
  });

  it("should calculate correct approximate distance between New York and London", () => {
    // New York
    const lat1 = 40.7128;
    const lon1 = -74.006;
    // London
    const lat2 = 51.5074;
    const lon2 = -0.1278;

    const distance = haversineDistance(lat1, lon1, lat2, lon2);

    // Distance should be around 5570 km
    expect(distance).toBeGreaterThan(5500);
    expect(distance).toBeLessThan(5650);
  });

  it("should calculate correct approximate distance between London and Paris", () => {
    // London
    const lat1 = 51.5074;
    const lon1 = -0.1278;
    // Paris
    const lat2 = 48.8566;
    const lon2 = 2.3522;

    const distance = haversineDistance(lat1, lon1, lat2, lon2);

    // Distance should be around 343 km
    expect(distance).toBeGreaterThan(330);
    expect(distance).toBeLessThan(360);
  });

  it("should be symmetrical (A to B equals B to A)", () => {
    const lat1 = 40.7128;
    const lon1 = -74.006;
    const lat2 = 51.5074;
    const lon2 = -0.1278;

    const distanceAB = haversineDistance(lat1, lon1, lat2, lon2);
    const distanceBA = haversineDistance(lat2, lon2, lat1, lon1);

    expect(distanceAB).toEqual(distanceBA);
  });

  it("should correctly handle points across the equator", () => {
    // Quito, Ecuador (near equator)
    const lat1 = -0.1807;
    const lon1 = -78.4678;
    // Bogota, Colombia (North of equator)
    const lat2 = 4.711;
    const lon2 = -74.0721;

    const distance = haversineDistance(lat1, lon1, lat2, lon2);

    // Should be > 0 and calculate successfully without NaN
    expect(distance).toBeGreaterThan(0);
    expect(Number.isNaN(distance)).toBe(false);
  });

  it("should correctly handle points across the prime meridian", () => {
    // London (West of Prime Meridian)
    const lat1 = 51.5074;
    const lon1 = -0.1278;
    // Paris (East of Prime Meridian)
    const lat2 = 48.8566;
    const lon2 = 2.3522;

    const distance = haversineDistance(lat1, lon1, lat2, lon2);

    expect(distance).toBeGreaterThan(0);
    expect(Number.isNaN(distance)).toBe(false);
  });
});
