import { haversineDistance } from "../distance-calculation";

describe("haversineDistance", () => {
  it("should return 0 when the two points are the same", () => {
    const lat = 40.7128;
    const lon = -74.006;
    const distance = haversineDistance(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  it("should calculate correct distance between New York and London", () => {
    // New York: 40.7128° N, 74.0060° W
    const nyLat = 40.7128;
    const nyLon = -74.006;

    // London: 51.5074° N, 0.1278° W
    const lonLat = 51.5074;
    const lonLon = -0.1278;

    const distance = haversineDistance(nyLat, nyLon, lonLat, lonLon);

    // Distance is approx 5570 km. Allowing a small margin of error for different Earth radius assumptions
    expect(distance).toBeGreaterThan(5500);
    expect(distance).toBeLessThan(5650);
  });

  it("should calculate correct distance between San Francisco and Los Angeles", () => {
    // SF: 37.7749° N, 122.4194° W
    const sfLat = 37.7749;
    const sfLon = -122.4194;

    // LA: 34.0522° N, 118.2437° W
    const laLat = 34.0522;
    const laLon = -118.2437;

    const distance = haversineDistance(sfLat, sfLon, laLat, laLon);

    // Distance is approx 559 km.
    expect(distance).toBeGreaterThan(550);
    expect(distance).toBeLessThan(570);
  });

  it("should return correct distance for opposite sides of the earth (antipodal points)", () => {
    // Equator, prime meridian
    const lat1 = 0;
    const lon1 = 0;

    // Equator, opposite side
    const lat2 = 0;
    const lon2 = 180;

    const distance = haversineDistance(lat1, lon1, lat2, lon2);

    // Half circumference of Earth (pi * R)
    // 3.14159 * 6371 = 20015 km approx
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20050);
  });

  it("should correctly handle negative coordinates", () => {
    // Sydney: 33.8688° S, 151.2093° E
    const sydLat = -33.8688;
    const sydLon = 151.2093;

    // Buenos Aires: 34.6037° S, 58.3816° W
    const baLat = -34.6037;
    const baLon = -58.3816;

    const distance = haversineDistance(sydLat, sydLon, baLat, baLon);

    // Distance is approx 11800 km
    expect(distance).toBeGreaterThan(11700);
    expect(distance).toBeLessThan(11900);
  });

  it("is symmetric", () => {
    const lat1 = 40.7128;
    const lon1 = -74.006;
    const lat2 = 51.5074;
    const lon2 = -0.1278;

    const d1 = haversineDistance(lat1, lon1, lat2, lon2);
    const d2 = haversineDistance(lat2, lon2, lat1, lon1);

    expect(d1).toBe(d2);
  });
});
